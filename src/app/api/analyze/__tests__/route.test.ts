// In-process test of the /api/analyze route handler.
import { describe, it, expect } from "vitest";
import { POST } from "../route";

const validInput = {
  insurer: "LIC",
  planName: "New Endowment Plan",
  policyType: "endowment",
  sumAssured: 1_000_000,
  annualPremium: 50_000,
  premiumPayingTermYears: 20,
  policyTermYears: 20,
  startDate: "2026-05-01",
  ageAtStart: 30,
  projectedMaturityValue: 1_700_000,
  illustrationScenario: "8pct",
};

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/analyze", () => {
  it("returns 200 + a valid AnalysisResult for a well-formed PolicyInput", async () => {
    const res = await post(validInput);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.realIRR).not.toBeNull();
    expect(json.verdict).toMatch(/keep|paidup|surrender/);
    expect(json.benchmarks).toHaveLength(3);
    expect(Array.isArray(json.redFlags)).toBe(true);
    expect(typeof json.verdictReasonPlainText).toBe("string");
  });

  it("returns 422 with issue details on schema-invalid input", async () => {
    const res = await post({ insurer: "" }); // missing required fields
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe("invalid_input");
    expect(json.issues).toBeDefined();
  });

  it("returns 400 on non-JSON body", async () => {
    const res = await post("not-json-at-all");
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_json");
  });

  it("LIC endowment headline is the surrender verdict (end-to-end)", async () => {
    const res = await post(validInput);
    const json = await res.json();
    expect(json.verdict).toBe("surrender");
    expect(json.redFlags.length).toBeGreaterThan(0);
  });
});
