// IRR via bisection — robust, no clever Newton fallback needed.
// PRD §3.1. Returns null if cashflows have no sign change (degenerate).

export type Cashflow = { year: number; amount: number };

const npv = (rate: number, flows: Cashflow[]): number =>
  flows.reduce((s, cf) => s + cf.amount / Math.pow(1 + rate, cf.year), 0);

export function irr(
  cashflows: Cashflow[],
  { lo = -0.9, hi = 1.0, tol = 1e-6, maxIter = 200 } = {},
): number | null {
  // Need at least one positive and one negative flow.
  const hasPos = cashflows.some((cf) => cf.amount > 0);
  const hasNeg = cashflows.some((cf) => cf.amount < 0);
  if (!hasPos || !hasNeg) return null;

  let fLo = npv(lo, cashflows);
  let fHi = npv(hi, cashflows);
  if (fLo * fHi > 0) return null; // no bracketed root

  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, cashflows);
    if (Math.abs(fMid) < tol || (hi - lo) / 2 < tol) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}
