import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AssetTable } from "@/components/finance/asset-table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { routes } from "@/lib/routes";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { listWatchlistIds } from "@/server/data/content";
import { listAssets } from "@/server/data/market";
import { firstParam, getPageContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("markets") };
}

const markets: Enums<"market">[] = ["casablanca", "us", "europe", "commodities", "crypto"];
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MarketsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const market = markets.find((m) => m === firstParam(sp.m));
  const q = firstParam(sp.q)?.slice(0, 40) ?? "";
  const { supabase, locale } = await getPageContext();
  const t = await getTranslations("markets");
  const tEnum = await getTranslations("enums.market");

  const [assets, watchIds] = await Promise.all([
    listAssets(supabase, { market, search: q || undefined }),
    listWatchlistIds(supabase),
  ]);

  const href = (m?: string) => `${routes.markets}?${new URLSearchParams({ ...(m ? { m } : {}), ...(q ? { q } : {}) })}`;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={t("filter")} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {[undefined, ...markets].map((m) => (
            <Link
              key={m ?? "all"}
              href={href(m)}
              aria-current={market === m ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap",
                market === m
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border-strong bg-surface text-fg-muted hover:text-fg",
              )}
            >
              {m ? tEnum(m) : t("all")}
            </Link>
          ))}
        </nav>
        <form role="search" action={routes.markets} className="relative w-full lg:w-72">
          {market ? <input type="hidden" name="m" value={market} /> : null}
          <label htmlFor="market-search" className="sr-only">
            {t("search")}
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input id="market-search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="pl-9" maxLength={40} />
        </form>
      </div>

      <Card>
        {assets.length ? (
          <AssetTable assets={assets} locale={locale} watched={new Set(watchIds)} />
        ) : (
          <EmptyState icon={<Search />} title={t("noResults")} description={t("noResultsHint")} />
        )}
      </Card>
      <p className="mt-4 text-xs text-fg-subtle">{t("delayNote")}</p>
    </>
  );
}
