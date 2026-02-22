#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// migrateSuggestions.ts
//
// Idempotent migration script that:
//   1. Adds default `verification` and `corridor` fields to any suggestion
//      entry that is missing them.
//   2. Scans data/corridors/ for dataset files and links them to the
//      corresponding suggestion entries (sets corridor.available = true
//      and populates corridor.datasets.AtoB / BtoA).
//   3. Writes back only if changes were detected.
//
// Usage:  npm run migrate          (from tools/corridors/)
//    or:  npx tsx src/migrateSuggestions.ts
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SuggestionPair, CorridorDataset, CorridorDatasetRef } from "./types.js";

// ---------------------------------------------------------------------------
// Paths (relative to project root, two levels up from tools/corridors/src/)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
const SUGGESTIONS_PATH = join(PROJECT_ROOT, "data", "suggestion_pairs.json");
const CORRIDORS_DIR = join(PROJECT_ROOT, "data", "corridors");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deep-compare two values (simple JSON-safe comparison). */
function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Scan the corridors directory and return a map of
 * directionId (e.g. "LHR-JFK") → parsed CorridorDataset.
 */
function loadCorridorDatasets(): Map<string, CorridorDataset> {
  const map = new Map<string, CorridorDataset>();

  if (!existsSync(CORRIDORS_DIR)) {
    return map;
  }

  const files = readdirSync(CORRIDORS_DIR).filter((f: string) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = readFileSync(join(CORRIDORS_DIR, file), "utf-8");
      const ds: CorridorDataset = JSON.parse(raw);

      // Basic validation
      if (ds.origin && ds.dest && ds.median && ds.id) {
        const dirKey = `${ds.origin}-${ds.dest}`;
        map.set(dirKey, ds);
      } else {
        console.warn(`  ⚠ Skipping ${file}: missing required fields`);
      }
    } catch (err) {
      console.warn(`  ⚠ Skipping ${file}: ${(err as Error).message}`);
    }
  }

  return map;
}

/**
 * Build a CorridorDatasetRef from a CorridorDataset.
 */
function makeRef(ds: CorridorDataset): CorridorDatasetRef {
  const ref: CorridorDatasetRef = {
    datasetId: ds.id,
    kind: ds.kind,
    nFlights: ds.nFlights,
    kPoints: ds.kPoints,
  };
  if (ds.dateFrom) ref.dateFrom = ds.dateFrom;
  if (ds.dateTo) ref.dateTo = ds.dateTo;
  if (ds.flights && ds.flights.length > 0) ref.flights = ds.flights;
  return ref;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function migrate(): void {
  console.log("migrateSuggestions: reading", SUGGESTIONS_PATH);

  if (!existsSync(SUGGESTIONS_PATH)) {
    console.error("  ✗ suggestion_pairs.json not found at", SUGGESTIONS_PATH);
    process.exit(1);
  }

  const raw = readFileSync(SUGGESTIONS_PATH, "utf-8");
  const pairs: SuggestionPair[] = JSON.parse(raw);

  console.log(`  Found ${pairs.length} suggestion entries`);

  // Load any existing corridor dataset files
  const datasets = loadCorridorDatasets();
  console.log(`  Found ${datasets.size} corridor dataset file(s)`);

  let changeCount = 0;

  for (const pair of pairs) {
    // --- 1. Ensure verification defaults ---
    if (!pair.verification) {
      pair.verification = { directScheduled: "unknown" };
      changeCount++;
    }

    // --- 2. Ensure corridor defaults ---
    if (!pair.corridor) {
      pair.corridor = { available: false };
      changeCount++;
    }

    // --- 3. Link corridor datasets if they exist ---
    const atobKey = `${pair.airportACode}-${pair.airportBCode}`;
    const btoaKey = `${pair.airportBCode}-${pair.airportACode}`;

    const atobDs = datasets.get(atobKey);
    const btoaDs = datasets.get(btoaKey);

    if (atobDs || btoaDs) {
      const newDatasets: NonNullable<typeof pair.corridor.datasets> = {};

      if (atobDs) {
        newDatasets.AtoB = makeRef(atobDs);
      }
      if (btoaDs) {
        newDatasets.BtoA = makeRef(btoaDs);
      }

      // Only update if the datasets reference actually changed
      if (!jsonEqual(pair.corridor.datasets, newDatasets)) {
        pair.corridor.datasets = newDatasets;
        changeCount++;
      }

      if (!pair.corridor.available) {
        pair.corridor.available = true;
        changeCount++;
      }
    }
  }

  // --- Write back only if something changed ---
  if (changeCount > 0) {
    const output = JSON.stringify(pairs, null, 2) + "\n";
    writeFileSync(SUGGESTIONS_PATH, output, "utf-8");
    console.log(`  ✓ Applied ${changeCount} change(s), file updated.`);
  } else {
    console.log("  ✓ No changes needed — already up to date.");
  }
}

migrate();
