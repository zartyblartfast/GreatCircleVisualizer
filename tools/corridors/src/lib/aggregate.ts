// ---------------------------------------------------------------------------
// aggregate.ts — Compute median polyline from multiple resampled tracks
//
// All tracks must already be resampled to the same K points.
// At each index i, the median position is computed via spherical
// unit-vector averaging across all tracks.
// ---------------------------------------------------------------------------

import { sphericalMedianPoint } from "./spherical.js";

/**
 * Given N resampled tracks (each K points), compute the median polyline.
 *
 * At each index i (0..K-1), collects the i-th point from every track
 * and computes the spherical mean direction.
 *
 * @param tracks  Array of N tracks, each an array of K [lon, lat] points.
 * @returns       A single polyline of K [lon, lat] points.
 */
export function computeMedianPolyline(
  tracks: [number, number][][]
): [number, number][] {
  if (tracks.length === 0) {
    throw new Error("computeMedianPolyline: no tracks provided");
  }

  const k = tracks[0].length;

  // Validate all tracks have the same length
  for (let t = 0; t < tracks.length; t++) {
    if (tracks[t].length !== k) {
      throw new Error(
        `computeMedianPolyline: track ${t} has ${tracks[t].length} points, expected ${k}`
      );
    }
  }

  const median: [number, number][] = [];

  for (let i = 0; i < k; i++) {
    const pointsAtIndex: [number, number][] = tracks.map((tr) => tr[i]);
    median.push(sphericalMedianPoint(pointsAtIndex));
  }

  return median;
}
