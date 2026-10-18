import { Bell, BellRing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AlertDialog } from "@/components/forms/alert-dialog";
import { AlertRowControls, MarkAllRead } from "@/components/forms/alert-controls";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatMoney, formatNumber } from "@/domain/money";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { listAlertRules, listNotifications } from "@/server/data/content";
import { listAssets } from "@/server/data/market";
import { getPageContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("alerts") };
}

export default async function AlertsPage() {
  const { supabase, locale } = await getPageContext();
  const t = await getTranslations("alerts");
  const tType = await getTranslations("enums.alertType");
  const tKind = await getTranslations("alerts.kind");

  const [rules, notifications, assets] = await Promise.all([
    listAlertRules(supabase),
    listNotifications(supabase),
    listAssets(supabase),
  ]);
  const options = assets.map((a) => ({ id: a.id, symbol: a.symbol, name: a.name, market: a.market, currency: a.currency }));
  const unread = notifications.filter((n) => !n.read_at).length;
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<AlertDialog assets={options} />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("rules")} description={t("rulesHint")} />
          {rules.length ? (
            <ul className="mt-3 divide-y divide-border border-t border-border">
              {rules.map((r) => {
                const label = `${r.asset.symbol}, ${tType(r.type)}`;
                const threshold =
                  r.type === "daily_move"
                    ? `± ${formatNumber(Number(r.threshold), locale)} %`
                    : formatMoney(Number(r.threshold), r.asset.currency, locale);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={routes.asset(r.asset_id)} className="text-sm font-semibold hover:text-primary">
                        {r.asset.symbol} <span className="font-normal text-fg-muted">{r.asset.name}</span>
                      </Link>
                      <p className="text-xs text-fg-subtle">
                        {tType(r.type)} <span className="font-semibold text-fg-muted tabular">{threshold}</span>
                      </p>
                    </div>
                    <AlertRowControls id={r.id} active={r.is_active} label={label} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<Bell />} title={t("noRules")} description={t("noRulesHint")} />
          )}
        </Card>

        <Card>
          <CardHeader title={t("notifications")} description={t("notificationsHint", { count: unread })} action={unread ? <MarkAllRead /> : null} />
          {notifications.length ? (
            <ul className="mt-3 divide-y divide-border border-t border-border">
              {notifications.map((n) => (
                <li key={n.id} className="flex gap-3 px-5 py-3">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", n.read_at ? "text-fg-muted" : "font-semibold text-fg")}>
                      {n.asset_id ? (
                        <Link href={routes.asset(n.asset_id)} className="hover:text-primary">
                          {n.title}
                        </Link>
                      ) : (
                        n.title
                      )}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      <span className="font-medium text-fg-muted">{tKind(n.kind)}</span>
                      <span className="ml-3">{dateFmt.format(new Date(n.created_at))}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<BellRing />} title={t("noNotifications")} />
          )}
        </Card>
      </div>
    </>
  );
}
