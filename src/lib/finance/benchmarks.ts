// "Buy term + invest the difference" alternative future-value calculator.
// PRD §3.2. Wealth gap = alternativeFV − insurerProjectedMaturityValue.

import { BENCHMARK_RATES, TERM_PREMIUM_TABLE } from "./assumptions";
import type { BenchmarkResult } from "../schema";

export function estimateTermPremium(
  ageAtStart: number,
  sumAssured: number,
): number {
  const band =
    ageAtStart <= 30
      ? "25-30"
      : ageAtStart <= 35
        ? "31-35"
        : ageAtStart <= 40
          ? "36-40"
          : ageAtStart <= 45
            ? "41-45"
            : "46-50";
  const tiers = TERM_PREMIUM_TABLE[band];
  const tierKeys = Object.keys(tiers)
    .map(Number)
    .sort((a, b) => a - b);
  // Pick the closest tier ≥ sumAssured, else the highest available.
  const chosen = tierKeys.find((k) => k >= sumAssured) ?? tierKeys.at(-1)!;
  return tiers[chosen];
}

export type BenchmarkInput = {
  annualPremium: number;
  premiumPayingTermYears: number;
  policyTermYears: number;
  ageAtStart: number;
  sumAssured: number;
  insurerProjectedMaturityValue: number;
};

function futureValueOfAnnuity(
  annualInvestable: number,
  rate: number,
  ppt: number,
  policyTerm: number,
): number {
  // Each year's contribution grows to maturity.
  let fv = 0;
  for (let year = 1; year <= ppt; year++) {
    const yearsToMaturity = policyTerm - year + 1;
    fv += annualInvestable * Math.pow(1 + rate, yearsToMaturity);
  }
  return fv;
}

export function benchmarks(input: BenchmarkInput): BenchmarkResult[] {
  const termPremium = estimateTermPremium(input.ageAtStart, input.sumAssured);
  const investable = Math.max(0, input.annualPremium - termPremium);

  const compute = (label: string, rate: number): BenchmarkResult => {
    const futureValue = futureValueOfAnnuity(
      investable,
      rate,
      input.premiumPayingTermYears,
      input.policyTermYears,
    );
    return {
      label,
      rate,
      futureValue,
      gapVsPolicy: futureValue - input.insurerProjectedMaturityValue,
    };
  };

  return [
    compute("Term + Nifty 50 index fund", BENCHMARK_RATES.niftyIndexNominal),
    compute("Term + PPF", BENCHMARK_RATES.ppf),
    compute("Bank FD", BENCHMARK_RATES.fd),
  ];
}
