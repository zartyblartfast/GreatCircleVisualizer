# Flight Corridor Data — Acquisition & Processing

This document explains how real-world flight route data is acquired, processed, and rendered in the Great Circle Calculator application.

---

## Overview

The application overlays actual airline flight routes on the map for selected airport pairs. These routes are **median polylines** computed from multiple real ADS-B flight tracks, providing an accurate representation of the paths aircraft actually fly between two airports.

The data pipeline has three stages:

1. **Fetch** — Download raw flight tracks from the OpenSky Network API
2. **Build** — Filter, resample, and aggregate tracks into corridor datasets
3. **Migrate** — Link corridor datasets to `suggestion_pairs.json` for frontend use

All tooling lives in `tools/corridors/` and is written in TypeScript, executed via `tsx`.

---

## Data Source

**OpenSky Network** — [https://opensky-network.org](https://opensky-network.org)

OpenSky is an open, community-driven ADS-B receiver network operated by researchers at ETH Zürich and the University of Kaiserslautern. It receives real-time Automatic Dependent Surveillance–Broadcast (ADS-B) transponder signals from aircraft worldwide.

- ADS-B data is GPS-derived position data broadcast by aircraft
- The same underlying technology used by air traffic control
- Used in hundreds of peer-reviewed academic publications
- Data is freely available for non-commercial/research use

### API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/token` | OAuth2 client credentials authentication |
| `GET /api/flights/arrival?airport={ICAO}&begin={t0}&end={t1}` | Find flights arriving at a destination airport |
| `GET /api/tracks/all?icao24={hex}&time={unix}` | Fetch the full flight track for a specific aircraft |

### API Constraints

- **Authentication**: OAuth2 client credentials flow (requires registered account)
- **Rate limit**: ~4000 credits/day per account; monitored via `X-Rate-Limit-Remaining` header
- **Query window**: Maximum 2-day span per arrivals query (script uses 1-day chunks)
- **Rate delay**: 25 seconds between API calls to avoid HTTP 429 throttling

---

## Directory Structure

```
project-root/
├── data/
│   ├── suggestion_pairs.json          # Pair definitions + corridor metadata
│   ├── corridors/
│   │   ├── PER-LHR-v1.json           # Corridor dataset (median polyline)
│   │   ├── LHR-PER-v1.json
│   │   ├── LAX-DXB-v1.json
│   │   ├── DXB-LAX-v1.json
│   │   ├── JNB-ATL-v1.json
│   │   ├── ATL-JNB-v1.json
│   │   ├── SCL-SYD-v1.json
│   │   └── credentials*.json          # API credentials (gitignored)
│   └── tracks/
│       ├── PER-LHR/
│       │   └── PER-LHR-tracks.json    # Raw flight tracks
│       ├── LHR-PER/
│       │   └── LHR-PER-tracks.json
│       └── ...                        # One directory per direction
├── tools/corridors/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── fetchTracks.ts             # Stage 1: API data fetcher
│       ├── buildCorridors.ts          # Stage 2: Filter + aggregate
│       ├── migrateSuggestions.ts       # Stage 3: Link to suggestion_pairs.json
│       ├── types.ts                   # Shared TypeScript interfaces
│       └── lib/
│           ├── filter.ts              # Track quality filtering
│           ├── resample.ts            # Equal-distance resampling
│           ├── aggregate.ts           # Median polyline computation
│           ├── antimeridian.ts        # Antimeridian wrapping logic
│           └── spherical.ts           # Haversine & bearing calculations
└── js/
    ├── corridorRenderer.js            # Frontend: loads & renders corridors on map
    └── locationPairClass.js           # Frontend: tag display with plane icons
```

---

## Stage 1: Fetch Tracks (`fetchTracks.ts`)

### What It Does

Downloads raw ADS-B flight tracks from OpenSky for each suggestion pair direction.

### How to Run

```bash
cd tools/corridors

# Fetch all remaining pairs
npm run fetch-tracks

# Fetch a single pair
PAIR=LAX-DXB npm run fetch-tracks
```

### Process

1. Reads `suggestion_pairs.json` to identify airport pairs
2. For each direction (A→B, B→A):
   - Skips if enough tracks already exist on disk (`MIN_TRACKS`, default 3)
   - Queries OpenSky arrivals at the destination airport in 1-day chunks
   - Filters arrivals to those departing from the expected origin (ICAO code matching)
   - Fetches the full track for each matching flight via `/tracks/all`
   - Converts to canonical format: `{ originIata, destIata, directionId, points, flightId, callsign, date }`
   - Saves incrementally after each track download (crash-safe)
3. Monitors API credits and aborts gracefully if exhausted

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PAIR` | (all) | Only process this pair ID |
| `DAYS_BACK` | `1` | Days of history to query |
| `MIN_TRACKS` | `3` | Skip direction if ≥ this many tracks exist |
| `RATE_DELAY_MS` | `25000` | Delay between API calls (ms) |

### Credentials

API credentials are stored in `data/corridors/credentials*.json`:

```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret"
}
```

These files are gitignored. Register at [https://opensky-network.org](https://opensky-network.org) to obtain credentials. Multiple credential files can be used across days when daily credit limits are exhausted (update `CREDENTIALS_PATH` in the script).

### Output

Raw track files: `data/tracks/{ORIGIN}-{DEST}/{ORIGIN}-{DEST}-tracks.json`

Each file is a JSON array of `FlightTrack` objects:

```json
[
  {
    "originIata": "PER",
    "destIata": "LHR",
    "directionId": "PER-LHR",
    "flightId": "7c8066",
    "callsign": "QFA9",
    "date": "2026-02-13",
    "points": [[115.9670, -31.9403], [115.8801, -31.8552, 1981, 1739469142], ...]
  }
]
```

Points are `[lon, lat]` or `[lon, lat, altitude_m, unix_timestamp]`.

---

## Stage 2: Build Corridors (`buildCorridors.ts`)

### What It Does

Processes raw tracks into smoothed median polylines suitable for map rendering.

### How to Run

```bash
cd tools/corridors
npm run build-corridors
```

### Process

For each direction of each suggestion pair:

1. **Load** raw tracks from `data/tracks/{DIR}/`
2. **Filter** tracks for quality:
   - Minimum number of points (`MIN_POINTS`, default 20)
   - Minimum coverage fraction of expected great circle distance (`MIN_COVERAGE_FRAC`, default 0.15)
   - Maximum single-segment gap as fraction of expected distance (`MAX_GAP_FRAC`, default 0.95)
3. **Anchor** — extend incomplete tracks to expected origin/destination airports. This compensates for ADS-B coverage gaps at the start/end of flights (e.g., over oceans with no ground receivers)
4. **Resample** each track to exactly `K_POINTS` (default 200) equally-spaced points along the track using spherical interpolation
5. **Aggregate** — compute the coordinate-wise median across all resampled tracks at each of the 200 positions, producing a single median polyline
6. **Round** coordinates to 4 decimal places (~11m precision)
7. **Write** the corridor dataset JSON

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `K_POINTS` | `200` | Resampled points per polyline |
| `MIN_FLIGHTS` | `3` | Minimum tracks to produce a dataset |
| `MAX_GAP_FRAC` | `0.95` | Max single-segment gap (fraction of expected distance) |
| `MIN_COVERAGE_FRAC` | `0.15` | Min track coverage of expected distance |
| `MIN_POINTS` | `20` | Min raw track points required |

### Why Filtering Is Relaxed

Long-haul oceanic flights often have significant ADS-B coverage gaps over open ocean (no ground receivers). The relaxed defaults (`MAX_GAP_FRAC=0.95`, `MIN_COVERAGE_FRAC=0.15`) accommodate this while still rejecting obviously invalid tracks. The **anchor** step fills in the gaps by extending tracks to their expected airports before resampling.

### Output

Corridor dataset files: `data/corridors/{ORIGIN}-{DEST}-v1.json`

```json
{
  "id": "PER-LHR-v1",
  "origin": "PER",
  "dest": "LHR",
  "kind": "median",
  "nFlights": 6,
  "dateFrom": "2026-02-13",
  "dateTo": "2026-02-18",
  "kPoints": 200,
  "flights": ["QFA9"],
  "median": [[115.9670, -31.9403], [115.8312, -31.7901], ...]
}
```

---

## Stage 3: Migrate (`migrateSuggestions.ts`)

### What It Does

Links corridor datasets to `suggestion_pairs.json` so the frontend knows which pairs have flight route data.

### How to Run

```bash
cd tools/corridors
npm run migrate
```

### Process

1. Scans `data/corridors/` for dataset JSON files
2. Matches each dataset to a suggestion pair by IATA codes
3. Sets `corridor.available = true` and populates `corridor.datasets.AtoB` / `corridor.datasets.BtoA` with metadata references (dataset ID, flight count, date range, callsigns)
4. Writes back to `suggestion_pairs.json` only if changes are detected (idempotent)

### Result in `suggestion_pairs.json`

```json
{
  "id": "PER-LHR",
  "corridor": {
    "available": true,
    "datasets": {
      "AtoB": {
        "datasetId": "PER-LHR-v1",
        "kind": "median",
        "nFlights": 6,
        "kPoints": 200,
        "dateFrom": "2026-02-13",
        "dateTo": "2026-02-18",
        "flights": ["QFA9"]
      },
      "BtoA": {
        "datasetId": "LHR-PER-v1",
        "kind": "median",
        "nFlights": 5,
        "kPoints": 200,
        "dateFrom": "2026-02-13",
        "dateTo": "2026-02-18",
        "flights": ["QFA10"]
      }
    }
  }
}
```

---

## Frontend Rendering

### Corridor Lines (`corridorRenderer.js`)

When a user expands an airport pair tag that has corridor data:

1. The frontend checks `pair.corridor.available` before loading
2. Fetches `data/corridors/{ORIGIN}-{DEST}-v1.json` for each available direction
3. Renders the median polyline as a dashed line on the amCharts 5 map:
   - **Blue** (`#2563EB`) — A→B direction
   - **Green/Teal** (`#0D9488`) — B→A direction
