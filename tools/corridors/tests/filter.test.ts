import { describe, it, expect } from "vitest";
import { evaluateTrack, filterTracks } from "../src/lib/filter.js";
import type { FlightTrack } from "../src/types.js";

/** Helper: generate a simple track with N equally spaced points along the equator. */
function makeTrack(
  origin: string,
  dest: string,
  nPoints: number,
  lonStart = 0,
  lonEnd = 90
): FlightTrack {
  const points: [number, number][] = [];
  for (let i = 0; i < nPoints; i++) {
    const t = nPoints === 1 ? 0 : i / (nPoints - 1);
    points.push([lonStart + t * (lonEnd - lonStart), 0]);
  }
  return {
    originIata: origin,
    destIata: dest,
    directionId: `${origin}-${dest}`,
    points,
    flightId: `${origin}-${dest}-test`,
  };
}

describe("evaluateTrack", () => {
  it("passes a good track", () => {
    const track = makeTrack("AAA", "BBB", 50);
    // Expected distance ~10,000 km (90° along equator)
    const result = evaluateTrack(track, "AAA", "BBB", 10_000_000);
    expect(result.pass).toBe(true);
  });

  it("rejects origin/dest mismatch", () => {
    const track = makeTrack("AAA", "BBB", 50);
    const result = evaluateTrack(track, "AAA", "CCC", 10_000_000);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("mismatch");
  });

  it("rejects too few points", () => {
    const track = makeTrack("AAA", "BBB", 5);
    const result = evaluateTrack(track, "AAA", "BBB", 10_000_000);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("few points");
  });

  it("rejects incomplete coverage", () => {
    // Track covers only a tiny portion of the expected distance
    const track = makeTrack("AAA", "BBB", 50, 0, 5);
    const result = evaluateTrack(track, "AAA", "BBB", 10_000_000);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("coverage");
  });
});

describe("filterTracks", () => {
  it("separates passed and rejected tracks", () => {
    const good = makeTrack("AAA", "BBB", 50);
    const bad = makeTrack("AAA", "BBB", 5); // too few points

    const { passed, rejected } = filterTracks(
      [good, bad],
      "AAA",
      "BBB",
      10_000_000
    );

    expect(passed).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toContain("few points");
  });
});
