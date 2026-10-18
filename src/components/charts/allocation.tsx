import { formatPercent } from "@/domain/money";

/** Ordered palette that stays distinguishable in both themes. */
const COLORS = ["var(--primary)", "var(--accent)", "#5b8a72", "#8b6f9c", "#c26d4f", "#6b7f99", "#a39274"];

export interface Slice {
  key: string;
  label: string;
  weight: number;
  valueLabel: string;
}

/** Donut + legend for allocation by market or asset class. */
export function Allocation({ slices, locale, title }: { slices: Slice[]; locale: string; title: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offsets = slices.map((_, i) => slices.slice(0, i).reduce((sum, s) => sum + s.weight * c, 0));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <svg viewBox="0 0 100 100" className="size-36 shrink-0 -rotate-90" role="img" aria-label={title}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-muted)" strokeWidth="14" />
        {slices.map((s, i) => {
          const len = s.weight * c;
          return (
            <circle
              key={s.key}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="14"
              strokeDasharray={`${Math.max(0, len - 0.8)} ${c}`}
              strokeDashoffset={-(offsets[i] ?? 0)}
            />
          );
        })}
      </svg>
      <ul className="w-full space-y-2.5">
        {slices.map((s, i) => (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="flex-1 truncate text-fg">{s.label}</span>
            <span className="text-fg-muted tabular">{s.valueLabel}</span>
            <span className="w-16 text-right font-semibold text-fg tabular">
              {formatPercent(s.weight, locale, { signed: false })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