4. Lines are removed when the tag is collapsed

### Tag Display (`locationPairClass.js`)

- **Gold ✈ icon** — pairs with corridor data. Tooltip shows direction key (blue/green)
- **Grey ✈ icon** — suggested pairs without corridor data. Tooltip explains scheduled data is not available

### Expanded Card Provenance

When a corridor-enabled tag is expanded, the card shows:

- Direction key with flight counts (e.g., "PER → LHR (6 flights)")
- Method: "median of N real ADS-B tracks"
- Flight callsigns (e.g., "QFA9, QFA10")
- Date range of the source data
- Clickable link to OpenSky Network

---

## Current Dataset Status

| Pair | A→B | B→A | Flights (A→B) | Flights (B→A) | Notes |
|---|---|---|---|---|---|
| PER ↔ LHR | ✅ | ✅ | QFA9 (6) | QFA10 (5) | Qantas Perth–London |
| LAX ↔ DXB | ✅ | ✅ | UAE216 (6) | UAE83M (7) | Emirates LA–Dubai |
| JNB ↔ ATL | ✅ | ✅ | DAL201 (4) | DAL200 (4) | Delta Johannesburg–Atlanta |
| SYD ↔ SCL | ❌ | ✅ | — | QFA28, LAN809 (4) | No SYD→SCL tracks available |
| JFK ↔ SIN | ❌ | ❌ | — | 1 track (insufficient) | Very limited OpenSky coverage |
| TTE ↔ UIO | — | — | — | — | No scheduled service |
| SVO ↔ YVR | — | — | — | — | No scheduled service |
| HBA ↔ USH | — | — | — | — | No scheduled service |

