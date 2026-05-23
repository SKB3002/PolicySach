// Formatting helpers used across UI. Indian number format (₹X,XX,XXX).

export const formatINR = (n: number, opts: { compact?: boolean } = {}) => {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n);
  if (opts.compact) {
    const abs = Math.abs(rounded);
    if (abs >= 1_00_00_000) return `₹${(rounded / 1_00_00_000).toFixed(2)} Cr`;
    if (abs >= 1_00_000) return `₹${(rounded / 1_00_000).toFixed(2)} L`;
    if (abs >= 1_000) return `₹${(rounded / 1_000).toFixed(1)} K`;
  }
  return `₹${rounded.toLocaleString("en-IN")}`;
};

export const formatPercent = (r: number | null, digits = 1) =>
  r === null || !Number.isFinite(r) ? "—" : `${(r * 100).toFixed(digits)}%`;
