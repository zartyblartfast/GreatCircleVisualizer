#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// fetchTracks.ts  —  Restartable OpenSky track downloader
//
// Fetches flight track data from the OpenSky Network REST API for suggestion
// pairs with direct scheduled flights.  Designed to be run repeatedly across
// days — it skips directions that already have enough tracks on disk.
//
// Usage:  npm run fetch-tracks                         (all remaining pairs)
//    or:  PAIR=LAX-DXB npm run fetch-tracks            (single pair only)
//
// Environment variables:
//   PAIR              Only process this pair id (e.g. "LAX-DXB"). Default: all.
//   DAYS_BACK         Days of history to query (default 1, max 7).
//   MIN_TRACKS        Skip a direction if it already has ≥ this many tracks (default 3).
//   RATE_DELAY_MS     Delay between API calls in ms (default 5000).
//   OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET  (or credentials.json)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SuggestionPair, FlightTrack, TrackPoint } from "./types.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
const SUGGESTIONS_PATH = join(PROJECT_ROOT, "data", "suggestion_pairs.json");
const TRACKS_DIR = join(PROJECT_ROOT, "data", "tracks");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PAIR_FILTER = process.env.PAIR || "";
const DAYS_BACK = parseInt(process.env.DAYS_BACK || "1", 10);
const MIN_TRACKS = parseInt(process.env.MIN_TRACKS || "3", 10);
const RATE_DELAY_MS = parseInt(process.env.RATE_DELAY_MS || "25000", 10);
const BASE_URL = "https://opensky-network.org/api";
const CREDENTIALS_PATH = join(__dirname, "..", "credentials.json");

// Credit tracking
let creditsRemaining: number | null = null;
let creditsChecked = false;

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------
function loadCredentials(): { clientId: string; clientSecret: string } {
  if (existsSync(CREDENTIALS_PATH)) {
    try {
      const raw = readFileSync(CREDENTIALS_PATH, "utf-8");
      const creds = JSON.parse(raw) as { clientId?: string; clientSecret?: string };
      if (creds.clientId && creds.clientSecret) {
        return { clientId: creds.clientId, clientSecret: creds.clientSecret };
      }
    } catch {
      console.warn("  ⚠ Could not parse credentials.json");
    }
  }
  return {
    clientId: process.env.OPENSKY_CLIENT_ID || "",
    clientSecret: process.env.OPENSKY_CLIENT_SECRET || "",
  };
}

const { clientId: OPENSKY_CLIENT_ID, clientSecret: OPENSKY_CLIENT_SECRET } = loadCredentials();

// Token state
let bearerToken = "";
let tokenExpiresAt = 0;

// ---------------------------------------------------------------------------
// IATA → ICAO mapping
// ---------------------------------------------------------------------------
const IATA_TO_ICAO: Record<string, string> = {
  JFK: "KJFK", SIN: "WSSS", PER: "YPPH", LHR: "EGLL", LAX: "KLAX",
  DXB: "OMDB", JNB: "FAOR", ATL: "KATL", SYD: "YSSY", SCL: "SCEL",
};

// ---------------------------------------------------------------------------
// OpenSky response types
// ---------------------------------------------------------------------------
interface OpenSkyFlight {
  icao24: string;
  firstSeen: number;
  estDepartureAirport: string | null;
  lastSeen: number;
  estArrivalAirport: string | null;
  callsign: string | null;
}

interface OpenSkyTrack {
  icao24: string;
  startTime: number;
  endTime: number;
  callsign: string | null;
  path: [number, number, number, number | null, number | null, boolean][];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureToken(): Promise<void> {
  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) return;
  if (bearerToken && Date.now() < tokenExpiresAt - 120_000) return;

  console.log("    ↻ Acquiring OAuth2 token...");
  const TOKEN_URL =
    "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: OPENSKY_CLIENT_ID,
    client_secret: OPENSKY_CLIENT_SECRET,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`    ✗ Token failed: HTTP ${res.status} — ${errText}`);
    process.exit(1);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  bearerToken = data.access_token;
  const expiresInMs = (data.expires_in || 1800) * 1000;
  tokenExpiresAt = Date.now() + expiresInMs;
  console.log(`    ✓ Token acquired (expires in ${Math.round(expiresInMs / 60000)} min)`);
}

/**
 * Log credit info from response headers.
 */
function logCredits(res: Response, label: string): void {
  const remaining = res.headers.get("x-rate-limit-remaining");
  if (remaining !== null) {
    creditsRemaining = parseInt(remaining, 10);
    if (!creditsChecked) {
      console.log(`    💳 Credits remaining: ${creditsRemaining}`);
      creditsChecked = true;
    } else {
      console.log(`      💳 ${creditsRemaining} credits left`);
    }
  }
}

/**
 * Core fetch with auth, credit monitoring, 429 handling, and abort on exhaustion.
 */