---

## Running the Full Pipeline

```bash
cd tools/corridors

# 1. Fetch raw tracks (may need to run across multiple days due to API limits)
npm run fetch-tracks

# 2. Build corridor datasets from raw tracks
npm run build-corridors

# 3. Link datasets to suggestion_pairs.json
npm run migrate
```

After step 3, hard-refresh the browser (Ctrl+Shift+R) to see updated corridor data.

---

## Tests

Unit tests for the processing library functions are in `tools/corridors/tests/`:

```bash
cd tools/corridors
npm test
```

| Test file | Covers |
|---|---|
| `spherical.test.ts` | Haversine distance, bearings, interpolation |
| `resample.test.ts` | Equal-distance track resampling |
| `filter.test.ts` | Track quality filtering |
| `antimeridian.test.ts` | Antimeridian wrapping/unwrapping |

---

## Resuming Data Acquisition

### Credential Management

Multiple OpenSky accounts were used across sessions due to the 4000 credits/day limit. Credential files are stored in `data/corridors/` and gitignored:

| File | Notes |
|---|---|
| `credentials.json` | Original account |
| `credentials2.json` | Second account |
| `credentials3.json` | Third account |
| `credentials4.json` | Fourth account |
| `credentials5.json` | Fifth account (currently set in `fetchTracks.ts`) |

