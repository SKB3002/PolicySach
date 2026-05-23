import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-3">
          <span className="text-sm font-medium tracking-widest text-zinc-500 uppercase">
            Sach · सच
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
            Find out what your insurance policy is{" "}
            <span className="italic">really</span> paying you.
          </h1>
          <p className="text-lg leading-7 text-zinc-600 dark:text-zinc-400">
            Free, in 60 seconds — by your insurer&apos;s own numbers. We
            don&apos;t sell insurance. We never see your bank account.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/upload"
            className="flex h-12 items-center justify-center rounded-full bg-zinc-950 px-8 text-base font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Check my policy
          </Link>
        </div>

        <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          Sach provides educational analysis and calculators based on
          information you provide. It is not investment or insurance advice and
          Sach is not an IRDAI-registered intermediary.
        </footer>
      </main>
    </div>
  );
}