async function fetchJSON<T>(url: string): Promise<T | null> {
  await ensureToken();
  const headers: Record<string, string> = bearerToken
    ? { Authorization: `Bearer ${bearerToken}` }
    : {};

  try {
    const res = await fetch(url, { headers });
    logCredits(res, url);

    if (res.status === 404) return null;

    if (res.status === 401 || res.status === 403) {
      console.warn(`    ⚠ HTTP ${res.status}, refreshing token...`);
      tokenExpiresAt = 0;
      await ensureToken();
      const retry = await fetch(url, {
        headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {},
      });
      logCredits(retry, url);
      if (!retry.ok) {
        console.warn(`    ⚠ Retry failed: HTTP ${retry.status}`);
        return null;
      }
      return (await retry.json()) as T;
    }

    if (res.status === 429) {
      const retryAfter = res.headers.get("x-rate-limit-retry-after-seconds");
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;

      if (waitSec > 600) {
        // Credits exhausted for the day — abort gracefully
        console.error(`\n  ✗ Credits exhausted. Retry after ${waitSec}s (${Math.round(waitSec / 3600)}h).`);
        console.error("    Run again tomorrow. Progress is saved.");
        process.exit(0);
      }

      console.warn(`    ⚠ Rate limited. Waiting ${waitSec}s...`);
      await sleep(waitSec * 1000);
      const retry = await fetch(url, { headers });
      logCredits(retry, url);
      if (!retry.ok) {
        console.warn(`    ⚠ Retry after wait still failed: HTTP ${retry.status}`);
        return null;
      }
      return (await retry.json()) as T;
    }

    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`    ⚠ HTTP ${res.status}: ${errBody.substring(0, 150)}`);
      return null;
    }

    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      console.warn(`    ⚠ Non-JSON: ${text.substring(0, 100)}`);
      return null;
    }
  } catch (err) {
    console.warn(`    ⚠ Fetch error: ${(err as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// API wrappers
// ---------------------------------------------------------------------------

async function getArrivals(icao: string, begin: number, end: number): Promise<OpenSkyFlight[]> {
  const url = `${BASE_URL}/flights/arrival?airport=${icao}&begin=${begin}&end=${end}`;
  return (await fetchJSON<OpenSkyFlight[]>(url)) || [];
}

async function getTrack(icao24: string, time: number): Promise<OpenSkyTrack | null> {
  return fetchJSON<OpenSkyTrack>(`${BASE_URL}/tracks/all?icao24=${icao24}&time=${time}`);
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

function toFlightTrack(
  track: OpenSkyTrack,
  flight: OpenSkyFlight,
  originIata: string,
  destIata: string
): FlightTrack | null {
  if (!track.path || track.path.length < 2) return null;

  const points: TrackPoint[] = track.path
    .filter((wp) => !wp[5])
    .map((wp) => {
      const [time, lat, lon, alt] = wp;
      return alt != null
        ? ([lon, lat, alt, time] as TrackPoint)
        : ([lon, lat] as TrackPoint);
    });

  if (points.length < 2) return null;

  const date = new Date(flight.firstSeen * 1000).toISOString().slice(0, 10);
  return {
    originIata,
    destIata,
    directionId: `${originIata}-${destIata}`,
    points,
    flightId: track.icao24,
    callsign: (flight.callsign || track.callsign || "").trim() || undefined,
    date,
  };
}

// ---------------------------------------------------------------------------
// Resumability: count existing tracks for a direction
// ---------------------------------------------------------------------------

function countExistingTracks(dirKey: string): number {
  const dir = join(TRACKS_DIR, dirKey);
  if (!existsSync(dir)) return 0;

  let count = 0;
  const files = readdirSync(dir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const parsed = JSON.parse(raw);
      count += Array.isArray(parsed) ? parsed.length : 1;
    } catch { /* skip */ }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("fetchTracks: starting");
  console.log(`  Config: DAYS_BACK=${DAYS_BACK}, MIN_TRACKS=${MIN_TRACKS}, RATE_DELAY_MS=${RATE_DELAY_MS}`);
  console.log(`  Filter: ${PAIR_FILTER || "(all pairs)"}`);
  console.log(`  Auth: ${OPENSKY_CLIENT_ID ? "OAuth2" : "anonymous (will fail)"}`);

  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) {
    console.error("  ✗ No credentials. Place credentials.json in tools/corridors/");
    process.exit(1);
  }

  const pairs: SuggestionPair[] = JSON.parse(
    readFileSync(SUGGESTIONS_PATH, "utf-8")
  );

  let directPairs = pairs.filter(p => p.verification?.directScheduled === "yes");
  if (PAIR_FILTER) {
    directPairs = directPairs.filter(p => p.id === PAIR_FILTER);
    if (directPairs.length === 0) {
      console.error(`  ✗ No pair matching "${PAIR_FILTER}" with directScheduled=yes`);
      process.exit(1);
    }
  }

  console.log(`  Pairs to process: ${directPairs.map(p => p.id).join(", ")}`);

  if (!existsSync(TRACKS_DIR)) mkdirSync(TRACKS_DIR, { recursive: true });

  const now = Math.floor(Date.now() / 1000);
  const begin = now - DAYS_BACK * 86400;
  console.log(`  Window: ${new Date(begin * 1000).toISOString().slice(0, 10)} → ${new Date(now * 1000).toISOString().slice(0, 10)}`);

  let totalNew = 0;
  let totalSkipped = 0;

  for (const pair of directPairs) {
    const directions = [
      { originIata: pair.airportACode, destIata: pair.airportBCode },
      { originIata: pair.airportBCode, destIata: pair.airportACode },
    ];

    for (const dir of directions) {
      const dirKey = `${dir.originIata}-${dir.destIata}`;
      const originIcao = IATA_TO_ICAO[dir.originIata];
      const destIcao = IATA_TO_ICAO[dir.destIata];

      if (!originIcao || !destIcao) {
        console.warn(`  ⚠ No ICAO mapping for ${dirKey}, skipping`);
        continue;
      }

      // Check existing tracks — skip if enough
      const existing = countExistingTracks(dirKey);
      if (existing >= MIN_TRACKS) {
        console.log(`\n  ✓ ${dirKey}: ${existing} tracks on disk (≥${MIN_TRACKS}), skipping`);
        totalSkipped++;
        continue;
      }
      console.log(`\n  ${dirKey} (${originIcao} → ${destIcao}): ${existing} tracks on disk, need ≥${MIN_TRACKS}`);

      // Query arrivals at destination only (saves credits vs dual strategy)
      const flightMap = new Map<string, OpenSkyFlight>();
      let chunkStart = begin;

      while (chunkStart < now) {
        const chunkEnd = Math.min(chunkStart + 86400, now);
        const dateLabel = new Date(chunkStart * 1000).toISOString().slice(0, 10);

        console.log(`    [${dateLabel}] Arrivals at ${destIcao}...`);
        const arrivals = await getArrivals(destIcao, chunkStart, chunkEnd);
        const matched = arrivals.filter(f => f.estDepartureAirport === originIcao);
        for (const f of matched) {
          flightMap.set(`${f.icao24}-${f.firstSeen}`, f);
        }
        console.log(`    [${dateLabel}] ${matched.length} matched (of ${arrivals.length} total arrivals)`);
        await sleep(RATE_DELAY_MS);

        chunkStart = chunkEnd;
      }

      const flights = [...flightMap.values()];
      console.log(`    Unique flights: ${flights.length}`);
      if (flights.length === 0) continue;

      // Fetch tracks
      const outDir = join(TRACKS_DIR, dirKey);
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

      const tracks: FlightTrack[] = [];
      for (const flight of flights) {
        const cs = (flight.callsign || "").trim();
        console.log(`    Track ${flight.icao24} (${cs})...`);
        await sleep(RATE_DELAY_MS);

        const track = await getTrack(flight.icao24, flight.firstSeen);
        if (!track) { console.log(`      ✗ unavailable`); continue; }

        const ft = toFlightTrack(track, flight, dir.originIata, dir.destIata);
        if (!ft) { console.log(`      ✗ too short`); continue; }

        tracks.push(ft);
        console.log(`      ✓ ${ft.points.length} pts, ${ft.date}`);
      }

      if (tracks.length > 0) {
        // Append to existing file or create new
        const outPath = join(outDir, `${dirKey}-tracks.json`);
        let allTracks = tracks;
        if (existsSync(outPath)) {
          try {
            const prev = JSON.parse(readFileSync(outPath, "utf-8")) as FlightTrack[];
            // Deduplicate by flightId + date
            const seen = new Set(prev.map(t => `${t.flightId}-${t.date}`));
            const newOnly = tracks.filter(t => !seen.has(`${t.flightId}-${t.date}`));
            allTracks = [...prev, ...newOnly];
            console.log(`    Merged: ${prev.length} existing + ${newOnly.length} new = ${allTracks.length}`);
          } catch { /* overwrite if parse fails */ }
        }
        writeFileSync(outPath, JSON.stringify(allTracks, null, 2) + "\n", "utf-8");
        console.log(`    ✓ Saved ${allTracks.length} track(s) → ${outPath}`);
        totalNew += tracks.length;
      } else {
        console.log(`    ⚠ No usable tracks for ${dirKey}`);
      }
    }
  }

  console.log(`\n─── Summary ───`);
  console.log(`  New tracks fetched: ${totalNew}`);
  console.log(`  Directions skipped (already complete): ${totalSkipped}`);
  if (creditsRemaining !== null) {
    console.log(`  Credits remaining: ${creditsRemaining}`);
  }
  console.log(`  Run again tomorrow to accumulate more tracks.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
