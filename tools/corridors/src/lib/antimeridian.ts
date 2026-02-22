// ---------------------------------------------------------------------------
// antimeridian.ts — Antimeridian (±180°) handling for polylines
//
// Splits a polyline at the antimeridian so that no single segment
// crosses the ±180° boundary.  This prevents map renderers from
// drawing a line all the way around the globe.
// ---------------------------------------------------------------------------

/**
 * Normalize a longitude to the range (-180, 180].
 */
export function normalizeLon(lon: number): number {
  while (lon > 180) lon -= 360;
  while (lon <= -180) lon += 360;
  return lon;
}

/**
 * Detect whether a segment from lonA to lonB crosses the antimeridian.
 * Heuristic: if the absolute difference exceeds 180°, it's a wrap.
 */
function crossesAntimeridian(lonA: number, lonB: number): boolean {
  return Math.abs(lonB - lonA) > 180;
}

/**
 * Given a segment that crosses the antimeridian, compute the
 * interpolated latitude at the ±180° crossing and return two
 * boundary points (one at +180, one at -180).
 */
function interpolateCrossing(
  a: [number, number],
  b: [number, number]
): { atPlus180: [number, number]; atMinus180: [number, number] } {
  let lonA = a[0];
  let lonB = b[0];
  const latA = a[1];
  const latB = b[1];

  // Unwrap so both are on the same side for interpolation
  if (lonA > 0 && lonB < 0) {
    lonB += 360;
  } else if (lonA < 0 && lonB > 0) {
    lonA += 360;
  }

  // Fraction along segment where lon = 180 (or 540 after unwrap)
  const target = lonA > 180 ? 540 : 180;
  const denom = lonB - lonA;
  const t = denom !== 0 ? (target - lonA) / denom : 0.5;
  const latCross = latA + t * (latB - latA);

  return {
    atPlus180: [180, latCross],
    atMinus180: [-180, latCross],
  };
}

/**
 * Split a polyline at antimeridian crossings.
 *
 * Returns an array of polyline segments, each guaranteed not to
 * cross the ±180° boundary.  If the input doesn't cross, a single
 * segment (the original) is returned.
 *
 * @param points Array of [lon, lat] pairs.
 */
export function splitAtAntimeridian(
  points: [number, number][]
): [number, number][][] {
  if (points.length < 2) return [points];

  const segments: [number, number][][] = [];
  let current: [number, number][] = [[normalizeLon(points[0][0]), points[0][1]]];

  for (let i = 1; i < points.length; i++) {
    const prev = current[current.length - 1];
    const next: [number, number] = [normalizeLon(points[i][0]), points[i][1]];

    if (crossesAntimeridian(prev[0], next[0])) {
      const { atPlus180, atMinus180 } = interpolateCrossing(prev, next);

      // End current segment at the crossing boundary
      if (prev[0] > 0) {
        current.push(atPlus180);
        segments.push(current);
        current = [atMinus180, next];
      } else {
        current.push(atMinus180);
        segments.push(current);
        current = [atPlus180, next];
      }
    } else {
      current.push(next);
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}
