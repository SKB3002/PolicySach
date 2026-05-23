// Integration test — full PolicyInput → AnalysisResult pipeline.
// Three sample policies chosen to exercise the engine end-to-end:
//   1. LIC New Endowment — the prototypical mis-sold "FD-like" plan.
//   2. ULIP — market-linked, partway through the policy life.
//   3. Money-back — with intermediate survival benefits.
//
// Acceptance (PRD M1): all assertions pass; outputs match a manual
// spreadsheet for the same inputs. Run `npm test -- --reporter=verbose`
// then visually diff against the sample-spreadsheet column you build.

import { describe, it, expect } from "vitest";
import { analyzePolicy } from "../analyze";
import type { PolicyInput } from "../../schema";

const FIXED_NOW = new Date("2026-05-23T00:00:00Z");

// ─── Sample 1: LIC New Endowment (the headline mis-sold case) ────────────────
const endowment: PolicyInput = {
  insurer: "LIC",
  planName: "New Endowment Plan",
  policyType: "endowment",
  sumAssured: 1_000_000, // ₹10L
  annualPremium: 50_000,
  premiumPayingTermYears: 20,
  policyTermYears: 20,
  startDate: "2026-05-01", // freshly bought
  ageAtStart: 30,
  projectedMaturityValue: 1_700_000, // ₹17L at maturity (4-5% IRR territory)
  illustrationScenario: "8pct",
};

// ─── Sample 2: ULIP (mid-life, 5 years in) ───────────────────────────────────
const ulip: PolicyInput = {
  insurer: "HDFC Life",
  planName: "Click 2 Wealth",
  policyType: "ulip",
  sumAssured: 1_200_000,
  annualPremium: 100_000,
  premiumPayingTermYears: 10,
  policyTermYears: 15,
  startDate: "2021-05-01", // 5 years ago
  ageAtStart: 35,
  projectedMaturityValue: 2_500_000, // ₹25L if 8% NAV growth holds
  illustrationScenario: "8pct",
  currentFundValue: 600_000,
};

// ─── Sample 3: Money-back ────────────────────────────────────────────────────
const moneyback: PolicyInput = {
  insurer: "SBI Life",
  planName: "Smart Money Back Gold",
  policyType: "moneyback",
  sumAssured: 500_000,
  annualPremium: 30_000,
  premiumPayingTermYears: 20,
  policyTermYears: 20,
  startDate: "2026-05-01",
  ageAtStart: 35,
  projectedMaturityValue: 400_000, // residual maturity after payouts
  illustrationScenario: "8pct",
  intermediatePayouts: [
    { year: 5, amount: 100_000 },
    { year: 10, amount: 100_000 },
    { year: 15, amount: 100_000 },
  ],
};

describe("analyzePolicy — full pipeline", () => {
  describe("Sample 1: LIC New Endowment (mis-sold archetype)", () => {
    const r = analyzePolicy(endowment, { now: FIXED_NOW });

    it("produces a complete AnalysisResult shape", () => {
      expect(r.realIRR).not.toBeNull();
      expect(r.benchmarks).toHaveLength(3);
      expect(r.surrender).toBeDefined();
      expect(r.verdict).toMatch(/keep|paidup|surrender/);
      expect(r.verdictReasonPlainText.length).toBeGreaterThan(20);
    });

    it("real IRR is in the credible endowment range (3–5%)", () => {
      expect(r.realIRR!).toBeGreaterThan(0.03);
      expect(r.realIRR!).toBeLessThan(0.05);
    });

    it("term + index beats the policy by ≥ ₹10L over 20 years", () => {
      expect(r.benchmarks[0].gapVsPolicy).toBeGreaterThan(1_000_000);
    });

    it("triggers the FD-rate and inflation red flags", () => {
      expect(r.redFlags.some((f) => /FD rate/i.test(f))).toBe(true);
      expect(r.redFlags.some((f) => /inflation/i.test(f))).toBe(true);
    });

    it("verdict is surrender (poor IRR + huge gap to alternatives)", () => {
      expect(r.verdict).toBe("surrender");
    });

    it("records every benchmark assumption used", () => {
      expect(r.assumptionsUsed.niftyIndexNominal).toBeCloseTo(0.11, 3);
      expect(r.assumptionsUsed.ppf).toBeCloseTo(0.071, 3);
      expect(r.assumptionsUsed.fd).toBeCloseTo(0.064, 3);
    });
  });

  describe("Sample 2: ULIP (5 years in, 10 to go)", () => {
    const r = analyzePolicy(ulip, { now: FIXED_NOW });

    it("computes both realIRR and continuationIRR", () => {
      expect(r.realIRR).not.toBeNull();
      expect(r.continuationIRR).not.toBeNull();
    });

    it("policy is partway through — surrender has meaningful value", () => {
      expect(r.surrender.payable).toBeGreaterThan(0);
      expect(r.surrender.paidUpValue).toBeGreaterThan(0);
    });

    it("benchmarks reflect a 15-year horizon with 10 years of premiums", () => {
      // FV should be positive and ordered: index > PPF > FD
      expect(r.benchmarks[0].futureValue).toBeGreaterThan(
        r.benchmarks[1].futureValue,
      );
      expect(r.benchmarks[1].futureValue).toBeGreaterThan(
        r.benchmarks[2].futureValue,
      );
    });

    it("captures currentPolicyYear ≈ 5 in assumptions", () => {
      expect(r.assumptionsUsed.currentPolicyYear).toBe(5);
    });
  });

  describe("Sample 3: Money-back (intermediate payouts)", () => {
    const r = analyzePolicy(moneyback, { now: FIXED_NOW });

    it("includes intermediate payouts in the IRR calc", () => {
      // The total cashflow back to the user is 3 × 100k + 400k = 700k
      // on premiums of 20 × 30k = 600k → IRR is positive but modest.
      expect(r.realIRR).not.toBeNull();
      expect(r.realIRR!).toBeGreaterThan(0);
      expect(r.realIRR!).toBeLessThan(0.06);
    });

    it("verdict and red flags are coherent", () => {
      expect(r.verdict).toMatch(/keep|paidup|surrender/);
      expect(Array.isArray(r.redFlags)).toBe(true);
    });
  });
});
