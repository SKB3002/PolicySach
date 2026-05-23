"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { AnalysisResult, PolicyInput } from "@/lib/schema";
import { ResultView } from "@/components/ResultView";

type Stored = { input: PolicyInput; result: AnalysisResult };

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [stored, setStored] = useState<Stored | null | "missing">(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`sach:result:${id}`);
      if (!raw) {
        setStored("missing");
        return;
      }
      setStored(JSON.parse(raw) as Stored);
    } catch {
      setStored("missing");
    }
  }, [id]);

  if (stored === null) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-zinc-500">Loading your analysis…</p>
      </main>
    );
  }

  if (stored === "missing") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          This result is no longer in your browser
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sach doesn&apos;t store your analysis by default. Run it again to
          see your verdict — it only takes a minute.
        </p>
        <Link
          href="/upload"
          className="self-start rounded-full bg-zinc-950 px-6 py-2.5 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Start over
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <Link
        href="/upload"
        className="self-start text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← analyse another policy
      </Link>
      <ResultView input={stored.input} result={stored.result} />
    </main>
  );
}
