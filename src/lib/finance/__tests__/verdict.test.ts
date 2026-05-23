import { describe, it, expect } from "vitest";
import { decideVerdict, buildRedFlags } from "../verdict";
import { BENCHMARK_RATES } from "../assumptions";

describe("decideVerdict", () => {
  it("keeps a policy with reasonable IRR and no exit advantage", () => {
    const v = decideVerdict({
      realIRR: 0.08,
      continuationIRR: 0.08,
      maturityValueIfKept: 2_000_000,
      exitValueAtMaturity: 1_800_000,
    });
    expect(v).toBe("keep");
  });

  it("recommends surrender when forward IRR is poor AND exit wins", () => {
    const v = decideVerdict({
      realIRR: 0.04,
      continuationIRR: 0.03, // future premiums earn 3% — terrible
      maturityValueIfKept: 1_700_000,
      exitValueAtMaturity: 2_500_000,
    });
    expect(v).toBe("surrender");
  });

  it("recommends paid-up when forward IRR is poor but exit doesn't win enough", () => {
    const v = decideVerdict({
      realIRR: 0.04,
      continuationIRR: 0.03,
      maturityValueIfKept: 1_700_000,
      exitValueAtMaturity: 1_600_000, // worse than keeping
    });
    expect(v).toBe("paidup");
  });

  it("never recommends surrender on null/unknown IRR — defaults to keep", () => {
    const v = decideVerdict({
      realIRR: null,
      continuationIRR: null,
      maturityValueIfKept: 100,
      exitValueAtMaturity: 100,
    });
    expect(v).toBe("keep");
  });
});

describe("buildRedFlags", () => {
  it("flags IRR below FD rate", () => {
    const flags = buildRedFlags({
      realIRR: 0.04,
      fdRate: BENCHMARK_RATES.fd,
      inflation: BENCHMARK_RATES.inflation,
      policyType: "endowment",
      annualPremium: 50_000,
    });
    expect(flags.some((f) => /FD rate/i.test(f))).toBe(true);
  });

  it("flags IRR below inflation", () => {
    const flags = buildRedFlags({
      realIRR: 0.04,
      fdRate: BENCHMARK_RATES.fd,
      inflation: BENCHMARK_RATES.inflation,
      policyType: "endowment",
      annualPremium: 50_000,
    });
    expect(flags.some((f) => /inflation/i.test(f))).toBe(true);
  });

  it("flags premium > 10% of income when income is provided", () => {
    const flags = buildRedFlags({
      realIRR: 0.08,
      fdRate: BENCHMARK_RATES.fd,
      inflation: BENCHMARK_RATES.inflation,
      policyType: "endowment",
      annualPremium: 100_000,
      annualIncome: 500_000, // 20% of income
    });
    expect(flags.some((f) => /10%/.test(f))).toBe(true);
  });

  it("returns no flags for a healthy policy", () => {
    const flags = buildRedFlags({
      realIRR: 0.09,
      fdRate: BENCHMARK_RATES.fd,
      inflation: BENCHMARK_RATES.inflation,
      policyType: "endowment",
      annualPremium: 50_000,
      annualIncome: 2_000_000,
    });
    expect(flags).toHaveLength(0);
  });

  it("does not crash when realIRR is null", () => {
    const flags = buildRedFlags({
      realIRR: null,
      fdRate: BENCHMARK_RATES.fd,
      inflation: BENCHMARK_RATES.inflation,
      policyType: "endowment",
      annualPremium: 50_000,
    });
    expect(Array.isArray(flags)).toBe(true);
  });
});
