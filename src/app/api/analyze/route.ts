// POST: confirmed PolicyInput -> deterministic finance engine -> AnalysisResult.
// Lands in M2. The LLM is NOT in this code path (PRD §4.4).
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", milestone: "M2" },
    { status: 501 },
  );
}
