import { describe, it, expect } from "vitest";
import {
  toUnitVector,
  fromUnitVector,
  sphericalMedianPoint,
  haversineDistance,
  cumulativeDistanceFractions,
} from "../src/lib/spherical.js";

describe("toUnitVector / fromUnitVector", () => {
  it("round-trips (0, 0) — Null Island", () => {
    const v = toUnitVector(0, 0);
    const [lon, lat] = fromUnitVector(v);
    expect(lon).toBeCloseTo(0, 10);
    expect(lat).toBeCloseTo(0, 10);
  });

  it("round-trips (90, 45)", () => {
    const v = toUnitVector(90, 45);
    const [lon, lat] = fromUnitVector(v);
    expect(lon).toBeCloseTo(90, 10);
    expect(lat).toBeCloseTo(45, 10);
  });

  it("round-trips (-118.4, 33.9) — near LAX", () => {
    const v = toUnitVector(-118.4, 33.9);
    const [lon, lat] = fromUnitVector(v);
    expect(lon).toBeCloseTo(-118.4, 8);
    expect(lat).toBeCloseTo(33.9, 8);
  });

  it("round-trips the North Pole (0, 90)", () => {
    const v = toUnitVector(0, 90);
    const [lon, lat] = fromUnitVector(v);
    expect(lat).toBeCloseTo(90, 10);
    // lon is undefined at poles, don't check
  });

  it("unit vector has magnitude 1", () => {
    const v = toUnitVector(-45, 60);
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    expect(mag).toBeCloseTo(1, 12);
  });
});

describe("sphericalMedianPoint", () => {
  it("single point returns itself", () => {
    const result = sphericalMedianPoint([[10, 20]]);
    expect(result[0]).toBeCloseTo(10, 10);
    expect(result[1]).toBeCloseTo(20, 10);
  });

  it("two identical points returns the same point", () => {
    const result = sphericalMedianPoint([
      [-118.4, 33.9],
      [-118.4, 33.9],
    ]);
    expect(result[0]).toBeCloseTo(-118.4, 8);
    expect(result[1]).toBeCloseTo(33.9, 8);
  });

  it("mean of symmetric points around antimeridian", () => {
    // 170°E and 170°W should average near 180°
    const result = sphericalMedianPoint([
      [170, 0],
      [-170, 0],
    ]);
    expect(Math.abs(result[0])).toBeCloseTo(180, 5);
    expect(result[1]).toBeCloseTo(0, 5);
  });

  it("throws on empty input", () => {
    expect(() => sphericalMedianPoint([])).toThrow();
  });
});

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistance([0, 0], [0, 0])).toBe(0);
  });

  it("quarter Earth circumference from equator to pole", () => {
    const d = haversineDistance([0, 0], [0, 90]);
    // ~10,018 km
    expect(d).toBeGreaterThan(10_000_000);
    expect(d).toBeLessThan(10_050_000);
  });

  it("LHR to JFK ≈ 5,555 km", () => {
    const d = haversineDistance([-0.4614, 51.4700], [-73.7781, 40.6413]);
    expect(d / 1000).toBeCloseTo(5555, -2); // within ~100 km
  });
});

describe("cumulativeDistanceFractions", () => {
  it("single point returns [0]", () => {
    expect(cumulativeDistanceFractions([[0, 0]])).toEqual([0]);
  });

  it("two points returns [0, 1]", () => {
    const result = cumulativeDistanceFractions([
      [0, 0],
      [10, 10],
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeCloseTo(1, 10);
  });

  it("three equidistant points on equator", () => {
    const result = cumulativeDistanceFractions([
      [0, 0],
      [10, 0],
      [20, 0],
    ]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeCloseTo(0.5, 5);
    expect(result[2]).toBeCloseTo(1, 10);
  });
});
