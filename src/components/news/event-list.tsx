import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/misc";
import { formatMoney } from "@/domain/money";
import { routes } from "@/lib/routes";
import type { CorporateEvent } from "@/server/data/content";

const toneOf = { dividend: "gain", agm: "primary", earnings: "accent", split: "neutral", other: "neutral" } as const;

export async function EventList({ events, locale }: { events: CorporateEvent[]; locale: string }) {
  const t = await getTranslations("enums.eventType");
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });

  return (
    <ul className="flex flex-col gap-3">
      {events.map((e) => {
        const date = new Date(`${e.event_date}T00:00:00Z`);
        return (
          <li key={e.id} className="flex items-start gap-3">
            <div className="flex w-11 shrink-0 flex-col items-center rounded-md border border-border bg-surface-muted py-1">
              <span className="text-base leading-5 font-bold tabular">{day.format(date)}</span>
              <span className="text-[10px] font-semibold text-fg-muted uppercase">{month.format(date)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={routes.asset(e.asset.id)} className="text-sm font-semibold hover:text-primary">
                  {e.asset.symbol}
                </Link>
                <Badge tone={toneOf[e.type]}>{t(e.type)}</Badge>
              </div>
              <p className="truncate text-sm text-fg-muted">{e.title}</p>
              {e.amount != null && e.currency ? (
                <p className="text-xs font-semibold text-fg tabular">{formatMoney(Number(e.amount), e.currency, locale)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
