"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

const STORAGE_KEY = "sach:extracted";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("That doesn't look like a PDF. Try again or enter details manually.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("PDF is larger than 8 MB. Try a smaller file or enter details manually.");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          body.message ?? `Extraction failed (HTTP ${res.status}).`;
        setError(`${msg} You can still enter the details manually.`);
        return;
      }
      const extracted = await res.json();
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(extracted));
      router.push("/review");
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="self-start text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← back
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Upload your policy
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          We&apos;ll read your benefit-illustration PDF and let you confirm
          the details before running the analysis. Your PDF is processed in
          memory and never stored.
        </p>
      </header>

      <label
        htmlFor="pdf-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
          dragOver
            ? "border-zinc-950 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900"
            : "border-zinc-300 bg-white hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500"
        } ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          {isPending
            ? "Reading your policy…"
            : "Drop your policy PDF here, or tap to choose"}
        </span>
        <span className="text-xs text-zinc-500">
          PDF up to 8 MB · processed in memory, never stored
        </span>
        <input
          ref={inputRef}
          id="pdf-input"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      {error && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span>or</span>
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <Link
        href="/review"
        className="flex h-12 items-center justify-center self-start rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-900 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-500"
        onClick={() => sessionStorage.removeItem(STORAGE_KEY)}
      >
        Enter details manually
      </Link>

      <Disclaimer />
    </main>
  );
}
