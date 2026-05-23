// Editable review screen — lands in M3. PRD §5.3.
export default function ReviewPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Review extracted fields
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Pre-filled by Claude, confirmed by you — lands in M3.
        </p>
      </div>
    </main>
  );
}
