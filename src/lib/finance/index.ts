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
  BONUS_SURRENDER_FACTOR,
} from "./assumptions";
