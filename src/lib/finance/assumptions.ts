// Single source of truth for benchmark rates, term-premium estimates,
// and IRDAI surrender factor tables. Displayed to user on the verdict
// screen ("Assumptions used"). PRD §3.5.
//
// ⚠️ VERIFY at build time before launch (PRD §9):
//   - Current PPF rate
//   - Current FD rate
//   - Current IRDAI GSV/SSV factor tables (pre- vs post-1-Oct-2024)

export const BENCHMARK_RATES = {
  niftyIndexNominal: 0.11, // 11% — show market-risk caveat on UI
  ppf: 0.071, // 7.1% — verify current
  fd: 0.065, // 6.5% — verify current
  inflation: 0.06,
} as const;

// Rough annual term-premium estimate (₹) keyed by ageBand & sumAssured.
// Term is cheap — these are conservative ballpark figures. Document on UI.
export const TERM_PREMIUM_TABLE: Record<string, Record<number, number>> = {
  "25-30": { 5_000_000: 6_000, 10_000_000: 10_000, 20_000_000: 18_000 },
  "31-35": { 5_000_000: 8_000, 10_000_000: 13_000, 20_000_000: 23_000 },
  "36-40": { 5_000_000: 11_000, 10_000_000: 19_000, 20_000_000: 34_000 },
  "41-45": { 5_000_000: 17_000, 10_000_000: 29_000, 20_000_000: 52_000 },
  "46-50": { 5_000_000: 26_000, 10_000_000: 45_000, 20_000_000: 80_000 },
};

// IRDAI Guaranteed Surrender Value factor (fraction of premiums paid),
// keyed by policyYear for a typical premium-paying term. Pre/post
// 1-Oct-2024 nuance handled at call site.
// TODO(verify): confirm exact current factors per IRDAI circulars.
export const GSV_FACTORS: Record<number, number> = {
  1: 0.0,
  2: 0.3,
  3: 0.35,
  4: 0.5,
  5: 0.5,
  6: 0.5,
  7: 0.5,
  // Last two years of PPT bumped to ~0.9 — handled dynamically in surrender.ts.
};

// Surrender factor on accrued bonuses (lower than on premiums).
export const BONUS_SURRENDER_FACTOR = 0.2;
