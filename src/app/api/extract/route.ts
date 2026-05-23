// POST: PDF -> Claude -> structured PolicyInput JSON. Lands in M3.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", milestone: "M3" },
    { status: 501 },
  );
}
