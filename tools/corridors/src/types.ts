// ---------------------------------------------------------------------------
// Shared type definitions for the flight-corridor preprocessing pipeline
// and the extended suggestion_pairs.json schema.
// ---------------------------------------------------------------------------

// === Suggestion Pairs (extended schema) ====================================

/**
 * Reference to a pre-computed corridor dataset file for one direction.
 */
export interface CorridorDatasetRef {
  /** Unique dataset identifier, e.g. "LHR-JFK-v1" */
  datasetId: string;

  /** What the dataset contains */
  kind: "median" | "band" | "median+band";

  /** Data source name, e.g. "OpenSky" */
  source?: string;

  /** Number of flights used to compute the dataset */
  nFlights: number;

  /** Earliest flight date in the dataset (YYYY-MM-DD) */
  dateFrom?: string;

  /** Latest flight date in the dataset (YYYY-MM-DD) */
  dateTo?: string;

  /** Number of resampled points per polyline */
  kPoints: number;
}

/**
 * Corridor metadata attached to a suggestion entry.
 */
export interface CorridorInfo {
  /** Whether any corridor dataset is available for this pair */
  available: boolean;

  /**
   * Per-direction dataset references.
   * "AtoB" = airportACode → airportBCode as stored in the suggestion entry.
   * "BtoA" = airportBCode → airportACode.
   */
  datasets?: {
    AtoB?: CorridorDatasetRef;
    BtoA?: CorridorDatasetRef;
  };
}

/**
 * Verification metadata for whether a direct scheduled service exists.
 */
export interface Verification {
  /** Whether a direct scheduled flight exists between the two airports */
  directScheduled: "yes" | "no" | "unknown";

  /** Optional links for manual verification */
  verifyLinks?: {
    /** e.g. FlightConnections URL */
    schedule?: string;
  };

  /** Free-text notes */
  notes?: string;
}

/**
 * A suggestion pair entry — the full schema including new optional fields.
 * All new fields are optional so existing entries without them still load.
 */
export interface SuggestionPair {
  id: string;

  airportAName: string;
  airportACode: string;
  airportACountry: string;
  airportACountryFull: string;
  airportALat: number;
  airportALon: number;

  airportBName: string;
  airportBCode: string;
  airportBCountry: string;
  airportBCountryFull: string;
  airportBLat: number;
  airportBLon: number;

  GreatCircleDistKm: number;
  RhumbLineDistKm: number;
  RhumbLineDisplay: boolean;

  geoOG_rotationX: number | null;
  geoOG_rotationY: number | null;

  // --- New optional fields (Phase 1) ---
  verification?: Verification;
  corridor?: CorridorInfo;
}

// === Corridor Dataset File (output of preprocessing) =======================

/**
 * A single corridor dataset file stored in data/corridors/{ORIGIN}-{DEST}-v1.json.
 * Contains the median polyline and optionally percentile band boundaries.
 */
export interface CorridorDataset {
  /** Dataset identifier matching CorridorDatasetRef.datasetId */
  id: string;

  /** IATA code of origin airport */
  origin: string;

  /** IATA code of destination airport */
  dest: string;

  /** What this dataset contains */
  kind: "median" | "band" | "median+band";

  /** Number of flights used */
  nFlights: number;

  /** Earliest flight date (YYYY-MM-DD) */
  dateFrom?: string;

  /** Latest flight date (YYYY-MM-DD) */
  dateTo?: string;

  /** Number of resampled points per polyline */
  kPoints: number;

  /** Median polyline: array of [lon, lat] pairs */
  median: [number, number][];

  /** 10th-percentile boundary (optional, for band rendering) */
  p10?: [number, number][];

  /** 90th-percentile boundary (optional, for band rendering) */
  p90?: [number, number][];
}

// === Track File Input (canonical format) ===================================

/**
 * A single point in a flight track.
 * Minimum: [lon, lat]. Optional: [lon, lat, altitude_m, unix_timestamp].
 */
export type TrackPoint = [number, number] | [number, number, number, number];

/**
 * A single flight record in the canonical track file format.
 */
export interface FlightTrack {
  /** IATA code of origin airport */
  originIata: string;

  /** IATA code of destination airport */
  destIata: string;

  /** Directional identifier: "{ORIGIN}-{DEST}" */
  directionId: string;

  /** Ordered array of track points */
  points: TrackPoint[];

  /** Optional metadata */
  flightId?: string;
  callsign?: string;
  date?: string;
}
