// ---------------------------------------------------------------------------
// filter.ts — Flight track filtering / quality checks
//
// Removes bad tracks before corridor computation: too few points,
// incomplete coverage, large discontinuities, origin/dest mismatch.
// ---------------------------------------------------------------------------

import type { FlightTrack, TrackPoint } from "../types.js";
import { haversineDistance } from "./spherical.js";

/** Configuration for track filtering. */
export interface FilterConfig {
  /** Minimum number of track points required (default: 20). */
  minPoints: number;

  /**
   * Minimum fraction of the expected origin→dest distance that the
   * track's total length must cover (default: 0.7 = 70%).
   */
  minCoverageFraction: number;

  /**
   * Maximum allowed single-segment gap as a fraction of the total
   * expected distance. Larger gaps indicate diversions or data holes
   * (default: 0.15 = 15%).
   */
  maxGapFraction: number;
}

/** Default filter settings. */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  minPoints: 20,
  minCoverageFraction: 0.7,
  maxGapFraction: 0.15,
};

/** Result of filtering a single track. */
export interface FilterResult {
  /** Whether the track passed all checks. */
  pass: boolean;
  /** Human-readable reason if rejected. */
  reason?: string;
}

/**
 * Extract [lon, lat] from a TrackPoint (which may have 2 or 4 elements).
 */
export function toLonLat(p: TrackPoint): [number, number] {
  return [p[0], p[1]];
}

/**
 * Evaluate a single flight track against the filter criteria.
 *
 * @param track           The flight track to evaluate.
 * @param expectedOrigin  Expected origin IATA code.
 * @param expectedDest    Expected destination IATA code.
 * @param expectedDistM   Expected great-circle distance in metres between O and D.
 * @param config          Filter configuration (uses defaults if omitted).
 */
export function evaluateTrack(
  track: FlightTrack,
  expectedOrigin: string,
  expectedDest: string,
  expectedDistM: number,
  config: FilterConfig = DEFAULT_FILTER_CONFIG
): FilterResult {
  // --- Origin / destination mismatch ---
  if (track.originIata !== expectedOrigin || track.destIata !== expectedDest) {
    return {
      pass: false,
      reason: `Direction mismatch: expected ${expectedOrigin}-${expectedDest}, got ${track.originIata}-${track.destIata}`,
    };
  }

  // --- Too few points ---
  if (track.points.length < config.minPoints) {
    return {
      pass: false,
      reason: `Too few points: ${track.points.length} < ${config.minPoints}`,
    };
  }

  // --- Compute total track length and check for large gaps ---
  let totalLength = 0;
  let maxGap = 0;

  for (let i = 1; i < track.points.length; i++) {
    const d = haversineDistance(
      toLonLat(track.points[i - 1]),
      toLonLat(track.points[i])
    );
    totalLength += d;
    if (d > maxGap) maxGap = d;
  }

  // --- Coverage check ---
  if (expectedDistM > 0) {
    const coverage = totalLength / expectedDistM;
    if (coverage < config.minCoverageFraction) {
      return {
        pass: false,
        reason: `Incomplete coverage: ${(coverage * 100).toFixed(1)}% < ${(config.minCoverageFraction * 100).toFixed(0)}%`,
      };
    }
  }

  // --- Gap check ---
  if (expectedDistM > 0) {
    const gapFraction = maxGap / expectedDistM;
    if (gapFraction > config.maxGapFraction) {
      return {
        pass: false,
        reason: `Large gap detected: ${(gapFraction * 100).toFixed(1)}% of expected distance`,
      };
    }
  }

  return { pass: true };
}

/**
 * Filter an array of flight tracks, returning only those that pass.
 * Also returns counts for reporting.
 */
export function filterTracks(
  tracks: FlightTrack[],
  expectedOrigin: string,
  expectedDest: string,
  expectedDistM: number,
  config: FilterConfig = DEFAULT_FILTER_CONFIG
): { passed: FlightTrack[]; rejected: { track: FlightTrack; reason: string }[] } {
  const passed: FlightTrack[] = [];
  const rejected: { track: FlightTrack; reason: string }[] = [];

  for (const track of tracks) {
    const result = evaluateTrack(track, expectedOrigin, expectedDest, expectedDistM, config);
    if (result.pass) {
      passed.push(track);
    } else {
      rejected.push({ track, reason: result.reason! });
    }
  }

  return { passed, rejected };
}
