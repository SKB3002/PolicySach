// End-to-end orchestrator: PolicyInput -> AnalysisResult.
// This is what /api/analyze calls. The LLM never enters this function —
// it only phrases the resulting numbers (PRD §4.4).

import { irr, type Cashflow } from "./irr";
import { surrenderValue } from "./surrender";
import { benchmarks, estimateTermPremium } from "./benchmarks";
import { decideVerdict, buildRedFlags } from "./verdict";
import { BENCHMARK_RATES } from "./assumptions";
import type { AnalysisResult, PolicyInput } from "../schema";

export type AnalyzeOptions = {
  /** Override "today" for deterministic tests. */
  now?: Date;
};

export function analyzePolicy(
  input: PolicyInput,
  opts: AnalyzeOptions = {},
): AnalysisResult {
  const now = opts.now ?? new Date();
  const currentPolicyYear = computePolicyYear(input.startDate, now);

  // ── 1. Build full-life cashflows ──────────────────────────────────────────
  const fullFlows = buildPolicyCashflows(input);

  // ── 2. Real IRR (full life, ignoring when the policy was bought) ──────────
  const realIRR = irr(fullFlows);

  // ── 3. Forward-looking continuation IRR (sunk past premiums excluded) ─────
  const futureFlows = fullFlows.filter(
    (cf) => cf.year >= currentPolicyYear,
  );
  // Re-base time so year 0 = today, otherwise IRR represents wrong horizon.
  const rebasedFutureFlows: Cashflow[] = futureFlows.map((cf) => ({
    year: cf.year - currentPolicyYear,
    amount: cf.amount,
  }));
  const continuationIRR =
    rebasedFutureFlows.some((cf) => cf.amount > 0) &&
    rebasedFutureFlows.some((cf) => cf.amount < 0)
      ? irr(rebasedFutureFlows)
      : null;

  // ── 4. Surrender / paid-up snapshot (at "now") ────────────────────────────
  const surrender = surrenderValue({
    policyYear: Math.max(1, currentPolicyYear),
    annualPremium: input.annualPremium,
    premiumPayingTermYears: input.premiumPayingTermYears,
    policyTermYears: input.policyTermYears,
    sumAssured: input.sumAssured,
  });

  // ── 5. Wealth-gap benchmarks (term + index / PPF / FD) ────────────────────
  const projectedMaturity = input.projectedMaturityValue ?? 0;
  const benchmarkResults = benchmarks({
    annualPremium: input.annualPremium,
    premiumPayingTermYears: input.premiumPayingTermYears,
    policyTermYears: input.policyTermYears,
    ageAtStart: input.ageAtStart,
    sumAssured: input.sumAssured,
    insurerProjectedMaturityValue: projectedMaturity,
  });

  // ── 6. Decision: exit vs keep at maturity (forward-looking) ───────────────
  const yearsRemaining = Math.max(0, input.policyTermYears - currentPolicyYear);
  const termPremium = estimateTermPremium(input.ageAtStart, input.sumAssured);
  const investableIfExit = Math.max(0, input.annualPremium - termPremium);
  // Exit value = surrender invested at index rate + future investable invested.
  const exitValueAtMaturity =
    surrender.payable * Math.pow(1 + BENCHMARK_RATES.niftyIndexNominal, yearsRemaining) +
    futureValueOfRemainingInvestable(
      investableIfExit,
      BENCHMARK_RATES.niftyIndexNominal,
      Math.min(yearsRemaining, input.premiumPayingTermYears - currentPolicyYear),
      yearsRemaining,
    );
  const maturityValueIfKept = projectedMaturity;

  const verdict = decideVerdict({
    realIRR,
    continuationIRR,
    maturityValueIfKept,
    exitValueAtMaturity,
  });

  // ── 7. Red flags (rule-based; PRD §2.6) ──────────────────────────────────
  const redFlags = buildRedFlags({
    realIRR,
    fdRate: BENCHMARK_RATES.fd,
    inflation: BENCHMARK_RATES.inflation,
    policyType: input.policyType,
    annualPremium: input.annualPremium,
    annualIncome: input.annualIncome,
  });

  // ── 8. Templated plain-language verdict (LLM may rewrite later) ───────────
  const verdictReasonPlainText = templatedVerdictText({
    verdict,
    realIRR,
    continuationIRR,
    maturityValueIfKept,
    exitValueAtMaturity,
  });

  return {
    realIRR,
    continuationIRR,
    benchmarks: benchmarkResults,
    surrender,
    verdict,
    verdictReasonPlainText,
    redFlags,
    assumptionsUsed: {
      niftyIndexNominal: BENCHMARK_RATES.niftyIndexNominal,
      ppf: BENCHMARK_RATES.ppf,
      fd: BENCHMARK_RATES.fd,
      inflation: BENCHMARK_RATES.inflation,
      estimatedAnnualTermPremium: termPremium,
      currentPolicyYear,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function buildPolicyCashflows(input: PolicyInput): Cashflow[] {
  const flows: Cashflow[] = [];
  // Premium outflows at the start of each PPT year.
  for (let y = 0; y < input.premiumPayingTermYears; y++) {
    flows.push({ year: y, amount: -input.annualPremium });
  }
  // Money-back / survival benefits at their stated years.
  for (const p of input.intermediatePayouts ?? []) {
    flows.push({ year: p.year, amount: p.amount });
  }
  // Maturity inflow at end of policy term.
  if (input.projectedMaturityValue && input.projectedMaturityValue > 0) {
    flows.push({
      year: input.policyTermYears,
      amount: input.projectedMaturityValue,
    });
  }
  return flows;
}

export function computePolicyYear(startDateIso: string, now: Date): number {
  const start = new Date(startDateIso);
  const ms = now.getTime() - start.getTime();
  const years = ms / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.floor(years));
}

function futureValueOfRemainingInvestable(
  annual: number,
  rate: number,
  yearsContributing: number,
  yearsToMaturity: number,
): number {
  if (annual <= 0 || yearsContributing <= 0) return 0;
  let fv = 0;
  for (let y = 1; y <= yearsContributing; y++) {
    const yearsCompounding = yearsToMaturity - y + 1;
    fv += annual * Math.pow(1 + rate, yearsCompounding);
  }
  return fv;
}

function templatedVerdictText(args: {
  verdict: "keep" | "paidup" | "surrender";
  realIRR: number | null;
  continuationIRR: number | null;
  maturityValueIfKept: number;
  exitValueAtMaturity: number;
}): string {
  const pct = (r: number | null) =>
    r === null ? "—" : `${(r * 100).toFixed(1)}%`;
  const inr = (n: number) =>
    `₹${Math.round(n).toLocaleString("en-IN")}`;
  const gap = args.exitValueAtMaturity - args.maturityValueIfKept;

  switch (args.verdict) {
    case "keep":
      return `By the insurer's own projection, your policy returns ${pct(args.realIRR)}. Switching to a term + index alternative doesn't comfortably beat keeping the policy here.`;
    case "paidup":
      return `Forward-looking return on future premiums is only ${pct(args.continuationIRR)}. Stopping premiums (paid-up) and redirecting them elsewhere is likely better than continuing — but surrendering doesn't clearly beat keeping the paid-up cover.`;
    case "surrender":
      return `Forward-looking return is ${pct(args.continuationIRR)}. Surrendering and reinvesting (with a separate term plan for cover) projects to ${inr(args.exitValueAtMaturity)} by maturity — about ${inr(Math.abs(gap))} more than keeping the policy (${inr(args.maturityValueIfKept)}).`;
  }
}
