import { describe, it, expect } from "vitest";
import { benchmarks, estimateTermPremium } from "../benchmarks";
import { BENCHMARK_RATES } from "../assumptions";

describe("estimateTermPremium", () => {
  it("picks tier ≥ requested sum assured", () => {
    // age 30, SA = 50L → 5_000_000 tier
    expect(estimateTermPremium(30, 5_000_000)).toBe(6_000);
  });

  it("scales with age band", () => {
    const young = estimateTermPremium(28, 10_000_000);
    const older = estimateTermPremium(48, 10_000_000);
    expect(older).toBeGreaterThan(young);
  });

  it("falls back to highest tier for huge sum assured", () => {
    const v = estimateTermPremium(30, 50_000_000);
    // Should be the 20_000_000 tier for 25-30.
    expect(v).toBe(18_000);
  });

  it("scales with sum assured within an age band", () => {
    const small = estimateTermPremium(35, 5_000_000);
    const big = estimateTermPremium(35, 20_000_000);
    expect(big).toBeGreaterThan(small);
  });
});

describe("benchmarks", () => {
  const input = {
    annualPremium: 50_000,
    premiumPayingTermYears: 20,
    policyTermYears: 20,
    ageAtStart: 30,
    sumAssured: 5_000_000, // 50L cover
    insurerProjectedMaturityValue: 1_700_000, // typical endowment maturity
  };

  it("returns three benchmarks in order: index, PPF, FD", () => {
    const r = benchmarks(input);
    expect(r).toHaveLength(3);
    expect(r[0].label).toMatch(/index/i);
    expect(r[1].label).toMatch(/ppf/i);
    expect(r[2].label).toMatch(/fd/i);
  });

  it("uses configured benchmark rates", () => {
    const r = benchmarks(input);
    expect(r[0].rate).toBe(BENCHMARK_RATES.niftyIndexNominal);
    expect(r[1].rate).toBe(BENCHMARK_RATES.ppf);
    expect(r[2].rate).toBe(BENCHMARK_RATES.fd);
  });

  it("higher benchmark rate → higher future value", () => {
    const r = benchmarks(input);
    expect(r[0].futureValue).toBeGreaterThan(r[1].futureValue);
    expect(r[1].futureValue).toBeGreaterThan(r[2].futureValue);
  });

  it("wealth gap = FV − insurer projected maturity", () => {
    const r = benchmarks(input);
    for (const b of r) {
      expect(b.gapVsPolicy).toBeCloseTo(
        b.futureValue - input.insurerProjectedMaturityValue,
        2,
      );
    }
  });

  it("term + index beats a typical endowment by a wide margin", () => {
    // The headline of the whole product. ~11% over 20 years on
    // (50k − ~6k) annually should comfortably exceed 17L maturity.
    const r = benchmarks(input);
    const indexBench = r[0];
    expect(indexBench.gapVsPolicy).toBeGreaterThan(1_000_000); // > ₹10L gap
  });

  it("annual investable can never be negative — clamps at 0", () => {
    // Premium < term-premium estimate edge case.
    const r = benchmarks({
      ...input,
      annualPremium: 3_000, // less than even the cheapest term tier
      sumAssured: 5_000_000,
    });
    for (const b of r) {
      expect(b.futureValue).toBeGreaterThanOrEqual(0);
    }
  });
});
