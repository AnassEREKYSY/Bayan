import Link from "next/link";

import { cn } from "@/lib/utils";

export const ranges = { "1m": 30, "3m": 90, "1y": 365 } as const;
export type RangeKey = keyof typeof ranges;

export function parseRange(value: string | undefined): RangeKey {
  return value && value in ranges ? (value as RangeKey) : "3m";
}

/** Period selector rendered as links, so it works without JavaScript. */
export function RangeTabs({
  current,
  hrefFor,
  labels,
}: {
  current: RangeKey;
  hrefFor: (range: RangeKey) => string;
  labels: Record<RangeKey, string>;
}) {
  return (
    <div className="inline-flex rounded-lg bg-surface-muted p-[3px]">
      {(Object.keys(ranges) as RangeKey[]).map((r) => (
        <Link
          key={r}
          href={hrefFor(r)}
          scroll={false}
          aria-current={r === current ? "true" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors",
            r === current
              ? "bg-surface text-fg shadow-[0_1px_2px_rgb(23_32_58/0.08),inset_0_0_0_1px_var(--border)]"
              : "text-fg-muted hover:text-fg",
          )}
        >
          {labels[r]}
        </Link>
      ))}
    </div>
  );
}
