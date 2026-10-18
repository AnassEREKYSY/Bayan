import { CalendarDays, Newspaper, Plus } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LineChart } from "@/components/charts/line-chart";
import { AssetAvatar, ChangeBadge, Money, Pct } from "@/components/finance/display";
import { parseRange, RangeTabs, ranges } from "@/components/finance/range-tabs";
import { AlertDialog } from "@/components/forms/alert-dialog";
import { TransactionDialog } from "@/components/forms/transaction-dialog";
import { WatchButton } from "@/components/forms/watch-button";
import { EventList } from "@/components/news/event-list";
import { NewsList } from "@/components/news/news-list";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { formatQuantity } from "@/domain/money";
import { valuePortfolio } from "@/domain/portfolio";
import { isoDay } from "@/lib/dates";
import { routes } from "@/lib/routes";
import { idSchema } from "@/lib/validation";
import { listEvents, listNews, listWatchlistIds } from "@/server/data/content";
import { getAsset, getFx, getPriceHistory, toAssetInfo } from "@/server/data/market";
import { listPortfolios, listTransactions, toTransactionInput } from "@/server/data/portfolio";
import { firstParam, getPageContext } from "@/server/page-context";

type Params = Promise<{ id: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  if (!idSchema.safeParse({ id }).success) return {};
  const { supabase } = await getPageContext();
  const asset = await getAsset(supabase, id);
  return { title: asset ? `${asset.symbol} · ${asset.name}` : undefined };
}

export default async function AssetPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { id } = await params;
  if (!idSchema.safeParse({ id }).success) notFound();
  const sp = await searchParams;
  const range = parseRange(firstParam(sp.range));

  const { supabase, locale } = await getPageContext();
  const asset = await getAsset(supabase, id);
  if (!asset) notFound();

  const t = await getTranslations("asset");
  const tEnum = await getTranslations("enums");
  const from = isoDay(-ranges[range]);
  const today = isoDay();
  const inSixMonths = isoDay(180);

  const [history, transactions, news, events, watchIds, portfolios, { fx }] = await Promise.all([
    getPriceHistory(supabase, [id], from),
    listTransactions(supabase, { assetId: id }),
    listNews(supabase, { assetIds: [id], limit: 10 }),
    listEvents(supabase, { from: today, to: inSixMonths, assetIds: [id] }),
    listWatchlistIds(supabase),
    listPortfolios(supabase),
    getFx(supabase),
  ]);

  const price = asset.quote ? Number(asset.quote.price) : null;
  const prev = asset.quote?.previous_close != null ? Number(asset.quote.previous_close) : null;
  const change = price != null && prev ? (price - prev) / prev : null;

  const info = toAssetInfo(asset);
  const position = valuePortfolio({
    transactions: transactions.map(toTransactionInput),
    assets: new Map([[id, info]]),
    quotes: new Map(price != null ? [[id, { price, previousClose: prev }]] : []),
    fx,
    baseCurrency: asset.currency,
    includeClosed: true,
  }).positions[0];

  const option = { id: asset.id, symbol: asset.symbol, name: asset.name, market: asset.market, currency: asset.currency };
  const chartData = (history.get(id) ?? []).map((p) => ({ date: p.date, value: p.close }));
  const defaultPortfolio = portfolios.find((p) => p.is_default) ?? portfolios[0];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <AssetAvatar symbol={asset.symbol} market={asset.market} />
          <div>
            <h1 className="font-display text-[26px] leading-tight">{asset.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              <span className="font-semibold text-fg">{asset.symbol}</span>
              <Badge>{tEnum(`market.${asset.market}` as never)}</Badge>
              <Badge>{tEnum(`assetClass.${asset.asset_class}` as never)}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <WatchButton assetId={asset.id} watched={watchIds.includes(asset.id)} withLabel />
          <AlertDialog fixedAsset={option} variant="secondary" />
          <TransactionDialog
            assets={[option]}
            portfolios={portfolios}
            defaultPortfolioId={defaultPortfolio?.id}
            draft={{ assetId: asset.id }}
            trigger={
              <Button>
                <Plus />
                {t("addTransaction")}
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display text-[34px] leading-none tabular">
                  <Money value={price} currency={asset.currency} locale={locale} />
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <ChangeBadge value={change} locale={locale} />
                  <span className="text-fg-subtle">
                    {asset.quote ? t("asOf", { date: new Date(asset.quote.as_of) }) : t("noPrice")}
                  </span>
                </div>
              </div>
              <RangeTabs
                current={range}
                hrefFor={(r) => `${routes.asset(id)}?range=${r}`}
                labels={{ "1m": t("range.1m"), "3m": t("range.3m"), "1y": t("range.1y") }}
              />
            </div>
            <div className="mt-5">
              {chartData.length > 1 ? (
                <LineChart data={chartData} currency={asset.currency} ariaLabel={t("chartLabel", { symbol: asset.symbol })} />
              ) : (
                <p className="flex h-[220px] items-center justify-center rounded-md bg-surface-muted px-6 text-center text-sm text-fg-subtle">
                  {t("noHistory")}
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("yourPosition")} />
          <CardBody>
            {position && position.quantity > 0 ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <Item label={t("quantity")}>{formatQuantity(position.quantity, locale)}</Item>
                <Item label={t("avgCost")}>
                  <Money value={position.averageCost} currency={asset.currency} locale={locale} />
                </Item>
                <Item label={t("value")}>
                  <Money value={position.marketValue} currency={asset.currency} locale={locale} />
                </Item>
                <Item label={t("pnl")}>
                  <span className="flex flex-col">
                    <Money value={position.unrealizedPnl} currency={asset.currency} locale={locale} signed className={(position.unrealizedPnl ?? 0) >= 0 ? "text-gain" : "text-loss"} />
                    <Pct value={position.unrealizedPct} locale={locale} className="text-xs" />
                  </span>
                </Item>
                <Item label={t("dividends")}>
                  <Money value={position.dividends} currency={asset.currency} locale={locale} />
                </Item>
                <Item label={t("realized")}>
                  <Money value={position.realizedPnl} currency={asset.currency} locale={locale} signed />
                </Item>
              </dl>
            ) : (
              <p className="text-sm text-fg-muted">{t("noPosition")}</p>
            )}
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-5 text-sm">
              <Item label={t("currency")}>{asset.currency}</Item>
              {asset.exchange ? <Item label={t("exchange")}>{asset.exchange}</Item> : null}
              {asset.isin ? <Item label="ISIN">{asset.isin}</Item> : null}
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={t("news")} />
          <CardBody className="pt-3">
            {news.length ? <NewsList items={news} locale={locale} compact /> : <EmptyState icon={<Newspaper />} title={t("noNews")} className="py-6" />}
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={t("events")} />
          <CardBody className="pt-3">
            {events.length ? <EventList events={events} locale={locale} /> : <EmptyState icon={<CalendarDays />} title={t("noEvents")} className="py-6" />}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular">{children}</dd>
    </div>
  );
}
