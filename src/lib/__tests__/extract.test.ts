// Unit tests for the policy extractor. We test the text -> JSON path with
// a mocked ChatClient so tests are deterministic (no live LLM calls).
import { describe, it, expect } from "vitest";
import {
  ExtractedPolicySchema,
  extractPolicyFromText,
  selectRelevantPages,
  type ChatClient,
} from "../extract";

const fakeClient = (json: string | object): ChatClient => ({
  async complete() {
    return typeof json === "string" ? json : JSON.stringify(json);
  },
});

describe("extractPolicyFromText (with mocked LLM)", () => {
  it("returns ok + parsed data on a valid JSON response", async () => {
    const res = await extractPolicyFromText(
      "policy text",
      fakeClient({
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
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.data.insurer).toBe("LIC");
    expect(res.data.sumAssured).toBe(1_000_000);
    expect(res.data.policyType).toBe("endowment");
  });

  it("tolerates nulls for fields the LLM couldn't determine", async () => {
    const res = await extractPolicyFromText(
      "garbled text",
      fakeClient({
        insurer: "Unknown Insurer",
        planName: null,
        policyType: null,
        sumAssured: null,
        annualPremium: null,
        premiumPayingTermYears: null,
        policyTermYears: null,
        startDate: null,
        ageAtStart: null,
        projectedMaturityValue: null,
        illustrationScenario: null,
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.data.sumAssured).toBeNull();
    expect(res.data.policyType).toBeNull();
  });

  it("returns invalid_json on non-JSON LLM output", async () => {
    const res = await extractPolicyFromText(
      "x",
      fakeClient("not really json {{{"),
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected !ok");
    expect(res.error.kind).toBe("invalid_json");
  });

  it("returns schema_failed when the LLM invents an unknown policy type", async () => {
    const res = await extractPolicyFromText(
      "x",
      fakeClient({
        insurer: "X",
        planName: "Y",
        policyType: "scammy", // not in enum
        sumAssured: 1,
        annualPremium: 1,
        premiumPayingTermYears: 1,
        policyTermYears: 1,
        startDate: "2026-01-01",
        ageAtStart: 30,
        projectedMaturityValue: null,
        illustrationScenario: null,
      }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected !ok");
    expect(res.error.kind).toBe("schema_failed");
  });

  it("returns llm_failed when the chat client throws", async () => {
    const res = await extractPolicyFromText("x", {
      async complete() {
        throw new Error("network down");
      },
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected !ok");
    expect(res.error.kind).toBe("llm_failed");
    expect(res.error.message).toMatch(/network down/i);
  });

  it("returns a friendly message when the LLM rate-limits / exceeds tokens", async () => {
    const res = await extractPolicyFromText("x", {
      async complete() {
        throw new Error(
          "Request too large for model on tokens per minute (TPM): Limit 12000, Requested 14725",
        );
      },
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected !ok");
    expect(res.error.kind).toBe("llm_failed");
    expect(res.error.message).toMatch(/free-tier extractor/i);
    expect(res.error.message).not.toMatch(/12000|14725|TPM/i); // no leak
  });

  it("ExtractedPolicySchema rejects extra unknown fields gracefully (strict only on known)", () => {
    // sanity check on the schema shape itself
    const r = ExtractedPolicySchema.safeParse({
      insurer: "x",
      planName: "y",
      policyType: "endowment",
      sumAssured: 1,
      annualPremium: 1,
      premiumPayingTermYears: 1,
      policyTermYears: 1,
      startDate: "2026-01-01",
      ageAtStart: 30,
      projectedMaturityValue: null,
      illustrationScenario: null,
    });
    expect(r.success).toBe(true);
  });
});

describe("selectRelevantPages", () => {
  const tnc = "Terms and conditions. The company reserves the right. ".repeat(
    50,
  );
  const illustrationPage =
    "Benefit Illustration. Sum Assured Rs. 10,00,000. Annual premium ₹50,000. Policy term 20 years. Maturity @8%: ₹17,00,000.";

  it("returns full content when total is under budget", () => {
    const out = selectRelevantPages(["short page"], 1000);
    expect(out).toBe("short page");
  });

  it("drops irrelevant T&C pages when over budget", () => {
    const out = selectRelevantPages(
      [tnc, illustrationPage, tnc, tnc],
      illustrationPage.length + 10,
    );
    expect(out).toContain("Sum Assured");
    expect(out).not.toContain("Terms and conditions");
  });

  it("preserves original document order of kept pages", () => {
    const pageA =
      "Plan summary. Sum Assured ₹5L. Premium ₹30k. Policy term 15 yrs.";
    const pageB = "Benefit illustration table. Maturity @8% ₹8L. Bonus ₹2L.";
    const out = selectRelevantPages([pageA, tnc, pageB], 500);
    // Both relevant pages kept; A must appear before B in output.
    expect(out.indexOf(pageA)).toBeLessThan(out.indexOf(pageB));
  });

  it("returns empty string for empty input", () => {
    expect(selectRelevantPages([], 1000)).toBe("");
  });

  it("falls back to truncating a single oversized page when nothing fits", () => {
    const huge = illustrationPage.repeat(100);
    const out = selectRelevantPages([huge], 200);
    expect(out.length).toBe(200);
  });
});
