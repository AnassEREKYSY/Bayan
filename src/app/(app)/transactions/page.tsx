import { ArrowLeftRight, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { TransactionList } from "@/components/finance/transaction-list";
import { PortfolioSwitcher } from "@/components/forms/portfolio-switcher";
import { TransactionDialog } from "@/components/forms/transaction-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { listTransactions } from "@/server/data/portfolio";
import { firstParam, getPortfolioContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("transactions") };
}

const types = ["buy", "sell", "dividend", "fee"] as const;
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
              "inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
              typeFilter === type
                ? "bg-navy text-white dark:bg-primary-soft dark:text-primary"
                : "bg-surface text-fg-muted shadow-[inset_0_0_0_1px_var(--border-strong)] hover:text-fg",
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
                <TransactionList items={items} locale={locale} assets={ctx.assetOptions} portfolios={ctx.portfolios} />
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
