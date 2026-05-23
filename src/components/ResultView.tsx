"use client";

import { useState } from "react";
import type { AnalysisResult, PolicyInput } from "@/lib/schema";
import { formatINR, formatPercent } from "@/lib/format";
import { VerdictBadge } from "./VerdictBadge";
import { Disclaimer } from "./Disclaimer";

export function ResultView({
  input,
  result,
}: {
  input: PolicyInput;
  result: AnalysisResult;
}) {
  const headlineIRR = result.realIRR;
  const bestAlt = [...result.benchmarks].sort(
    (a, b) => b.gapVsPolicy - a.gapVsPolicy,
  )[0];

  return (
    <div className="flex flex-col gap-8">
      {/* ── Headline ────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            {input.insurer} · {input.planName}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
            Your real return is{" "}
            <span className="tabular-nums">{formatPercent(headlineIRR)}</span>
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            By {input.insurer}&apos;s own projection over{" "}
            {input.policyTermYears} years.
          </p>
        </div>
        <div>
          <VerdictBadge verdict={result.verdict} />
        </div>
        <p className="text-base leading-7 text-zinc-700 dark:text-zinc-300">
          {result.verdictReasonPlainText}
        </p>
      </header>

      {/* ── Wealth-gap benchmarks ───────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          What the same money would do elsewhere
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Same annual outflow, same horizon, after carving out a separate
          term-insurance premium for cover.
        </p>
        <div className="flex flex-col gap-3">
          {result.benchmarks.map((b) => (
            <BenchmarkRow
              key={b.label}
              label={b.label}
              rate={b.rate}
              futureValue={b.futureValue}
              gap={b.gapVsPolicy}
              policyValue={input.projectedMaturityValue ?? 0}
              maxFV={Math.max(
                ...result.benchmarks.map((x) => x.futureValue),
                input.projectedMaturityValue ?? 0,
              )}
            />
          ))}
          <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <BenchmarkRow
              label={`${input.insurer} ${input.planName} (this policy)`}
              rate={headlineIRR ?? 0}
              futureValue={input.projectedMaturityValue ?? 0}
              gap={0}
              policyValue={input.projectedMaturityValue ?? 0}
              maxFV={Math.max(
                ...result.benchmarks.map((x) => x.futureValue),
                input.projectedMaturityValue ?? 0,
              )}
              muted
            />
          </div>
        </div>
        {bestAlt && bestAlt.gapVsPolicy > 0 && (
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Gap vs the best alternative: {formatINR(bestAlt.gapVsPolicy, { compact: true })}.
          </p>
        )}
      </section>

      {/* ── Surrender / paid-up ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          If you stop today
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Estimates per IRDAI norms — confirm exact figures with{" "}
          {input.insurer}.
        </p>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Surrender payable" value={formatINR(result.surrender.payable, { compact: true })} emphasized />
          <Stat label="Guaranteed (GSV)" value={formatINR(result.surrender.gsv, { compact: true })} />
          <Stat label="Special (SSV)" value={formatINR(result.surrender.ssv, { compact: true })} />
          <Stat label="Paid-up value" value={formatINR(result.surrender.paidUpValue, { compact: true })} />
        </dl>
      </section>

      {/* ── Red flags ───────────────────────────────────────────────────── */}
      {result.redFlags.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950/30">
          <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-300">
            Red flags
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-rose-900 dark:text-rose-200">
            {result.redFlags.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>⚠</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Assumptions used (expandable) ───────────────────────────────── */}
      <AssumptionsAccordion data={result.assumptionsUsed} />

      <Disclaimer variant="inline" />
    </div>
  );
}

function BenchmarkRow({
  label,
  rate,
  futureValue,
  gap,
  policyValue: _policyValue,
  maxFV,
  muted,
}: {
  label: string;
  rate: number;
  futureValue: number;
  gap: number;
  policyValue: number;
  maxFV: number;
  muted?: boolean;
}) {
  const widthPct = maxFV > 0 ? Math.max(2, (futureValue / maxFV) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-sm font-medium ${muted ? "text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
          {label}{" "}
          <span className="font-normal text-zinc-500">
            @ {formatPercent(rate, 1)}
          </span>
        </span>
        <span className={`text-sm tabular-nums ${muted ? "text-zinc-500" : "font-semibold text-zinc-950 dark:text-zinc-50"}`}>
          {formatINR(futureValue, { compact: true })}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <div
          className={`h-full ${muted ? "bg-zinc-400 dark:bg-zinc-700" : "bg-emerald-500 dark:bg-emerald-400"}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {!muted && gap > 0 && (
        <span className="text-xs text-zinc-500">
          +{formatINR(gap, { compact: true })} vs this policy
        </span>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-zinc-500 dark:text-zinc-500">{label}</dt>
      <dd
        className={`tabular-nums ${emphasized ? "text-lg font-semibold text-zinc-950 dark:text-zinc-50" : "text-base text-zinc-800 dark:text-zinc-200"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function AssumptionsAccordion({ data }: { data: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const labels: Record<string, string> = {
    niftyIndexNominal: "Nifty 50 nominal return",
    ppf: "PPF rate",
    fd: "FD rate",
    inflation: "Inflation anchor",
    estimatedAnnualTermPremium: "Assumed annual term-premium (₹)",
    currentPolicyYear: "Current policy year",
  };
  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Assumptions used in this analysis
        </span>
        <span className="text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <dl className="grid grid-cols-2 gap-3 border-t border-zinc-200 px-5 py-4 text-sm dark:border-zinc-800">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-xs text-zinc-500">{labels[k] ?? k}</dt>
              <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">
                {/^(niftyIndexNominal|ppf|fd|inflation)$/.test(k)
                  ? formatPercent(v, 2)
                  : k === "estimatedAnnualTermPremium"
                    ? formatINR(v)
                    : v}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
