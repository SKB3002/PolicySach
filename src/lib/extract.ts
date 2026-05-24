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
export const MAX_PDF_CHARS = 40_000;

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
    return {
      ok: false,
      error: {
        kind: "llm_failed",
        message: e instanceof Error ? e.message : "Unknown LLM error",
      },
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
  // mergePages:true guarantees `text` is a single string.
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
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
