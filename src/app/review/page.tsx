"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PolicyForm } from "@/components/PolicyForm";
import { Disclaimer } from "@/components/Disclaimer";
import type { ExtractedPolicy } from "@/lib/extract";

const STORAGE_KEY = "sach:extracted";

export default function ReviewPage() {
  const [initial, setInitial] = useState<
    Partial<ExtractedPolicy> | undefined | "loading"
  >("loading");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      setInitial(raw ? (JSON.parse(raw) as Partial<ExtractedPolicy>) : undefined);
    } catch {
      setInitial(undefined);
    }
  }, []);

  if (initial === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  const camePrefilled = initial && Object.keys(initial).length > 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Link
          href="/upload"
          className="self-start text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← back
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {camePrefilled ? "Confirm the details" : "Enter your policy details"}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {camePrefilled
            ? "We pre-filled what we could read from your PDF. Correct anything that's wrong, then analyse."
            : "Fill these in from your policy document or benefit illustration."}
        </p>
      </header>

      <PolicyForm initialValues={initial} />

      <Disclaimer />
    </main>
  );
}
