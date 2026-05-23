import { z } from "zod";

// Zod schemas mirroring PRD §4.3. Shared client + server.

export const PolicyTypeSchema = z.enum([
  "endowment",
  "moneyback",
  "wholelife",
  "ulip",
  "term",
]);
export type PolicyType = z.infer<typeof PolicyTypeSchema>;

export const IllustrationScenarioSchema = z.enum([
  "4pct",
  "8pct",
  "guaranteed",
  "entered",
]);
export type IllustrationScenario = z.infer<typeof IllustrationScenarioSchema>;

export const PolicyInputSchema = z.object({
  insurer: z.string().min(1),
  planName: z.string().min(1),
  policyType: PolicyTypeSchema,
  sumAssured: z.number().nonnegative(),
  annualPremium: z.number().nonnegative(),
  premiumPayingTermYears: z.number().int().positive(),
  policyTermYears: z.number().int().positive(),
  startDate: z.string(), // ISO
  ageAtStart: z.number().int().positive(),
  projectedMaturityValue: z.number().nonnegative().optional(),
  illustrationScenario: IllustrationScenarioSchema.optional(),
  currentFundValue: z.number().nonnegative().optional(), // ULIP
  intermediatePayouts: z
    .array(z.object({ year: z.number().int(), amount: z.number() }))
    .optional(), // money-back
  surrenderValueQuoted: z.number().nonnegative().optional(),
  annualIncome: z.number().nonnegative().optional(),
});
export type PolicyInput = z.infer<typeof PolicyInputSchema>;

export const BenchmarkResultSchema = z.object({
  label: z.string(),
  rate: z.number(),
  futureValue: z.number(),
  gapVsPolicy: z.number(),
});
export type BenchmarkResult = z.infer<typeof BenchmarkResultSchema>;

export const SurrenderResultSchema = z.object({
  gsv: z.number(),
  ssv: z.number(),
  payable: z.number(),
  paidUpValue: z.number(),
});
export type SurrenderResult = z.infer<typeof SurrenderResultSchema>;

export const VerdictSchema = z.enum(["keep", "paidup", "surrender"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const AnalysisResultSchema = z.object({
  realIRR: z.number().nullable(),
  continuationIRR: z.number().nullable(),
  benchmarks: z.array(BenchmarkResultSchema),
  surrender: SurrenderResultSchema,
  verdict: VerdictSchema,
  verdictReasonPlainText: z.string(),
  redFlags: z.array(z.string()),
  assumptionsUsed: z.record(z.string(), z.number()),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
