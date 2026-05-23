// Persistent IRDAI disclaimer. Required on result + footer (PRD §6).
export function Disclaimer({ variant = "footer" }: { variant?: "footer" | "inline" }) {
  const base =
    "text-xs leading-5 text-zinc-500 dark:text-zinc-500";
  const inline =
    "rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950";
  return (
    <p className={variant === "inline" ? `${base} ${inline}` : base}>
      <strong className="text-zinc-700 dark:text-zinc-400">Disclaimer:</strong>{" "}
      Sach provides educational analysis and calculators based on information
      you provide. It is not investment or insurance advice and Sach is not an
      IRDAI-registered intermediary. Confirm exact figures with your insurer.
      Consider a SEBI-registered fee-only adviser for personal advice.
    </p>
  );
}
