// Single source of truth for benchmark rates, term-premium estimates,
// and IRDAI surrender factor tables. Displayed to user on the verdict
// screen ("Assumptions used"). PRD §3.5.
//
// All values verified May 2026. Sources noted inline.

// ─── Benchmark rates ────────────────────────────────────────────────────────
// Sources (May 2026):
//   - PPF: Govt of India holds 7.1% for Apr–Jun 2026 quarter (unchanged
//     since Apr 2020). https://www.newsbytesapp.com/news/business/government-keeps-ppf-interest-rate-at-71-through-june-2026/tldr
//   - FD: SBI 5-yr ~6.45%, HDFC 5-yr ~6.40% (general public, May 2026).
//     Using 6.40% as the conservative anchor.
//   - Nifty nominal: long-run ~11–12% nominal; using 11% with a market-risk
//     caveat shown to the user. NOT a guaranteed return.
//   - Inflation: India CPI long-run anchor ~6%.
export const BENCHMARK_RATES = {
  niftyIndexNominal: 0.11, // 11% — show market-risk caveat on UI
  ppf: 0.071, // 7.1%
  fd: 0.064, // 6.4%
  inflation: 0.06,
} as const;

// ─── Term insurance premium estimate (annual ₹) ─────────────────────────────
// Rough ballpark for online pure-term plans (non-smoker, healthy male).
// Conservative — actual quotes can be lower for low-risk profiles. Documented
// on the UI; user should confirm with an aggregator.
export const TERM_PREMIUM_TABLE: Record<string, Record<number, number>> = {
  "25-30": { 5_000_000: 6_000, 10_000_000: 10_000, 20_000_000: 18_000 },
  "31-35": { 5_000_000: 8_000, 10_000_000: 13_000, 20_000_000: 23_000 },
  "36-40": { 5_000_000: 11_000, 10_000_000: 19_000, 20_000_000: 34_000 },
  "41-45": { 5_000_000: 17_000, 10_000_000: 29_000, 20_000_000: 52_000 },
  "46-50": { 5_000_000: 26_000, 10_000_000: 45_000, 20_000_000: 80_000 },
};

// ─── IRDAI Guaranteed Surrender Value factors ───────────────────────────────
// Source: IRDAI surrender norms (long-standing baseline; the Oct-2024 Master
// Circular preserves these as the GSV floor while strengthening SSV).
//   Year 1:           0%  (not eligible unless single-premium / <5yr PPT)
//   Years 2–3:       30%  of total premiums paid
//   Years 4–7:       50%
//   Last 2 yrs PPT:  90%  (handled dynamically in surrender.ts)
// Note: LIC-style convention excludes the first year's premium from the
// base. We use total premiums paid as the base and label estimate clearly.
export const GSV_FACTORS: Record<number, number> = {
  1: 0.0,
  2: 0.3,
  3: 0.3,
  4: 0.5,
  5: 0.5,
  6: 0.5,
  7: 0.5,
};
export const GSV_LAST_TWO_YEARS_PPT = 0.9;

// ─── IRDAI Special Surrender Value structure (post 1-Oct-2024) ──────────────
// SSV = [(N_paid / N_payable) × SumAssured + accruedBonuses] × SVF
// where SVF (Surrender Value Factor) is insurer-specific. IRDAI requires
// SSV ≥ present value of paid-up future benefits, discounted at no more than
// (10Y G-Sec yield + 50 bps).
//
// We model SVF as a smooth ramp from ~0.30 (early years) to ~0.95 (at
// maturity), which approximates the discounted-present-value behaviour
// without simulating each insurer's actuarial table. Always labelled as
// estimate; user can override with insurer's exact quote.
export function ssvSurrenderValueFactor(
  policyYear: number,
  policyTermYears: number,
): number {
  const t = Math.max(0, Math.min(1, policyYear / policyTermYears));
  // Linear ramp 0.30 → 0.95 over the policy term.
  return 0.3 + (0.95 - 0.3) * t;
}

// Surrender factor on accrued bonuses (typically lower than on sum assured).
export const BONUS_SURRENDER_FACTOR = 0.2;

// Reference: discount-rate ceiling per IRDAI (10Y G-Sec + 50 bps).
// Used as the upper bound when we later refine SSV with explicit PV math.
export const SSV_DISCOUNT_RATE_CEILING = 0.0735; // 10Y G-Sec ~6.85% + 0.50% (May 2026)
