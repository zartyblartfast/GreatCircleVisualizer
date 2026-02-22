// ---------------------------------------------------------------------------
// spherical.ts — Spherical geometry helpers
//
// All aggregation uses unit-vector (x, y, z) representation to avoid
// latitude/longitude averaging artefacts near poles and the antimeridian.
// ---------------------------------------------------------------------------

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** A point on the unit sphere in Cartesian coordinates. */
export interface UnitVector {
  x: number;
  y: number;
  z: number;
}

/**
 * Convert [lon, lat] (degrees) to a unit vector on the sphere.
 */
export function toUnitVector(lon: number, lat: number): UnitVector {
  const φ = lat * DEG2RAD;
  const λ = lon * DEG2RAD;
  return {
    x: Math.cos(φ) * Math.cos(λ),
    y: Math.cos(φ) * Math.sin(λ),
    z: Math.sin(φ),
  };
}

/**
 * Convert a unit vector back to [lon, lat] (degrees).
 */
export function fromUnitVector(v: UnitVector): [number, number] {
  const lat = Math.asin(clamp(v.z, -1, 1)) * RAD2DEG;
  const lon = Math.atan2(v.y, v.x) * RAD2DEG;
  return [lon, lat];
}

/**
 * Compute the spherical median of an array of [lon, lat] points.
 *
 * Method: average the unit vectors, normalise the result back to the
 * unit sphere, then convert to [lon, lat].  This is the "centroid"
 * direction — robust near poles and across the antimeridian.
 */
export function sphericalMedianPoint(
  points: [number, number][]
): [number, number] {
  if (points.length === 0) {
    throw new Error("sphericalMedianPoint: empty input");
  }
  if (points.length === 1) {
    return [points[0][0], points[0][1]];
  }

  let sx = 0;
  let sy = 0;
  let sz = 0;

  for (const [lon, lat] of points) {
    const v = toUnitVector(lon, lat);
    sx += v.x;
    sy += v.y;
    sz += v.z;
  }

  const len = Math.sqrt(sx * sx + sy * sy + sz * sz);
  if (len === 0) {
    // Degenerate: points are antipodal on average — fall back to first point
    return [points[0][0], points[0][1]];
  }

  return fromUnitVector({ x: sx / len, y: sy / len, z: sz / len });
}

/**
 * Haversine distance between two [lon, lat] points, in metres.
 */
export function haversineDistance(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6_371_000; // Earth mean radius in metres
  const φ1 = a[1] * DEG2RAD;
  const φ2 = b[1] * DEG2RAD;
  const Δφ = (b[1] - a[1]) * DEG2RAD;
  const Δλ = (b[0] - a[0]) * DEG2RAD;

  const sinHalfΔφ = Math.sin(Δφ / 2);
  const sinHalfΔλ = Math.sin(Δλ / 2);

  const h =
    sinHalfΔφ * sinHalfΔφ +
    Math.cos(φ1) * Math.cos(φ2) * sinHalfΔλ * sinHalfΔλ;

  return 2 * R * Math.asin(Math.sqrt(clamp(h, 0, 1)));
}

/**
 * Cumulative distance fractions along a polyline of [lon, lat] points.
 * Returns an array of length N where fractions[0] = 0 and fractions[N-1] = 1.
 */
export function cumulativeDistanceFractions(
  points: [number, number][]
): number[] {
  if (points.length < 2) return [0];

  const dists: number[] = [0];
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const d = haversineDistance(points[i - 1], points[i]);
    total += d;
    dists.push(total);
  }

  if (total === 0) {
    // All points identical — uniform fractions
    return points.map((_, i) => i / (points.length - 1));
  }

  return dists.map((d) => d / total);
}

/** Clamp a value between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
