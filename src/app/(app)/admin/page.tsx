import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AssetForm, DeleteEventButton, EventForm, RunJobsButton } from "@/components/forms/admin-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { isoDay } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/server/auth";
import { listEvents } from "@/server/data/content";
import { listAssets } from "@/server/data/market";
import { getPageContext } from "@/server/page-context";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  await requireAdmin();
  const { supabase, locale } = await getPageContext();
  const t = await getTranslations("admin");

  const today = isoDay();
  const nextYear = isoDay(365);
  // job_runs is server-only (no RLS policy); read it with the service role after the admin check above.
  const [assets, events, { data: runs }] = await Promise.all([
    listAssets(supabase),
    listEvents(supabase, { from: today, to: nextYear }),
    createAdminClient().from("job_runs").select("*").order("started_at", { ascending: false }).limit(15),
  ]);
  const options = assets.map((a) => ({ id: a.id, symbol: a.symbol, name: a.name, market: a.market, currency: a.currency }));
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<RunJobsButton />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("addAsset")} description={t("assetsCount", { count: assets.length })} />
          <CardBody>
            <AssetForm />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("addEvent")} />
          <CardBody>
            <EventForm assets={options} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("upcomingEvents")} />
          <ul className="mt-3 divide-y divide-border border-t border-border">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-24 shrink-0 text-fg-muted tabular">{e.event_date}</span>
                <span className="font-semibold">{e.asset.symbol}</span>
                <span className="flex-1 truncate text-fg-muted">{e.title}</span>
                <DeleteEventButton id={e.id} label={`${e.asset.symbol} ${e.title}`} />
              </li>
            ))}
            {events.length === 0 ? <li className="px-5 py-6 text-center text-sm text-fg-subtle">{t("noEvents")}</li> : null}
          </ul>
        </Card>
        <Card>
          <CardHeader title={t("jobRuns")} description={t("jobRunsHint")} />
          <ul className="mt-3 divide-y divide-border border-t border-border">
            {(runs ?? []).map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-32 shrink-0 text-fg-muted tabular">{dateFmt.format(new Date(r.started_at))}</span>
                <span className="flex-1 font-semibold">{r.job}</span>
                <Badge tone={r.ok == null ? "neutral" : r.ok ? "gain" : "loss"}>
                  {r.ok == null ? t("running") : r.ok ? "OK" : t("failed")}
                </Badge>
              </li>
            ))}
            {(runs ?? []).length === 0 ? <li className="px-5 py-6 text-center text-sm text-fg-subtle">{t("noRuns")}</li> : null}
          </ul>
        </Card>
      </div>
    </>
  );
}
