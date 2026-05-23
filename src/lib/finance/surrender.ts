// IRDAI surrender value calculator. PRD §3.3.
// payable = max(GSV, SSV). Estimates only — user should confirm with insurer.

import { BONUS_SURRENDER_FACTOR, GSV_FACTORS } from "./assumptions";
import type { SurrenderResult } from "../schema";

export type SurrenderInput = {
  policyYear: number; // years elapsed since policy start
  annualPremium: number;
  premiumPayingTermYears: number;
  policyTermYears: number;
  sumAssured: number;
  accruedBonuses?: number; // for with-profit endowments
};

function gsvFactor(policyYear: number, ppt: number): number {
  // Last two years of PPT: ~0.9 per IRDAI norms.
  if (policyYear >= ppt - 1) return 0.9;
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

  const premiumsPaid = annualPremium * Math.min(policyYear, ppt);

  // Guaranteed Surrender Value
  const gsv = gsvFactor(policyYear, ppt) * premiumsPaid;

  // Paid-up value = (premiumsPaid / totalPremiumsPayable) × sumAssured + vested bonuses
  const paidUpValue =
    (Math.min(policyYear, ppt) / ppt) * sumAssured + accruedBonuses;

  // Special Surrender Value ≈ paid-up + bonuses, discounted by a surrender
  // factor that grows with proximity to maturity. Coarse estimate; if user
  // has an exact insurer quote, prefer that upstream.
  const ssvDiscount = Math.min(1, policyYear / pt);
  const ssv =
    paidUpValue * ssvDiscount + accruedBonuses * BONUS_SURRENDER_FACTOR;

  const payable = Math.max(gsv, ssv);
  return { gsv, ssv, payable, paidUpValue };
}
