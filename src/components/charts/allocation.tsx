import { formatPercent } from "@/domain/money";

/** Fallback colours for groupings that are not markets (e.g. asset class). */
const FALLBACK = ["var(--m-casablanca)", "var(--m-us)", "var(--m-europe)", "var(--m-commodities)", "var(--m-crypto)", "var(--fg-subtle)"];
const MARKET_KEYS = new Set(["casablanca", "us", "europe", "commodities", "crypto"]);

export interface Slice {
  key: string;
  label: string;
  weight: number;
  valueLabel: string;
}

const colorFor = (key: string, i: number) => (MARKET_KEYS.has(key) ? `var(--m-${key})` : FALLBACK[i % FALLBACK.length]);

/** One stacked bar + an aligned legend. Easier to compare than a donut. */
export function Allocation({ slices, locale, title }: { slices: Slice[]; locale: string; title: string }) {
  return (
    <div>
      <div role="img" aria-label={title} className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full">
        {slices.map((s, i) => (
          <span
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${Math.max(s.weight * 100, 1.5)}%`, background: colorFor(s.key, i) }}
          />
        ))}
      </div>
      <ul className="mt-5 divide-y divide-border">
        {slices.map((s, i) => (
          <li key={s.key} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorFor(s.key, i) }} />
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