To switch credentials, update the `CREDENTIALS_PATH` constant in `fetchTracks.ts`:

```typescript
const CREDENTIALS_PATH = join(PROJECT_ROOT, "data", "corridors", "credentials.json");
```

Each account's credits reset after 24 hours.

### Restartability

`fetchTracks.ts` is fully restartable:

- It checks how many tracks already exist on disk for each direction
- Skips any direction that already has ≥ `MIN_TRACKS` (default 3) saved tracks
- Saves incrementally after each successful track download — no data is lost on crash or credit exhaustion
- Merges new tracks with existing, deduplicating by flight ID + date

Simply run `npm run fetch-tracks` again after credits refresh.

### Adding a New Airport Pair

1. Add the pair entry to `data/suggestion_pairs.json` with the standard fields
2. Add the IATA→ICAO mapping to the `IATA_TO_ICAO` object in `fetchTracks.ts` (line ~78) if not already present
3. Run `npm run fetch-tracks` (may need multiple sessions for API credits)
4. Run `npm run build-corridors`
5. Run `npm run migrate`

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `HTTP 429` | Rate limited | Script auto-waits. Increase `RATE_DELAY_MS` if persistent |
| `HTTP 401` | Token expired or bad credentials | Check credentials file path and contents |
| `0 credits remaining` | Daily limit hit | Wait 24h or switch to a different credentials file |
| `Only N flights passed (need 3)` | Not enough tracks | Run again on another day to accumulate more |
| `Large gap detected` | Oceanic coverage gap | Already handled by `MAX_GAP_FRAC=0.95`. Increase further if needed |
| Corridor looks incomplete over ocean | Tracks truncated mid-ocean | The `anchorTrack` function extends tracks to endpoints before resampling |
| 404 in browser console | Frontend tried to load non-existent corridor JSON | Guarded by `corridor.available` check — should not occur |

### What Remains Incomplete

- **JFK ↔ SIN**: Only 1 SIN→JFK track found (callsign: SIA24). No JFK→SIN tracks. Singapore Airlines operates this route, but OpenSky coverage over the Pacific is extremely sparse.
- **SYD → SCL**: No tracks found for this direction. The reverse (SCL→SYD) has 4 tracks via Qantas QFA28 and LATAM LAN809.

These gaps are unlikely to be resolved without satellite-based ADS-B data (not available via OpenSky's free tier). Consider noting them as "insufficient coverage" rather than continuing to spend API credits.

---

## Known Limitations

1. **ADS-B coverage gaps** — Over open ocean (e.g., South Pacific), ground-based ADS-B receivers are sparse. Tracks may have large gaps that are filled by the anchor step, but the interpolated segments follow great-circle paths rather than the actual route flown.

2. **Near-antipodal airports** — Airport pairs close to being antipodal (e.g., LAX–DXB at ~160° separation) can have two distinct viable great-circle paths. Aircraft may fly either route depending on weather, and the two directions (A→B, B→A) may follow different paths.

3. **API credit limits** — OpenSky provides ~4000 credits/day per registered account. Fetching tracks for all pairs typically requires multiple sessions across several days, potentially with multiple credential sets.

4. **Data currency** — Corridor data reflects flights from the date range indicated in the provenance metadata. Airline routes and flight paths can change over time.
