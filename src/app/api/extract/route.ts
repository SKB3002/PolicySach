// POST: PDF (multipart/form-data 'file' field) -> ExtractedPolicy JSON.
// Pipeline lives in lib/extract.ts. This route is the I/O boundary only.
import { NextResponse } from "next/server";
import { extractPolicyFromPdfBuffer } from "@/lib/extract";

export const runtime = "nodejs";
// PDFs can be a few MB; bump body limit + give the LLM time to respond.
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      {
        error: "no_extractor_key",
        message:
          "PDF extraction is not configured on this deployment. Use the manual-entry form for now.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_form", message: "Expected multipart/form-data body." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "no_file", message: "Form is missing a 'file' field." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: "too_large",
        message: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; max is ${MAX_BYTES / 1024 / 1024} MB.`,
      },
      { status: 413 },
    );
  }
  if (file.type && !file.type.includes("pdf")) {
    return NextResponse.json(
      {
        error: "wrong_type",
        message: `Expected a PDF — got "${file.type}".`,
      },
      { status: 415 },
    );
  }

  const buffer = await file.arrayBuffer();
  const result = await extractPolicyFromPdfBuffer(buffer);
  if (!result.ok) {
    const status =
      result.error.kind === "no_text"
        ? 422
        : result.error.kind === "invalid_json" ||
            result.error.kind === "schema_failed"
          ? 502
          : 500;
    return NextResponse.json(
      { error: result.error.kind, message: result.error.message },
      { status },
    );
  }

  // Per PRD §6 — we do NOT persist the uploaded PDF. The buffer goes out of
  // scope when this handler returns. We return only the extracted fields.
  return NextResponse.json(result.data, { status: 200 });
}
