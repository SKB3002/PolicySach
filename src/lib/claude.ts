// Anthropic client + extraction prompt. Stub for M3.
// Constraints (PRD §4.4):
//   - LLM ONLY extracts PolicyInput JSON or phrases plain-language text.
//   - Static system prompt — must be served with prompt caching.
//   - Never used to compute IRR / surrender / verdict.

import Anthropic from "@anthropic-ai/sdk";

export const EXTRACTION_MODEL = "claude-haiku-4-5";

let _client: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// TODO(M3): implement extractPolicyFromPDF(pdfBuffer) -> PolicyInput JSON
// with structured output + zod validation + prompt caching on the system block.
