// Keep / Paid-up / Surrender decision. PRD §2.5 + §3.4.
// Stub: real comparison logic lands in M1. Keep the shape stable so
// downstream UI can wire to it now.

import type { AnalysisResult, Verdict } from "../schema";

export type VerdictInput = {
  realIRR: number | null;
  continuationIRR: number | null;
  maturityValueIfKept: number;
  exitValueAtMaturity: number;
};

export function decideVerdict(input: VerdictInput): Verdict {
  const { realIRR, continuationIRR, maturityValueIfKept, exitValueAtMaturity } =
    input;

  // Forward-looking math dominates: sunk premiums are sunk.
  if (continuationIRR !== null && continuationIRR < 0.05) {
    return exitValueAtMaturity > maturityValueIfKept ? "surrender" : "paidup";
  }
  if (realIRR !== null && realIRR < 0.06) {
    return exitValueAtMaturity > maturityValueIfKept * 1.1
      ? "surrender"
      : "paidup";
  }
  return "keep";
}

export function buildRedFlags(args: {
  realIRR: number | null;
  fdRate: number;
  inflation: number;
  policyType: string;
  annualPremium: number;
  annualIncome?: number;
}): string[] {
  const flags: string[] = [];
  if (args.realIRR !== null && args.realIRR < args.fdRate) {
    flags.push(
      `Headline return (${(args.realIRR * 100).toFixed(1)}%) is below the current FD rate (${(args.fdRate * 100).toFixed(1)}%) — an FD would beat this.`,
    );
  }
  if (args.realIRR !== null && args.realIRR < args.inflation) {
    flags.push(
      `Real return is below inflation (~${(args.inflation * 100).toFixed(0)}%) — this plan is losing purchasing power.`,
    );
  }
  if (
    args.annualIncome &&
    args.annualPremium / args.annualIncome > 0.1
  ) {
    flags.push(
      `Premium is more than 10% of your stated annual income — common over-allocation red flag.`,
    );
  }
  return flags;
}

// Placeholder until M1 wires the full pipeline.
export function emptyAnalysisShape(): Partial<AnalysisResult> {
  return {
    realIRR: null,
    continuationIRR: null,
    benchmarks: [],
    redFlags: [],
    verdictReasonPlainText: "",
  };
}
