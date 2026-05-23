import type { Verdict } from "@/lib/schema";

const STYLES: Record<
  Verdict,
  { label: string; bg: string; text: string; ring: string }
> = {
  keep: {
    label: "Keep",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-900 dark:text-emerald-300",
    ring: "ring-emerald-600/20 dark:ring-emerald-400/30",
  },
  paidup: {
    label: "Make Paid-Up",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-900 dark:text-amber-300",
    ring: "ring-amber-600/20 dark:ring-amber-400/30",
  },
  surrender: {
    label: "Surrender & Reinvest",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-900 dark:text-rose-300",
    ring: "ring-rose-600/20 dark:ring-rose-400/30",
  },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = STYLES[verdict];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}
    >
      {s.label}
    </span>
  );
}
