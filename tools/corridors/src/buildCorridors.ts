#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// buildCorridors.ts
//
// Main preprocessing pipeline that:
//   1. Reads suggestion_pairs.json to know which directional pairs to process.
//   2. Reads track files from data/tracks/{ORIGIN}-{DEST}/ directories.
//   3. Filters, resamples, and aggregates tracks into median polylines.
//   4. Writes corridor dataset JSON files to data/corridors/.
//
// Usage:  npm run build-corridors    (from tools/corridors/)
//    or:  npx tsx src/buildCorridors.ts
//
// Options (via environment variables):
//   K_POINTS=200          Number of resampled points per polyline (default 200)
//   MIN_FLIGHTS=5         Minimum flights required to produce a dataset (default 5)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SuggestionPair, FlightTrack, CorridorDataset } from "./types.js";
import { filterTracks, toLonLat } from "./lib/filter.js";
import { resampleTrack } from "./lib/resample.js";
import { computeMedianPolyline } from "./lib/aggregate.js";
import { haversineDistance } from "./lib/spherical.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
const SUGGESTIONS_PATH = join(PROJECT_ROOT, "data", "suggestion_pairs.json");
const TRACKS_DIR = join(PROJECT_ROOT, "data", "tracks");
const CORRIDORS_DIR = join(PROJECT_ROOT, "data", "corridors");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const K_POINTS = parseInt(process.env.K_POINTS || "200", 10);
const MIN_FLIGHTS = parseInt(process.env.MIN_FLIGHTS || "5", 10);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load all track files from a directory. Supports .json (array of FlightTrack)
 * and .jsonl (one FlightTrack per line).
 */
function loadTracksFromDir(dirPath: string): FlightTrack[] {
  if (!existsSync(dirPath)) return [];

  const files = readdirSync(dirPath).filter(
    (f: string) => f.endsWith(".json") || f.endsWith(".jsonl")
  );

  const tracks: FlightTrack[] = [];

  for (const file of files) {
    const raw = readFileSync(join(dirPath, file), "utf-8");

    if (file.endsWith(".jsonl")) {
      // One JSON object per line
      const lines = raw.split("\n").filter((l: string) => l.trim().length > 0);
      for (const line of lines) {
        try {
          tracks.push(JSON.parse(line) as FlightTrack);
        } catch {
          console.warn(`  ⚠ Skipping malformed line in ${file}`);
        }
      }
    } else {
      // Standard JSON — expect an array or single object
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          tracks.push(...(parsed as FlightTrack[]));
        } else {
          tracks.push(parsed as FlightTrack);
        }
      } catch {
        console.warn(`  ⚠ Skipping malformed file ${file}`);
      }
    }
  }

  return tracks;
}

/**
 * Extract date range from track metadata.
 */
