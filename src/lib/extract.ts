// Provider-agnostic policy extractor.
// Pipeline: PDF buffer -> text (unpdf) -> structured JSON (LLM) -> Partial<PolicyInput>.
//
// PRD §4.4 constraint: the LLM is allowed ONLY to extract document fields.
// It MUST NOT compute IRR, surrender value, verdict, or any number the user
// relies on. Those are computed deterministically in lib/finance/.
//
// Provider: Groq (Llama 3.3 70B versatile, JSON mode, low temperature).
// Swap by editing this single file — the rest of the app talks to
// extractPolicyFromPdfBuffer() and doesn't care which model produced the JSON.

import Groq from "groq-sdk";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { IllustrationScenarioSchema, PolicyTypeSchema } from "./schema";

export const EXTRACTION_MODEL = "llama-3.3-70b-versatile";
// Groq free tier caps Llama 3.3 70B at 12k tokens/minute. Indian insurance
// PDFs are token-heavy (number-dense tables, mixed-script content), so
// ~2.5 chars/token is a safer planning ratio than the usual ~4. 18k chars
// → ~6-7k tokens, leaves headroom for system prompt (~800 tok) + framing
// while staying well under the 12k TPM limit.
export const MAX_PDF_CHARS = 18_000;

// Keywords used to score which PDF pages are relevant to extraction. Pages
// rich in these terms (the illustration table, premium schedule, plan
// summary) score highest; T&C boilerplate scores near zero and gets dropped
// when we're over budget.
const RELEVANCE_KEYWORDS = [
  "sum assured",
  "sum insured",
  "premium",
  "policy term",
  "premium paying",
  "maturity",
  "benefit illustration",
  "guaranteed",
  "bonus",
  "projected",
  "fund value",
  "nav",
  "survival benefit",
  "money back",
  "@4%",
  "@8%",
  "@ 4%",
  "@ 8%",
  "lakhs",
  "lakh",
];

// Tolerant intermediate schema — most fields may be null when the LLM
// cannot confidently determine them. The user completes missing fields
// on the editable review screen before final analysis.
export const ExtractedPolicySchema = z.object({
  insurer: z.string().nullable(),
  planName: z.string().nullable(),
  policyType: PolicyTypeSchema.nullable(),
  sumAssured: z.number().nonnegative().nullable(),
  annualPremium: z.number().nonnegative().nullable(),
  premiumPayingTermYears: z.number().int().positive().nullable(),
  policyTermYears: z.number().int().positive().nullable(),
  startDate: z.string().nullable(), // ISO YYYY-MM-DD
  ageAtStart: z.number().int().positive().nullable(),
  projectedMaturityValue: z.number().nonnegative().nullable(),
  illustrationScenario: IllustrationScenarioSchema.nullable(),
});
export type ExtractedPolicy = z.infer<typeof ExtractedPolicySchema>;

const SYSTEM_PROMPT = `You are a strict policy-document extractor for Indian life-insurance policies. You receive the text of a policy document or benefit illustration and return ONLY valid JSON matching the schema below.

Rules:
1. If a field cannot be confidently determined from the text, set it to null. NEVER invent or guess.
2. All money amounts are in INR (rupees). Convert "₹10,00,000" or "Rs. 10 Lakhs" or "10,00,000" → 1000000 (plain number).
3. Dates: ISO format "YYYY-MM-DD". If only month is known, use the first of that month. If unknown, null.
4. policyType must be one of: "endowment", "moneyback", "wholelife", "ulip", "term". Match the plan description:
   - Endowment / "with profits" / "savings + insurance" → "endowment"
   - Money-back / "survival benefits" at intervals → "moneyback"
   - Whole-life / "Jeevan Umang" style → "wholelife"
   - ULIP / "unit-linked" / fund-NAV based → "ulip"
   - Pure term / no maturity payout → "term"
5. annualPremium: yearly premium EXCLUDING GST/taxes and rider premiums. If the doc shows quarterly/monthly, multiply.
6. premiumPayingTermYears: how many years the policyholder pays premium.
7. policyTermYears: total policy duration to maturity.
8. projectedMaturityValue: if illustration shows multiple scenarios (e.g. @4% and @8%), prefer the @8% (or higher) figure and set illustrationScenario accordingly. Use only what the insurer wrote; do not extrapolate.
9. Output ONLY a JSON object. No prose, no markdown fences, no commentary.

Schema:
{
  "insurer": string | null,
  "planName": string | null,
  "policyType": "endowment" | "moneyback" | "wholelife" | "ulip" | "term" | null,
  "sumAssured": number | null,
  "annualPremium": number | null,
  "premiumPayingTermYears": number | null,
  "policyTermYears": number | null,
  "startDate": string | null,
  "ageAtStart": number | null,
  "projectedMaturityValue": number | null,
  "illustrationScenario": "4pct" | "8pct" | "guaranteed" | "entered" | null
}`;

export type ExtractionError =
  | { kind: "no_text"; message: string }
  | { kind: "llm_failed"; message: string }
  | { kind: "invalid_json"; message: string; raw?: string }
  | { kind: "schema_failed"; message: string; raw?: unknown };

