import { describe, it, expect } from "vitest";
import { resampleTrack } from "../src/lib/resample.js";

describe("resampleTrack", () => {
  it("produces exactly K points", () => {
    const input: [number, number][] = [
      [0, 0],
      [10, 0],
      [20, 0],
      [30, 0],
    ];
    const result = resampleTrack(input, 10);
    expect(result).toHaveLength(10);
  });

  it("first and last points match input endpoints", () => {
    const input: [number, number][] = [
      [-118.4, 33.9],
      [-100, 40],
      [-73.8, 40.6],
    ];
    const result = resampleTrack(input, 50);
    expect(result[0][0]).toBeCloseTo(-118.4, 2);
    expect(result[0][1]).toBeCloseTo(33.9, 2);
    expect(result[49][0]).toBeCloseTo(-73.8, 2);
    expect(result[49][1]).toBeCloseTo(40.6, 2);
  });

  it("K=2 returns just start and end", () => {
    const input: [number, number][] = [
      [0, 0],
      [5, 5],
      [10, 10],
    ];
    const result = resampleTrack(input, 2);
    expect(result).toHaveLength(2);
    expect(result[0][0]).toBeCloseTo(0, 5);
    expect(result[0][1]).toBeCloseTo(0, 5);
    expect(result[1][0]).toBeCloseTo(10, 2);
    expect(result[1][1]).toBeCloseTo(10, 2);
  });

  it("throws if K < 2", () => {
    expect(() => resampleTrack([[0, 0], [1, 1]], 1)).toThrow();
  });

  it("throws if input has fewer than 2 points", () => {
    expect(() => resampleTrack([[0, 0]], 10)).toThrow();
  });

  it("handles antimeridian-crossing input gracefully", () => {
    const input: [number, number][] = [
      [170, 40],
      [175, 42],
      [180, 44],
      [-175, 46],
      [-170, 48],
    ];
    const result = resampleTrack(input, 20);
    expect(result).toHaveLength(20);
    // All latitudes should be between 40 and 48
    for (const [, lat] of result) {
      expect(lat).toBeGreaterThanOrEqual(39);
      expect(lat).toBeLessThanOrEqual(49);
    }
  });
});
