import { formatMoney, formatPercent, trendOf } from "@/domain/money";
import { cn } from "@/lib/utils";

/** Plain, locale-aware amount. Renders an em dash when the value is unknown. */
export function Money({
  value,
  currency,
  locale,
  compact,
  signed,
  className,
}: {
  value: number | null | undefined;
  currency: string;
  locale: string;
  compact?: boolean;
  signed?: boolean;
  className?: string;
}) {
  if (value == null) return <span className={cn("text-fg-subtle", className)}>—</span>;
  const text = formatMoney(value, currency, locale, { compact });
  return (
    <span className={cn("tabular", className)}>
      {signed && value > 0 ? "+" : ""}
      {text}
    </span>
  );
}

/** Coloured percentage (green up, red down). */
export function Pct({ value, locale, className }: { value: number | null | undefined; locale: string; className?: string }) {
  if (value == null) return <span className={cn("text-fg-subtle", className)}>—</span>;
  const trend = trendOf(value);
  return (
    <span
      className={cn(
        "tabular",
        trend === "up" && "text-gain",
        trend === "down" && "text-loss",
        trend === "flat" && "text-fg-muted",
        className,
      )}
    >
      {formatPercent(value, locale)}
    </span>
  );
}

/** Small triangle that points the way the value moved. */
function TrendGlyph({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "flat") return <span aria-hidden className="h-0.5 w-2 rounded-full bg-current" />;
  return (
    <svg aria-hidden viewBox="0 0 8 8" className={cn("size-2", trend === "down" && "rotate-180")}>
      <path d="M4 1 7.5 7h-7z" fill="currentColor" />
    </svg>
  );
}

/** Compact signed change pill used next to prices. */
export function ChangeBadge({ value, locale }: { value: number | null | undefined; locale: string }) {
  if (value == null) return <span className="text-xs text-fg-subtle">—</span>;
  const trend = trendOf(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular",
        trend === "up" && "bg-gain-soft text-gain",
        trend === "down" && "bg-loss-soft text-loss",
        trend === "flat" && "bg-surface-muted text-fg-muted",
      )}
    >
      <TrendGlyph trend={trend} />
      {formatPercent(Math.abs(value), locale, { signed: false })}
    </span>
  );
}

/** Round avatar tinted with the asset's market colour. */
export function AssetAvatar({ symbol, market, size = "md" }: { symbol: string; market: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        `market-${market}`,
        "flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.02em]",
        "bg-[color-mix(in_oklab,var(--market,var(--fg-subtle))_13%,transparent)] text-[var(--market,var(--fg-muted))]",
        size === "md" ? "size-9 text-[10.5px]" : "size-12 text-[13px]",
      )}
    >
      {symbol.slice(0, 4)}
    </span>
  );
}

/** Market colour dot + label, e.g. in table subtitles. */
export function MarketTag({ market, label, className }: { market: string; label: string; className?: string }) {
  return (
    <span className={cn(`market-${market}`, "inline-flex items-center gap-1.5", className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-[var(--market)]" />
      {label}
    </span>
  );
}
