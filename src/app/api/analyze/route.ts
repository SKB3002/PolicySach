// POST: confirmed PolicyInput -> deterministic finance engine -> AnalysisResult.
// The LLM is NOT in this code path (PRD §4.4).
import { NextResponse } from "next/server";
import { z } from "zod";
import { PolicyInputSchema } from "@/lib/schema";
import { analyzePolicy } from "@/lib/finance";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = PolicyInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: "PolicyInput failed validation.",
        issues: z.treeifyError(parsed.error),
      },
      { status: 422 },
    );
  }

  try {
    const result = analyzePolicy(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json(
      { error: "analysis_failed", message },
      { status: 500 },
    );
  }
}
