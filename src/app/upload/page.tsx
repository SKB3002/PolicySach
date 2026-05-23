import Link from "next/link";
import { PolicyForm } from "@/components/PolicyForm";
import { Disclaimer } from "@/components/Disclaimer";

export default function UploadPage() {
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
          Tell us about your policy
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fill these in from your policy document or benefit illustration. PDF
          upload arrives in the next release — for now, this takes about 90
          seconds.
        </p>
      </header>

      <PolicyForm />

      <Disclaimer />
    </main>
  );
}
