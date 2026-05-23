import { describe, it, expect } from "vitest";
import { surrenderValue, gsvFactor } from "../surrender";
import { GSV_LAST_TWO_YEARS_PPT } from "../assumptions";

describe("gsvFactor — IRDAI GSV table", () => {
  it("year 1 is 0%", () => {
    expect(gsvFactor(1, 20)).toBe(0);
  });

  it("years 2-3 are 30%", () => {
    expect(gsvFactor(2, 20)).toBe(0.3);
    expect(gsvFactor(3, 20)).toBe(0.3);
  });

  it("years 4-7 are 50%", () => {
    expect(gsvFactor(4, 20)).toBe(0.5);
    expect(gsvFactor(7, 20)).toBe(0.5);
  });

  it("last two years of PPT are 90%", () => {
    expect(gsvFactor(19, 20)).toBe(GSV_LAST_TWO_YEARS_PPT);
    expect(gsvFactor(20, 20)).toBe(GSV_LAST_TWO_YEARS_PPT);
  });
});

describe("surrenderValue — full IRDAI calc", () => {
  const base = {
    annualPremium: 50_000,
    premiumPayingTermYears: 20,
    policyTermYears: 20,
    sumAssured: 1_000_000,
  };

  it("year 3 endowment: GSV = 0.3 × 3 × premium", () => {
    const r = surrenderValue({ ...base, policyYear: 3 });
    expect(r.gsv).toBeCloseTo(45_000, 2); // 0.3 × 3 × 50k
  });

  it("year 5 endowment: GSV = 0.5 × 5 × premium", () => {
    const r = surrenderValue({ ...base, policyYear: 5 });
    expect(r.gsv).toBeCloseTo(125_000, 2); // 0.5 × 5 × 50k
  });

  it("paid-up value = (N_paid / N_payable) × SA", () => {
    const r = surrenderValue({ ...base, policyYear: 10 });
    expect(r.paidUpValue).toBeCloseTo(500_000, 2); // (10/20) × 1M
  });

  it("payable = max(GSV, SSV) — SSV typically wins mid-policy", () => {
    const r = surrenderValue({ ...base, policyYear: 10 });
    expect(r.payable).toBe(Math.max(r.gsv, r.ssv));
    // At year 10 in a 20-yr policy, SSV should beat GSV under the
    // post-Oct-2024 structure (the whole point of the IRDAI reform).
    expect(r.ssv).toBeGreaterThan(r.gsv);
  });

  it("vested bonuses raise both paid-up value and SSV", () => {
    const noBonus = surrenderValue({ ...base, policyYear: 10 });
    const withBonus = surrenderValue({
      ...base,
      policyYear: 10,
      accruedBonuses: 200_000,
    });
    expect(withBonus.paidUpValue).toBeGreaterThan(noBonus.paidUpValue);
    expect(withBonus.ssv).toBeGreaterThan(noBonus.ssv);
  });

  it("at policy maturity, payable should approach sum assured", () => {
    const r = surrenderValue({ ...base, policyYear: 20 });
    // Last year of PPT → 90% GSV on full premiums.
    expect(r.gsv).toBeCloseTo(900_000, 2); // 0.9 × 20 × 50k
    // Paid-up = full SA at maturity.
    expect(r.paidUpValue).toBeCloseTo(1_000_000, 2);
  });

  it("year 1 surrender yields zero GSV (not eligible under old norms)", () => {
    const r = surrenderValue({ ...base, policyYear: 1 });
    expect(r.gsv).toBe(0);
    // SSV may still be positive under post-Oct-2024 rules (eligible after 1 yr).
    expect(r.ssv).toBeGreaterThanOrEqual(0);
  });

  it("never returns NaN or negative values for sensible inputs", () => {
    for (let y = 1; y <= 20; y++) {
      const r = surrenderValue({ ...base, policyYear: y });
      expect(Number.isFinite(r.gsv)).toBe(true);
      expect(Number.isFinite(r.ssv)).toBe(true);
      expect(Number.isFinite(r.payable)).toBe(true);
      expect(r.gsv).toBeGreaterThanOrEqual(0);
      expect(r.ssv).toBeGreaterThanOrEqual(0);
      expect(r.payable).toBeGreaterThanOrEqual(0);
    }
  });
});