function getDateRange(tracks: FlightTrack[]): { dateFrom?: string; dateTo?: string } {
  const dates = tracks
    .map((t) => t.date)
    .filter((d): d is string => !!d)
    .sort();

  if (dates.length === 0) return {};
  return { dateFrom: dates[0], dateTo: dates[dates.length - 1] };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function build(): void {
  console.log("buildCorridors: starting");
  console.log(`  K_POINTS=${K_POINTS}, MIN_FLIGHTS=${MIN_FLIGHTS}`);

  if (!existsSync(SUGGESTIONS_PATH)) {
    console.error("  ✗ suggestion_pairs.json not found");
    process.exit(1);
  }

  const pairs: SuggestionPair[] = JSON.parse(
    readFileSync(SUGGESTIONS_PATH, "utf-8")
  );

  if (!existsSync(TRACKS_DIR)) {
    console.log(`  ✗ No tracks directory found at ${TRACKS_DIR}`);
    console.log("    Create data/tracks/{ORIGIN}-{DEST}/ directories with track files.");
    process.exit(0);
  }

  // Ensure output directory exists
  if (!existsSync(CORRIDORS_DIR)) {
    mkdirSync(CORRIDORS_DIR, { recursive: true });
    console.log(`  Created ${CORRIDORS_DIR}`);
  }

  let datasetsBuilt = 0;

  for (const pair of pairs) {
    const directions = [
      {
        label: `${pair.airportACode}→${pair.airportBCode}`,
        origin: pair.airportACode,
        dest: pair.airportBCode,
        originLon: pair.airportALon,
        originLat: pair.airportALat,
        destLon: pair.airportBLon,
        destLat: pair.airportBLat,
      },
      {
        label: `${pair.airportBCode}→${pair.airportACode}`,
        origin: pair.airportBCode,
        dest: pair.airportACode,
        originLon: pair.airportBLon,
        originLat: pair.airportBLat,
        destLon: pair.airportALon,
        destLat: pair.airportALat,
      },
    ];

    for (const dir of directions) {
      const dirKey = `${dir.origin}-${dir.dest}`;
      const trackDir = join(TRACKS_DIR, dirKey);

      if (!existsSync(trackDir)) continue;

      console.log(`\n  Processing ${dir.label}...`);

      // Load raw tracks
      const rawTracks = loadTracksFromDir(trackDir);
      console.log(`    Loaded ${rawTracks.length} raw track(s)`);

      if (rawTracks.length === 0) continue;

      // Expected distance in metres
      const expectedDistM =
        haversineDistance(
          [dir.originLon, dir.originLat],
          [dir.destLon, dir.destLat]
        );

      // Filter
      const { passed, rejected } = filterTracks(
        rawTracks,
        dir.origin,
        dir.dest,
        expectedDistM
      );

      console.log(`    Passed filter: ${passed.length}, rejected: ${rejected.length}`);
      for (const r of rejected.slice(0, 5)) {
        console.log(`      ✗ ${r.track.flightId || "?"}: ${r.reason}`);
      }
      if (rejected.length > 5) {
        console.log(`      ... and ${rejected.length - 5} more`);
      }

      if (passed.length < MIN_FLIGHTS) {
        console.log(
          `    ⚠ Only ${passed.length} flights passed (need ${MIN_FLIGHTS}). Skipping.`
        );
        continue;
      }

      // Resample each track to K points
      const resampled: [number, number][][] = [];
      for (const track of passed) {
        const lonlats: [number, number][] = track.points.map(toLonLat);
        try {
          resampled.push(resampleTrack(lonlats, K_POINTS));
        } catch (err) {
          console.warn(
            `    ⚠ Resample failed for ${track.flightId || "?"}: ${(err as Error).message}`
          );
        }
      }

      if (resampled.length < MIN_FLIGHTS) {
        console.log(
          `    ⚠ Only ${resampled.length} tracks after resampling (need ${MIN_FLIGHTS}). Skipping.`
        );
        continue;
      }

      // Compute median polyline
      const median = computeMedianPolyline(resampled);

      // Round coordinates to 4 decimal places (~11m precision)
      const roundPt = (p: [number, number]): [number, number] => [
        Math.round(p[0] * 10000) / 10000,
        Math.round(p[1] * 10000) / 10000,
      ];

      const dateRange = getDateRange(passed);
      const datasetId = `${dirKey}-v1`;

      const dataset: CorridorDataset = {
        id: datasetId,
        origin: dir.origin,
        dest: dir.dest,
        kind: "median",
        nFlights: resampled.length,
        ...(dateRange.dateFrom && { dateFrom: dateRange.dateFrom }),
        ...(dateRange.dateTo && { dateTo: dateRange.dateTo }),
        kPoints: K_POINTS,
        median: median.map(roundPt),
      };

      const outPath = join(CORRIDORS_DIR, `${datasetId}.json`);
      writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n", "utf-8");
      console.log(`    ✓ Wrote ${outPath} (${resampled.length} flights, ${K_POINTS} points)`);
      datasetsBuilt++;
    }
  }

  console.log(`\nbuildCorridors: done. ${datasetsBuilt} dataset(s) built.`);

  if (datasetsBuilt > 0) {
    console.log("\nRun 'npm run migrate' to link datasets to suggestion_pairs.json.");
  }
}

build();