export type ExtractionResult =
  | { ok: true; data: ExtractedPolicy; meta: { pages: number; chars: number } }
  | { ok: false; error: ExtractionError };

// ─── Public surface ─────────────────────────────────────────────────────────

export async function extractPolicyFromPdfBuffer(
  buffer: ArrayBuffer | Uint8Array,
): Promise<ExtractionResult> {
  const text = await pdfToText(buffer);
  if (!text.trim()) {
    return {
      ok: false,
      error: {
        kind: "no_text",
        message:
          "Couldn't read any text from this PDF. It's likely a scanned image — please enter the details manually.",
      },
    };
  }
  return extractPolicyFromText(text);
}

export async function extractPolicyFromText(
  rawText: string,
  client: ChatClient = defaultClient(),
): Promise<ExtractionResult> {
  const text = rawText.slice(0, MAX_PDF_CHARS);

  let raw: string;
  try {
    raw = await client.complete({
      system: SYSTEM_PROMPT,
      user: `Policy document text:\n\n${text}\n\nReturn JSON.`,
    });
  } catch (e) {
    const rawMsg = e instanceof Error ? e.message : "Unknown LLM error";
    // Detect token-budget / rate-limit errors and surface a friendly
    // message instead of leaking the provider's billing pitch.
    const friendly = /rate.?limit|too\s+large|tokens? per minute|tpm/i.test(
      rawMsg,
    )
      ? "Your PDF is too dense for our free-tier extractor right now. Try a shorter PDF, or fill in the details manually below."
      : /timeout|timed?\s*out/i.test(rawMsg)
        ? "Reading your PDF took too long. Try again, or enter details manually."
        : rawMsg;
    return {
      ok: false,
      error: { kind: "llm_failed", message: friendly },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: {
        kind: "invalid_json",
        message: "Model returned non-JSON output.",
        raw,
      },
    };
  }

  const validated = ExtractedPolicySchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: {
        kind: "schema_failed",
        message: validated.error.issues
          .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
          .join("; "),
        raw: parsed,
      },
    };
  }

  return {
    ok: true,
    data: validated.data,
    meta: { pages: 0, chars: text.length },
  };
}

// ─── PDF -> text ────────────────────────────────────────────────────────────

async function pdfToText(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const pdf = await getDocumentProxy(bytes);
  // Per-page so we can score each page's relevance to extraction.
  // mergePages:false returns text as string[].
  const { text } = await extractText(pdf, { mergePages: false });
  const pages: string[] = Array.isArray(text) ? text : [text];
  return selectRelevantPages(pages, MAX_PDF_CHARS);
}

/**
 * Pick the most-relevant pages within a char budget. Pages rich in
 * benefit-illustration keywords come first; pure-boilerplate T&C pages
 * are dropped. Returns the kept pages joined in their original document
 * order (preserves context for the LLM).
 */
export function selectRelevantPages(pages: string[], budget: number): string {
  if (pages.length === 0) return "";
  const totalChars = pages.reduce((s, p) => s + p.length, 0);
  if (totalChars <= budget) return pages.join("\n\n");

  const scored = pages.map((text, idx) => ({
    idx,
    text,
    score: scorePage(text),
  }));
  // Highest score first; ties broken by earlier-page-wins.
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

  let used = 0;
  const kept: typeof scored = [];
  for (const p of scored) {
    if (used + p.text.length > budget) {
      // If we have nothing yet, accept a truncated version of this page.
      if (kept.length === 0) {
        kept.push({ ...p, text: p.text.slice(0, budget) });
        break;
      }
      continue;
    }
    kept.push(p);
    used += p.text.length;
  }
  // Restore document order so the LLM sees natural flow.
  kept.sort((a, b) => a.idx - b.idx);
  return kept.map((p) => p.text).join("\n\n");
}

function scorePage(text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of RELEVANCE_KEYWORDS) {
    // Count occurrences; cheaper than regex for short keyword lists.
    let pos = 0;
    while ((pos = lower.indexOf(kw, pos)) !== -1) {
      score += kw.length >= 6 ? 2 : 1; // longer phrases weighted higher
      pos += kw.length;
    }
  }
  // Bonus for ₹/Rs. mentions — illustration tables are number-dense.
  const rsHits = (lower.match(/\brs[\.\s]/g) ?? []).length;
  const inrHits = (text.match(/₹/g) ?? []).length;
  return score + rsHits + inrHits;
}

// ─── Chat-client adapter (lets us swap providers / mock in tests) ───────────

export interface ChatClient {
  complete(args: { system: string; user: string }): Promise<string>;
}

let _groqClient: Groq | null = null;
function getGroq(): Groq {
  if (!_groqClient) {
    _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groqClient;
}

function defaultClient(): ChatClient {
  return {
    async complete({ system, user }) {
      const groq = getGroq();
      const completion = await groq.chat.completions.create({
        model: EXTRACTION_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_completion_tokens: 800,
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("Empty LLM response");
      return content;
    },
  };
}
