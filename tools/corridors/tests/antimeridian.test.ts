import { describe, it, expect } from "vitest";
import { normalizeLon, splitAtAntimeridian } from "../src/lib/antimeridian.js";

describe("normalizeLon", () => {
  it("passes through values in range", () => {
    expect(normalizeLon(0)).toBe(0);
    expect(normalizeLon(90)).toBe(90);
    expect(normalizeLon(-90)).toBe(-90);
    expect(normalizeLon(180)).toBe(180);
  });

  it("wraps values > 180", () => {
    expect(normalizeLon(181)).toBeCloseTo(-179, 10);
    expect(normalizeLon(360)).toBeCloseTo(0, 10);
    expect(normalizeLon(540)).toBeCloseTo(180, 10);
  });

  it("wraps values <= -180", () => {
    expect(normalizeLon(-180)).toBeCloseTo(180, 10);
    expect(normalizeLon(-181)).toBeCloseTo(179, 10);
    expect(normalizeLon(-360)).toBeCloseTo(0, 10);
  });
});

describe("splitAtAntimeridian", () => {
  it("returns single segment when no crossing", () => {
    const points: [number, number][] = [
      [0, 0],
      [10, 10],
      [20, 20],
    ];
    const result = splitAtAntimeridian(points);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);
  });

  it("splits at a single crossing (east→west)", () => {
    const points: [number, number][] = [
      [170, 40],
      [175, 42],
      [-175, 44],
      [-170, 46],
    ];
    const result = splitAtAntimeridian(points);
    expect(result).toHaveLength(2);
    // First segment ends at +180
    const lastOfFirst = result[0][result[0].length - 1];
    expect(lastOfFirst[0]).toBe(180);
    // Second segment starts at -180
    expect(result[1][0][0]).toBe(-180);
    // Crossing latitudes should match
    expect(lastOfFirst[1]).toBeCloseTo(result[1][0][1], 5);
  });

  it("splits at a single crossing (west→east)", () => {
    const points: [number, number][] = [
      [-170, 40],
      [-175, 42],
      [175, 44],
      [170, 46],
    ];
    const result = splitAtAntimeridian(points);
    expect(result).toHaveLength(2);
  });

  it("handles multiple crossings", () => {
    const points: [number, number][] = [
      [170, 0],
      [-170, 0],  // crossing 1
      [-160, 0],
      [170, 0],   // crossing 2 (back)
      [160, 0],
    ];
    const result = splitAtAntimeridian(points);
    expect(result).toHaveLength(3);
  });

  it("returns single segment for single point", () => {
    const result = splitAtAntimeridian([[10, 20]]);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
  });
});
