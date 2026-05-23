// Public surface of the deterministic finance engine.
// The LLM never imports from here to compute — it only phrases results
// after these functions have run. PRD §4.4.

export { irr, type Cashflow } from "./irr";
export { surrenderValue, type SurrenderInput } from "./surrender";
export { benchmarks, estimateTermPremium, type BenchmarkInput } from "./benchmarks";
export {
  decideVerdict,
  buildRedFlags,
  emptyAnalysisShape,
  type VerdictInput,
} from "./verdict";
export {
  BENCHMARK_RATES,
  TERM_PREMIUM_TABLE,
  GSV_FACTORS,
  GSV_LAST_TWO_YEARS_PPT,
  BONUS_SURRENDER_FACTOR,
  SSV_DISCOUNT_RATE_CEILING,
  ssvSurrenderValueFactor,
} from "./assumptions";
export { gsvFactor } from "./surrender";
export {
  analyzePolicy,
  buildPolicyCashflows,
  computePolicyYear,
  type AnalyzeOptions,
} from "./analyze";
