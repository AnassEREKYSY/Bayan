import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EventList } from "@/components/news/event-list";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { isoDay } from "@/lib/dates";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { listEvents, listWatchlistIds, type CorporateEvent } from "@/server/data/content";
import { firstParam, getPageContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("calendar") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CalendarPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const scope = firstParam(sp.scope) === "all" ? "all" : "mine";
  const { supabase, locale } = await getPageContext();
  const t = await getTranslations("calendar");

  const from = isoDay();
  const to = isoDay(180);

  let assetIds: string[] | undefined;
  if (scope === "mine") {
    const [{ data: txAssets }, watchIds] = await Promise.all([
      supabase.from("transactions").select("asset_id"),
      listWatchlistIds(supabase),
    ]);
    assetIds = [...new Set([...(txAssets ?? []).map((r) => r.asset_id), ...watchIds])];
  }
  const events = await listEvents(supabase, { from, to, assetIds });

  const monthFmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const byMonth = new Map<string, CorporateEvent[]>();
  for (const e of events) {
    const key = e.event_date.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  }

  const tab = (value: "mine" | "all") => (
    <Link
      href={`${routes.calendar}?scope=${value}`}
      aria-current={scope === value ? "true" : undefined}
      className={cn(
        "rounded-[5px] px-3 py-1.5 text-sm font-semibold",
        scope === value ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg",
      )}
    >
      {t(value)}
    </Link>
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<div className="inline-flex rounded-md bg-surface-muted p-0.5">{tab("mine")}{tab("all")}</div>} />
      {events.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...byMonth.entries()].map(([month, list]) => (
            <Card key={month}>
              <CardBody>
                <h2 className="mb-4 text-sm font-semibold text-fg-muted capitalize">
                  {monthFmt.format(new Date(`${month}-01T00:00:00Z`))}
                </h2>
                <EventList events={list} locale={locale} />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<CalendarDays />} title={t("emptyTitle")} description={t("emptyText")} />
        </Card>
      )}
    </>
  );
}
