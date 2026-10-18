import { PieChart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Allocation } from "@/components/charts/allocation";
import { AssetAvatar, ChangeBadge, MarketTag, Money, Pct } from "@/components/finance/display";
import { PortfolioManager } from "@/components/forms/portfolio-manager";
import { PortfolioSwitcher } from "@/components/forms/portfolio-switcher";
import { TransactionDialog } from "@/components/forms/transaction-dialog";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatMoney, formatPercent, formatQuantity } from "@/domain/money";
import { allocation } from "@/domain/portfolio";
import { routes } from "@/lib/routes";
import { buildPortfolioView, listTransactions } from "@/server/data/portfolio";
import { firstParam, getPortfolioContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("portfolio") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function PortfolioPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const ctx = await getPortfolioContext(firstParam(sp.p));
  const { supabase, locale, base, portfolio } = ctx;
  const t = await getTranslations("portfolio");
  const tEnum = await getTranslations("enums");

  const transactions = portfolio ? await listTransactions(supabase, { portfolioId: portfolio.id }) : [];
  const view = await buildPortfolioView(supabase, transactions, base);
  const open = view.positions.filter((p) => p.quantity > 0);
  const { summary } = view;

  const slices = (key: "market" | "assetClass") =>
    allocation(open, (p) => (key === "market" ? p.asset.market : p.asset.assetClass)).map((s) => ({
      key: s.key,
      label: tEnum(`${key === "market" ? "market" : "assetClass"}.${s.key}` as never),
      weight: s.weight,
      valueLabel: formatMoney(s.value, base, locale, { compact: true }),
    }));

  return (
    <>
      <PageHeader
        title={portfolio?.name ?? t("title")}
        description={t("description", { currency: base })}
        actions={
          <>
            <PortfolioSwitcher portfolios={ctx.portfolios} currentId={portfolio?.id} />
            <PortfolioManager portfolios={ctx.portfolios} />
            <TransactionDialog assets={ctx.assetOptions} portfolios={ctx.portfolios} defaultPortfolioId={portfolio?.id} />
          </>
        }
      />

      <dl className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        {[
          { label: t("value"), node: <Money value={summary.marketValue} currency={base} locale={locale} /> },
          {
            label: t("unrealized"),
            node: (
              <span className="flex flex-wrap items-baseline gap-x-2">
                <Money value={summary.unrealizedPnl} currency={base} locale={locale} signed className={summary.unrealizedPnl >= 0 ? "text-gain" : "text-loss"} />
                <Pct value={summary.unrealizedPct} locale={locale} className="text-sm" />
              </span>
            ),
          },
          { label: t("realized"), node: <Money value={summary.realizedPnl} currency={base} locale={locale} signed /> },
          { label: t("dividends"), node: <Money value={summary.dividends} currency={base} locale={locale} /> },
        ].map((s) => (
          <div key={s.label} className="min-w-0 bg-surface px-4 py-4 sm:px-5">
            <dt className="text-[13px] font-medium text-fg-muted">{s.label}</dt>
            <dd className="mt-1 text-base font-semibold tracking-[-0.01em] sm:text-lg">{s.node}</dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardHeader title={t("holdings")} description={t("holdingsHint")} />
        {open.length === 0 ? (
          <EmptyState icon={<PieChart />} title={t("emptyTitle")} description={t("emptyText")} />
        ) : (
          <>
            {/* Table on larger screens */}
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-surface-muted/60 text-left text-xs font-semibold text-fg-muted">
                    <th scope="col" className="px-5 py-2.5">{t("col.asset")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t("col.quantity")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t("col.avgCost")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t("col.price")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t("col.value", { currency: base })}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t("col.pnl")}</th>
                    <th scope="col" className="px-5 py-2.5 text-right">{t("col.weight")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {open.map((p) => (
                    <tr key={p.assetId} className="hover:bg-surface-muted/50">
                      <td className="px-5 py-3">
                        <Link href={routes.asset(p.assetId)} className="flex items-center gap-3">
                          <AssetAvatar symbol={p.asset.symbol} market={p.asset.market} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{p.asset.name}</span>
                            <span className="flex items-center gap-2 text-xs text-fg-subtle">
                              <span className="font-semibold text-fg-muted">{p.asset.symbol}</span>
                              <MarketTag market={p.asset.market} label={tEnum(`market.${p.asset.market}` as never)} />
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right tabular">{formatQuantity(p.quantity, locale)}</td>
                      <td className="px-3 py-3 text-right">
                        <Money value={p.averageCost} currency={p.asset.currency} locale={locale} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <Money value={p.price} currency={p.asset.currency} locale={locale} />
                          <ChangeBadge value={p.dayChangePct} locale={locale} />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">
                        <Money value={p.base.marketValue} currency={base} locale={locale} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <Money value={p.base.unrealizedPnl} currency={base} locale={locale} signed className={(p.unrealizedPnl ?? 0) >= 0 ? "text-gain" : "text-loss"} />
                          <Pct value={p.unrealizedPct} locale={locale} className="text-xs" />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-fg-muted tabular">
                        {p.weight != null ? formatPercent(p.weight, locale, { signed: false }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards on phones */}
            <ul className="mt-3 divide-y divide-border border-t border-border md:hidden">
              {open.map((p) => (
                <li key={p.assetId}>
                  <Link href={routes.asset(p.assetId)} className="flex items-center gap-3 px-5 py-3.5">
                    <AssetAvatar symbol={p.asset.symbol} market={p.asset.market} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.asset.name}</p>
                      <p className="text-xs text-fg-subtle tabular">
                        {formatQuantity(p.quantity, locale)} × <Money value={p.price} currency={p.asset.currency} locale={locale} />
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        <Money value={p.base.marketValue} currency={base} locale={locale} />
                      </p>
                      <Pct value={p.unrealizedPct} locale={locale} className="text-xs" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {open.length > 0 ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title={t("byMarket")} />
            <CardBody>
              <Allocation slices={slices("market")} locale={locale} title={t("byMarket")} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("byClass")} />
            <CardBody>
              <Allocation slices={slices("assetClass")} locale={locale} title={t("byClass")} />
            </CardBody>
          </Card>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-fg-subtle">{t("methodNote")}</p>
    </>
  );
}
