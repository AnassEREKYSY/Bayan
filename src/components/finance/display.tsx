import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

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

/** Compact pill used next to prices. */
export function ChangeBadge({ value, locale }: { value: number | null | undefined; locale: string }) {
  if (value == null) return <span className="text-xs text-fg-subtle">—</span>;
  const trend = trendOf(value);
  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-xs font-semibold tabular",
        trend === "up" && "bg-gain-soft text-gain",
        trend === "down" && "bg-loss-soft text-loss",
        trend === "flat" && "bg-surface-muted text-fg-muted",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {formatPercent(Math.abs(value), locale, { signed: false })}
    </span>
  );
}

/** Small coloured square showing the asset market, used in lists. */
export function AssetAvatar({ symbol, market }: { symbol: string; market: string }) {
  const tone: Record<string, string> = {
    casablanca: "bg-primary-soft text-primary",
    us: "bg-surface-muted text-fg",
    europe: "bg-surface-muted text-fg",
    crypto: "bg-accent-soft text-accent",
    commodities: "bg-accent-soft text-accent",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md text-[11px] font-bold tracking-tight",
        tone[market] ?? "bg-surface-muted text-fg",
      )}
    >
      {symbol.slice(0, 4)}
    </span>
  );
}
