// IRDAI surrender value calculator. PRD §3.3.
// payable = max(GSV, SSV). Per IRDAI Master Circular 2024:
//   - GSV: floor; % of total premiums paid by policy year.
//   - SSV: SSV = [(N_paid / N_payable) × SA + accruedBonuses] × SVF.
// Estimates only — user should confirm exact figure with insurer.

import {
  BONUS_SURRENDER_FACTOR,
  GSV_FACTORS,
  GSV_LAST_TWO_YEARS_PPT,
  ssvSurrenderValueFactor,
} from "./assumptions";
import type { SurrenderResult } from "../schema";

export type SurrenderInput = {
  policyYear: number; // full years elapsed since policy start
  annualPremium: number;
  premiumPayingTermYears: number;
  policyTermYears: number;
  sumAssured: number;
  accruedBonuses?: number; // for with-profit endowments
};

export function gsvFactor(policyYear: number, ppt: number): number {
  if (policyYear < 1) return 0;
  // Last two years of premium-paying term: ~90% per IRDAI norms.
  if (ppt >= 2 && policyYear >= ppt - 1) return GSV_LAST_TWO_YEARS_PPT;
  return GSV_FACTORS[policyYear] ?? 0.5;
}

export function surrenderValue(input: SurrenderInput): SurrenderResult {
  const {
    policyYear,
    annualPremium,
    premiumPayingTermYears: ppt,
    policyTermYears: pt,
    sumAssured,
    accruedBonuses = 0,
  } = input;

  const premiumsPaidCount = Math.min(policyYear, ppt);
  const premiumsPaid = annualPremium * premiumsPaidCount;

  // ── Guaranteed Surrender Value ────────────────────────────────────────────
  const gsv = gsvFactor(policyYear, ppt) * premiumsPaid;

  // ── Paid-up value ─────────────────────────────────────────────────────────
  // (N_paid / N_payable) × SumAssured + vested bonuses (for with-profit plans)
  const paidUpValue = (premiumsPaidCount / ppt) * sumAssured + accruedBonuses;

  // ── Special Surrender Value (IRDAI Oct-2024 structure) ────────────────────
  // SSV = [(N_paid / N_payable) × SA + accruedBonuses] × SVF
  const svf = ssvSurrenderValueFactor(policyYear, pt);
  const ssv =
    ((premiumsPaidCount / ppt) * sumAssured + accruedBonuses) * svf +
    accruedBonuses * BONUS_SURRENDER_FACTOR;

  // Policyholder receives the higher of the two (IRDAI mandate).
  const payable = Math.max(gsv, ssv);
  return { gsv, ssv, payable, paidUpValue };
}
