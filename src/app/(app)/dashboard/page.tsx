import { ArrowRight, CalendarDays, ChartCandlestick, Info, Newspaper, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Allocation } from "@/components/charts/allocation";
import { LineChart } from "@/components/charts/line-chart";
import { AssetAvatar, ChangeBadge, Money, Pct } from "@/components/finance/display";
import { parseRange, RangeTabs, ranges } from "@/components/finance/range-tabs";
import { PortfolioSwitcher } from "@/components/forms/portfolio-switcher";
import { TransactionDialog } from "@/components/forms/transaction-dialog";
import { NewsList } from "@/components/news/news-list";
import { EventList } from "@/components/news/event-list";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { allocation } from "@/domain/portfolio";
import { formatMoney } from "@/domain/money";
import { isoDay } from "@/lib/dates";
import { routes } from "@/lib/routes";
import { listEvents, listNews, listWatchlistIds } from "@/server/data/content";
import { buildPortfolioView, buildValueHistory, listTransactions } from "@/server/data/portfolio";
import { firstParam, getPortfolioContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("dashboard") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const range = parseRange(firstParam(sp.range));
  const ctx = await getPortfolioContext(firstParam(sp.p));
  const { supabase, profile, locale, base, portfolio } = ctx;
  const t = await getTranslations("dashboard");
  const tEnum = await getTranslations("enums");

  const transactions = portfolio ? await listTransactions(supabase, { portfolioId: portfolio.id }) : [];
  const firstName = profile.display_name?.split(" ")[0];
  const greeting = firstName ? t("greetingName", { name: firstName }) : t("greeting");

  const header = (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-fg-muted">{greeting}</p>
        <h1 className="font-display text-[28px] leading-tight font-medium">{t("title")}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PortfolioSwitcher portfolios={ctx.portfolios} currentId={portfolio?.id} />
        <TransactionDialog assets={ctx.assetOptions} portfolios={ctx.portfolios} defaultPortfolioId={portfolio?.id} />
      </div>
    </div>
  );

  if (transactions.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<Wallet />}
            title={t("emptyTitle")}
            description={t("emptyText")}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <TransactionDialog assets={ctx.assetOptions} portfolios={ctx.portfolios} defaultPortfolioId={portfolio?.id} />
                <Button variant="secondary" asChild>
                  <Link href={routes.markets}>
                    <ChartCandlestick />
                    {t("exploreMarkets")}
                  </Link>
                </Button>
              </div>
            }
          />
        </Card>
      </>
    );
  }

  const heldIds = [...new Set(transactions.map((x) => x.asset_id))];
  const today = isoDay();
  const in30 = isoDay(30);

  const [view, history, news, watchIds] = await Promise.all([
    buildPortfolioView(supabase, transactions, base),
    buildValueHistory(supabase, transactions, base, ranges[range]),
    listNews(supabase, { assetIds: heldIds, limit: 4 }),
    listWatchlistIds(supabase),
  ]);
  const events = await listEvents(supabase, { from: today, to: in30, assetIds: [...new Set([...heldIds, ...watchIds])] });

  const { summary, positions } = view;
  const open = positions.filter((p) => p.quantity > 0);
  const movers = [...open]
    .filter((p) => p.dayChangePct != null)
    .sort((a, b) => Math.abs(b.dayChangePct!) - Math.abs(a.dayChangePct!))
    .slice(0, 5);
  const byMarket = allocation(open, (p) => p.asset.market).map((s) => ({
    key: s.key,
    label: tEnum(`market.${s.key}` as never),
    weight: s.weight,
    valueLabel: formatMoney(s.value, base, locale, { compact: true }),
  }));
  const chartData = history.filter((h) => h.value > 0).map((h) => ({ date: h.date, value: h.value }));
  const hrefFor = (r: string) => `${routes.dashboard}?${new URLSearchParams({ ...(portfolio ? { p: portfolio.id } : {}), range: r })}`;

  return (
    <>
      {header}

      <section aria-label={t("overview")} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-fg-muted">{t("totalValue")}</p>
                <p className="mt-1 font-display text-[40px] leading-none font-medium tracking-tight tabular">
                  <Money value={summary.marketValue} currency={base} locale={locale} />
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm">
                  <Money value={summary.dayChange} currency={base} locale={locale} signed className={summary.dayChange >= 0 ? "text-gain" : "text-loss"} />
                  <ChangeBadge value={summary.dayChangePct} locale={locale} />
                  <span className="text-fg-subtle">{t("today")}</span>
                </p>
              </div>
              <RangeTabs current={range} hrefFor={hrefFor} labels={{ "1m": t("range.1m"), "3m": t("range.3m"), "1y": t("range.1y") }} />
            </div>
            <div className="mt-5">
              {chartData.length > 1 ? (
                <LineChart data={chartData} currency={base} ariaLabel={t("chartLabel")} height={200} />
              ) : (
                <p className="flex h-[200px] items-center justify-center rounded-md bg-surface-muted text-center text-sm text-fg-subtle">
                  {t("chartEmpty")}
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Stat label={t("unrealized")}>
            <Money value={summary.unrealizedPnl} currency={base} locale={locale} signed className={summary.unrealizedPnl >= 0 ? "text-gain" : "text-loss"} />
            <Pct value={summary.unrealizedPct} locale={locale} className="text-sm" />
          </Stat>
          <Stat label={t("invested")}>
            <Money value={summary.costBasis} currency={base} locale={locale} />
            <span className="text-sm text-fg-subtle">{t("positions", { count: summary.positionsCount })}</span>
          </Stat>
          <Stat label={t("income")}>
            <Money value={summary.dividends} currency={base} locale={locale} />
            <span className="text-sm text-fg-subtle">
              {t("realized")} <Money value={summary.realizedPnl} currency={base} locale={locale} signed />
            </span>
          </Stat>
        </div>
      </section>

      {summary.missingPrices > 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm text-fg">
          <Info className="size-4 shrink-0 text-accent" />
          {t("missingPrices", { count: summary.missingPrices })}
        </p>
      ) : null}

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("allocation")} description={t("allocationHint")} />
          <CardBody>
            {byMarket.length ? <Allocation slices={byMarket} locale={locale} title={t("allocation")} /> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t("movers")}
            description={t("moversHint")}
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={routes.portfolio}>
                  {t("seeAll")} <ArrowRight />
                </Link>
              </Button>
            }
          />
          <ul className="divide-y divide-border px-5 pb-2">
            {movers.map((p) => (
              <li key={p.assetId}>
                <Link href={routes.asset(p.assetId)} className="flex items-center gap-3 py-3 hover:opacity-80">
                  <AssetAvatar symbol={p.asset.symbol} market={p.asset.market} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.asset.name}</p>
                    <p className="text-xs text-fg-subtle">{p.asset.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      <Money value={p.price} currency={p.asset.currency} locale={locale} />
                    </p>
                    <ChangeBadge value={p.dayChangePct} locale={locale} />
                  </div>
                </Link>
              </li>
            ))}
            {movers.length === 0 ? <li className="py-6 text-center text-sm text-fg-subtle">{t("noMovers")}</li> : null}
          </ul>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title={t("news")}
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={routes.news}>
                  {t("seeAll")} <ArrowRight />
                </Link>
              </Button>
            }
          />
          <CardBody className="pt-3">
            {news.length ? (
              <NewsList items={news} locale={locale} compact />
            ) : (
              <EmptyState icon={<Newspaper />} title={t("noNews")} className="py-6" />
            )}
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title={t("upcoming")}
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={routes.calendar}>
                  {t("seeAll")} <ArrowRight />
                </Link>
              </Button>
            }
          />
          <CardBody className="pt-3">
            {events.length ? (
              <EventList events={events.slice(0, 5)} locale={locale} />
            ) : (
              <EmptyState icon={<CalendarDays />} title={t("noEvents")} className="py-6" />
            )}
          </CardBody>
        </Card>
      </section>

      <p className="mt-6 text-xs text-fg-subtle">
        {view.pricesAsOf ? t("asOf", { date: new Date(view.pricesAsOf) }) : null} {t("disclaimer")}
      </p>
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1 py-4">
        <p className="text-sm text-fg-muted">{label}</p>
        <div className="flex flex-wrap items-baseline gap-x-2 text-xl font-semibold">{children}</div>
      </CardBody>
    </Card>
  );
}
