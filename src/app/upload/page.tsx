// M3 will wire this to /api/extract. M0 stub.
export default function UploadPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Upload your policy
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          PDF upload + manual-entry path land in M3 / M2.
        </p>
      </div>
    </main>
  );
}
