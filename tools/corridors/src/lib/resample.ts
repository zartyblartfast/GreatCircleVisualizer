// ---------------------------------------------------------------------------
// resample.ts — Resample a polyline to exactly K equidistant points
//
// Uses cumulative haversine distance fractions to interpolate.
// Interpolation is done in unit-vector space (spherical-safe).
// ---------------------------------------------------------------------------

import {
  toUnitVector,
  fromUnitVector,
  cumulativeDistanceFractions,
} from "./spherical.js";

/**
 * Resample a polyline of [lon, lat] points to exactly K points,
 * evenly spaced by cumulative great-circle distance fraction (0..1).
 *
 * @param points  Input polyline (at least 2 points).
 * @param k       Desired output point count (≥ 2).
 * @returns       Array of exactly K [lon, lat] points.
 */
export function resampleTrack(
  points: [number, number][],
  k: number
): [number, number][] {
  if (k < 2) throw new Error("resampleTrack: k must be >= 2");
  if (points.length < 2) throw new Error("resampleTrack: need >= 2 input points");

  const fracs = cumulativeDistanceFractions(points);
  const result: [number, number][] = [];

  // We walk through the input segments, filling in output points
  // at uniform target fractions 0/(k-1), 1/(k-1), ..., (k-1)/(k-1).
  let segIdx = 0; // current segment: points[segIdx] → points[segIdx+1]

  for (let i = 0; i < k; i++) {
    const targetFrac = i / (k - 1);

    // Advance segIdx so that fracs[segIdx] ≤ targetFrac ≤ fracs[segIdx+1]
    while (
      segIdx < points.length - 2 &&
      fracs[segIdx + 1] < targetFrac
    ) {
      segIdx++;
    }

    const f0 = fracs[segIdx];
    const f1 = fracs[segIdx + 1];
    const segLen = f1 - f0;

    if (segLen === 0) {
      // Zero-length segment — just use the start point
      result.push([points[segIdx][0], points[segIdx][1]]);
      continue;
    }

    // Local interpolation parameter within this segment [0..1]
    const t = (targetFrac - f0) / segLen;

    // Interpolate in unit-vector space (slerp approximation via lerp + normalize)
    const v0 = toUnitVector(points[segIdx][0], points[segIdx][1]);
    const v1 = toUnitVector(points[segIdx + 1][0], points[segIdx + 1][1]);

    const ix = v0.x + t * (v1.x - v0.x);
    const iy = v0.y + t * (v1.y - v0.y);
    const iz = v0.z + t * (v1.z - v0.z);

    const len = Math.sqrt(ix * ix + iy * iy + iz * iz);
    if (len === 0) {
      result.push([points[segIdx][0], points[segIdx][1]]);
      continue;
    }

    result.push(fromUnitVector({ x: ix / len, y: iy / len, z: iz / len }));
  }

  return result;
}
