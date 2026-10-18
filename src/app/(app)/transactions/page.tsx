import { ArrowLeftRight, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AssetAvatar, Money } from "@/components/finance/display";
import { PortfolioSwitcher } from "@/components/forms/portfolio-switcher";
import { TransactionActions } from "@/components/forms/transaction-actions";
import { TransactionDialog } from "@/components/forms/transaction-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatQuantity } from "@/domain/money";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { listTransactions } from "@/server/data/portfolio";
import { firstParam, getPortfolioContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("transactions") };
}

const types = ["buy", "sell", "dividend", "fee"] as const;
const tone = { buy: "primary", sell: "accent", dividend: "gain", fee: "neutral" } as const;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function TransactionsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const ctx = await getPortfolioContext(firstParam(sp.p));
  const { supabase, locale, portfolio } = ctx;
  const t = await getTranslations("transactions");
  const tType = await getTranslations("enums.transactionType");
  const typeFilter = types.find((x) => x === firstParam(sp.type));

  const all = portfolio ? await listTransactions(supabase, { portfolioId: portfolio.id }) : [];
  const list = typeFilter ? all.filter((x) => x.type === typeFilter) : all;

  const monthFmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const groups = new Map<string, typeof list>();
  for (const tx of list) {
    const key = tx.executed_at.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }

  const filterHref = (type?: string) =>
    `${routes.transactions}?${new URLSearchParams({ ...(portfolio ? { p: portfolio.id } : {}), ...(type ? { type } : {}) })}`;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <PortfolioSwitcher portfolios={ctx.portfolios} currentId={portfolio?.id} />
            <Button variant="secondary" asChild>
              <a href="/api/export" download>
                <Download />
                {t("export")}
              </a>
            </Button>
            <TransactionDialog assets={ctx.assetOptions} portfolios={ctx.portfolios} defaultPortfolioId={portfolio?.id} />
          </>
        }
      />

      <nav aria-label={t("filter")} className="mb-4 flex flex-wrap gap-1.5">
        {[undefined, ...types].map((type) => (
          <Link
            key={type ?? "all"}
            href={filterHref(type)}
            aria-current={typeFilter === type ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium",
              typeFilter === type
                ? "border-primary bg-primary text-primary-fg"
                : "border-border-strong bg-surface text-fg-muted hover:text-fg",
            )}
          >
            {type ? tType(type) : t("all")}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ArrowLeftRight />}
            title={t("emptyTitle")}
            description={t("emptyText")}
            action={<TransactionDialog assets={ctx.assetOptions} portfolios={ctx.portfolios} defaultPortfolioId={portfolio?.id} />}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([month, items]) => (
            <section key={month}>
              <h2 className="mb-2 text-sm font-semibold text-fg-muted capitalize">
                {monthFmt.format(new Date(`${month}-01T00:00:00Z`))}
              </h2>
              <Card>
                <ul className="divide-y divide-border">
                  {items.map((tx) => {
                    const isTrade = tx.type === "buy" || tx.type === "sell";
                    const total = isTrade
                      ? Number(tx.quantity) * Number(tx.price) + (tx.type === "buy" ? Number(tx.fees) : -Number(tx.fees))
                      : Number(tx.amount);
                    return (
                      <li key={tx.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                        <AssetAvatar symbol={tx.asset.symbol} market={tx.asset.market} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={routes.asset(tx.asset_id)} className="truncate text-sm font-semibold hover:text-primary">
                              {tx.asset.name}
                            </Link>
                            <Badge tone={tone[tx.type]}>{tType(tx.type)}</Badge>
                          </div>
                          <p className="text-xs text-fg-subtle tabular">
                            {dayFmt.format(new Date(tx.executed_at))}
                            {isTrade ? (
                              <>
                                {" · "}
                                {formatQuantity(Number(tx.quantity), locale)} × <Money value={Number(tx.price)} currency={tx.currency} locale={locale} />
                              </>
                            ) : null}
                            {tx.note ? ` · ${tx.note}` : null}
                          </p>
                        </div>
                        <Money
                          value={tx.type === "buy" || tx.type === "fee" ? -total : total}
                          currency={tx.currency}
                          locale={locale}
                          signed
                          className={cn("text-sm font-semibold", tx.type === "dividend" && "text-gain")}
                        />
                        <TransactionActions
                          assets={ctx.assetOptions}
                          portfolios={ctx.portfolios}
                          draft={{
                            id: tx.id,
                            portfolioId: tx.portfolio_id,
                            assetId: tx.asset_id,
                            type: tx.type,
                            date: tx.executed_at.slice(0, 10),
                            quantity: Number(tx.quantity),
                            price: Number(tx.price),
                            fees: Number(tx.fees),
                            amount: Number(tx.amount),
                            note: tx.note,
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
