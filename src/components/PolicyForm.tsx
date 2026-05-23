"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PolicyInputSchema,
  type PolicyInput,
  type AnalysisResult,
} from "@/lib/schema";

type FormState = {
  insurer: string;
  planName: string;
  policyType: PolicyInput["policyType"];
  sumAssured: string;
  annualPremium: string;
  premiumPayingTermYears: string;
  policyTermYears: string;
  startDate: string;
  ageAtStart: string;
  projectedMaturityValue: string;
  illustrationScenario: PolicyInput["illustrationScenario"] | "";
  currentFundValue: string;
  annualIncome: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const DEFAULTS: FormState = {
  insurer: "",
  planName: "",
  policyType: "endowment",
  sumAssured: "",
  annualPremium: "",
  premiumPayingTermYears: "",
  policyTermYears: "",
  startDate: today(),
  ageAtStart: "",
  projectedMaturityValue: "",
  illustrationScenario: "8pct",
  currentFundValue: "",
  annualIncome: "",
};

export function PolicyForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const num = (s: string) => (s === "" ? undefined : Number(s));
    const candidate: Record<string, unknown> = {
      insurer: form.insurer.trim(),
      planName: form.planName.trim(),
      policyType: form.policyType,
      sumAssured: num(form.sumAssured),
      annualPremium: num(form.annualPremium),
      premiumPayingTermYears: num(form.premiumPayingTermYears),
      policyTermYears: num(form.policyTermYears),
      startDate: form.startDate,
      ageAtStart: num(form.ageAtStart),
    };
    if (form.projectedMaturityValue !== "")
      candidate.projectedMaturityValue = num(form.projectedMaturityValue);
    if (form.illustrationScenario)
      candidate.illustrationScenario = form.illustrationScenario;
    if (form.policyType === "ulip" && form.currentFundValue !== "")
      candidate.currentFundValue = num(form.currentFundValue);
    if (form.annualIncome !== "")
      candidate.annualIncome = num(form.annualIncome);

    const parsed = PolicyInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      setError(
        issues
          .map((i) => `${i.path.join(".") || "form"}: ${i.message}`)
          .join(" · "),
      );
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? `Analysis failed (HTTP ${res.status}).`);
        return;
      }
      const result = (await res.json()) as AnalysisResult;
      const id = makeResultId(parsed.data);
      sessionStorage.setItem(
        `sach:result:${id}`,
        JSON.stringify({ input: parsed.data, result }),
      );
      router.push(`/result/${id}`);
    });
  };

  const showFund = form.policyType === "ulip";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Row>
        <Field label="Insurer" hint="e.g. LIC, HDFC Life, ICICI Pru">
          <Input
            value={form.insurer}
            onChange={(v) => set("insurer", v)}
            placeholder="LIC"
            required
          />
        </Field>
        <Field label="Plan name" hint="As printed on your policy document">
          <Input
            value={form.planName}
            onChange={(v) => set("planName", v)}
            placeholder="New Endowment Plan"
            required
          />
        </Field>
      </Row>

      <Row>
        <Field label="Policy type">
          <select
            value={form.policyType}
            onChange={(e) =>
              set("policyType", e.target.value as PolicyInput["policyType"])
            }
            className={selectCls}
          >
            <option value="endowment">Endowment</option>
            <option value="moneyback">Money-back</option>
            <option value="wholelife">Whole life</option>
            <option value="ulip">ULIP</option>
            <option value="term">Term (protection check only)</option>
          </select>
        </Field>
        <Field label="Sum assured (₹)" hint="Cover amount; e.g. 10,00,000">
          <Input
            type="number"
            value={form.sumAssured}
            onChange={(v) => set("sumAssured", v)}
            placeholder="1000000"
            required
          />
        </Field>
      </Row>

      <Row>
        <Field label="Annual premium (₹)" hint="Yearly amount you pay">
          <Input
            type="number"
            value={form.annualPremium}
            onChange={(v) => set("annualPremium", v)}
            placeholder="50000"
            required
          />
        </Field>
        <Field
          label="Premium-paying term (years)"
          hint="How many years you pay premiums"
        >
          <Input
            type="number"
            value={form.premiumPayingTermYears}
            onChange={(v) => set("premiumPayingTermYears", v)}
            placeholder="20"
            required
          />
        </Field>
      </Row>

      <Row>
        <Field
          label="Policy term (years)"
          hint="Total policy duration to maturity"
        >
          <Input
            type="number"
            value={form.policyTermYears}
            onChange={(v) => set("policyTermYears", v)}
            placeholder="20"
            required
          />
        </Field>
        <Field
          label="Age when policy started"
          hint="Your age on the policy start date"
        >
          <Input
            type="number"
            value={form.ageAtStart}
            onChange={(v) => set("ageAtStart", v)}
            placeholder="30"
            required
          />
        </Field>
      </Row>

      <Field label="Policy start date">
        <Input
          type="date"
          value={form.startDate}
          onChange={(v) => set("startDate", v)}
          required
        />
      </Field>

      <div className="rounded-xl border-2 border-zinc-950 bg-zinc-50 p-5 dark:border-zinc-50 dark:bg-zinc-900">
        <div className="mb-3 flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Most important field
          </span>
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Projected maturity value (₹)
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            From the benefit-illustration table in your policy document. If
            multiple scenarios are shown (e.g. 4% and 8%), use the lower one to
            be honest with yourself.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              type="number"
              value={form.projectedMaturityValue}
              onChange={(v) => set("projectedMaturityValue", v)}
              placeholder="1700000"
            />
          </div>
          <select
            value={form.illustrationScenario}
            onChange={(e) =>
              set(
                "illustrationScenario",
                e.target.value as PolicyInput["illustrationScenario"] | "",
              )
            }
            className={`${selectCls} sm:w-44`}
          >
            <option value="guaranteed">Guaranteed</option>
            <option value="4pct">@ 4% scenario</option>
            <option value="8pct">@ 8% scenario</option>
            <option value="entered">My own estimate</option>
          </select>
        </div>
      </div>

      {showFund && (
        <Field
          label="Current fund value (₹)"
          hint="ULIP: today's NAV × units, from your latest statement"
        >
          <Input
            type="number"
            value={form.currentFundValue}
            onChange={(v) => set("currentFundValue", v)}
            placeholder="600000"
          />
        </Field>
      )}

      <Field
        label="Annual income (optional, ₹)"
        hint="If you share this, we can flag if your premium is too large a share of income"
      >
        <Input
          type="number"
          value={form.annualIncome}
          onChange={(v) => set("annualIncome", v)}
          placeholder="800000"
        />
      </Field>

      {error && (
        <p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-12 items-center justify-center rounded-full bg-zinc-950 px-8 text-base font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isPending ? "Analysing…" : "Analyse my policy"}
      </button>
    </form>
  );
}

// ─── tiny field primitives ─────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/20";

const selectCls = `${inputCls} appearance-none pr-8`;

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs text-zinc-500 dark:text-zinc-500">{hint}</span>
      )}
    </label>
  );
}

function Input({
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      inputMode={type === "number" ? "numeric" : undefined}
      className={inputCls}
    />
  );
}

// Stable-ish id from the input — used for sessionStorage key + URL slug.
function makeResultId(input: PolicyInput): string {
  const seed = `${input.insurer}|${input.planName}|${input.annualPremium}|${input.policyTermYears}|${Date.now()}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36) + "-" + Date.now().toString(36).slice(-4);
}
