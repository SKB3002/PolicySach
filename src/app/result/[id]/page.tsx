// Verdict screen — lands in M2. PRD §5.4.
export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Verdict
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Result id: <code>{id}</code> — full verdict screen lands in M2.
        </p>
      </div>
    </main>
  );
}
