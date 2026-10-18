"use client";

import { useLocale } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";

import { formatMoney, formatNumber } from "@/domain/money";
import { cn } from "@/lib/utils";

export interface LinePoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  /** Currency of the values; omit for plain numbers. */
  currency?: string;
  height?: number;
  className?: string;
  ariaLabel: string;
}

const W = 720;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

/**
 * Lightweight responsive line chart (no chart library): area + line, a
 * hover/touch crosshair with the value, and min/max guides.
 */
export function LineChart({ data, currency, height = 220, className, ariaLabel }: LineChartProps) {
  const locale = useLocale();
  const formatValue = (v: number) => (currency ? formatMoney(v, currency, locale) : formatNumber(v, locale));
  const dateFormatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const formatDate = (d: string) => dateFormatter.format(new Date(`${d}T00:00:00Z`));
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (data.length < 2) return null;
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || Math.abs(max) || 1;
    const lo = min - span * 0.08;
    const hi = max + span * 0.08;
    const innerH = height - PAD_TOP - PAD_BOTTOM;
    const x = (i: number) => (i / (data.length - 1)) * W;
    const y = (v: number) => PAD_TOP + (1 - (v - lo) / (hi - lo)) * innerH;
    const points = data.map((d, i) => [x(i), y(d.value)] as const);
    const line = points.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
    const area = `${line}L${W},${height - PAD_BOTTOM}L0,${height - PAD_BOTTOM}Z`;
    const rising = data[data.length - 1]!.value >= data[0]!.value;
    return { points, line, area, rising, min, max };
  }, [data, height]);

  if (!geometry) {
    return <div className={cn("flex items-center justify-center text-sm text-fg-subtle", className)} style={{ height }} />;
  }

  const color = "var(--primary-line)";
  const active = hover != null ? data[hover] : data[data.length - 1];
  const activePoint = hover != null ? geometry.points[hover] : null;

  const onMove = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  return (
    <figure className={cn("relative", className)} aria-label={ariaLabel}>
      <div className="mb-2 flex h-5 items-baseline justify-between gap-3 text-[13px]">
        <span className="font-semibold text-fg tabular">{hover != null && active ? formatValue(active.value) : ""}</span>
        <span className="text-fg-subtle">{hover != null && active ? formatDate(active.date) : ""}</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="w-full touch-none select-none"
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={PAD_TOP + f * (height - PAD_TOP - PAD_BOTTOM)}
            y2={PAD_TOP + f * (height - PAD_TOP - PAD_BOTTOM)}
            stroke="var(--border)"
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line x1="0" x2={W} y1={height - PAD_BOTTOM} y2={height - PAD_BOTTOM} stroke="var(--border)" vectorEffect="non-scaling-stroke" />
        <path d={geometry.area} fill={`url(#${gradientId})`} />
        <path d={geometry.line} fill="none" stroke={color} strokeWidth="2.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {activePoint ? (
          <>
            <line
              x1={activePoint[0]}
              x2={activePoint[0]}
              y1={PAD_TOP}
              y2={height - PAD_BOTTOM}
              stroke="var(--border-strong)"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
      </svg>
      {activePoint ? (
        <span
          aria-hidden
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-[var(--primary-line)] shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary-line)_22%,transparent)]"
          style={{ left: `${(activePoint[0] / W) * 100}%`, top: `calc(${activePoint[1]}px + 28px)` }}
        />
      ) : null}
      <div className="mt-1 flex justify-between text-xs text-fg-subtle">
        <span>{formatDate(data[0]!.date)}</span>
        <span>{formatDate(data[data.length - 1]!.date)}</span>
      </div>
    </figure>
  );
}
