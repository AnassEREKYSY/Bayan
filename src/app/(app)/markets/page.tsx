import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AssetTable } from "@/components/finance/asset-table";
import { AssetAvatar, MarketTag } from "@/components/finance/display";
import { ImportAssetButton } from "@/components/forms/import-asset-button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { routes } from "@/lib/routes";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { serverEnv } from "@/lib/env.server";
import { listWatchlistIds } from "@/server/data/content";
import { listAssets } from "@/server/data/market";
import { searchCatalog, type CatalogHit } from "@/server/market/catalog";
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

  // Catalogue search only for markets a provider can serve on demand.
  const catalogMarkets = new Set(["us", "europe", "crypto"]);
  const searchOutside = q.length >= 2 && (!market || catalogMarkets.has(market));
  const tEnumAll = await getTranslations("enums");

  const [assets, watchIds, catalog] = await Promise.all([
    listAssets(supabase, { market, search: q || undefined }),
    listWatchlistIds(supabase),
    searchOutside ? searchCatalog(q, serverEnv()) : Promise.resolve([] as CatalogHit[]),
  ]);

  // Hide catalogue results Bayan already tracks (same reference, or for
  // stocks the same ticker on the same market).
  const keyOf = (h: { market: string; symbol: string }) => `${h.market}:${h.symbol.toUpperCase()}`;
  let outside = catalog.filter((h) => !market || h.market === market);
  if (outside.length) {
    const { data } = await supabase
      .from("assets")
      .select("market, symbol, provider_ref")
      .or(`provider_ref.in.(${outside.map((h) => `"${h.ref}"`).join(",")}),symbol.in.(${outside.map((h) => `"${h.symbol}"`).join(",")})`);
    const refs = new Set((data ?? []).map((r) => r.provider_ref));
    const tickers = new Set((data ?? []).map(keyOf));
    outside = outside
      .filter((h) => !refs.has(h.ref) && !(h.provider === "twelvedata" && tickers.has(keyOf(h))))
      .slice(0, 12);
  }

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
                m && `market-${m}`,
                "inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                market === m
                  ? "bg-navy text-white dark:bg-primary-soft dark:text-primary"
                  : "bg-surface text-fg-muted shadow-[inset_0_0_0_1px_var(--border-strong)] hover:text-fg",
              )}
            >
              {m ? <span aria-hidden className="size-2 rounded-full bg-[var(--market)]" /> : null}
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

      {assets.length || !outside.length ? (
        <Card>
          {assets.length ? (
            <AssetTable assets={assets} locale={locale} watched={new Set(watchIds)} />
          ) : (
            <EmptyState icon={<Search />} title={t("noResults")} description={t("noResultsHint")} />
          )}
        </Card>
      ) : null}

      {outside.length ? (
        <Card className="mt-4">
          <CardHeader title={t("elsewhere")} description={t("elsewhereHint")} />
          <ul className="mt-2 divide-y divide-border border-t border-border">
            {outside.map((h) => (
              <li key={`${h.provider}:${h.ref}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <AssetAvatar symbol={h.symbol} market={h.market} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{h.name}</p>
                  <p className="flex items-center gap-2 truncate text-xs text-fg-subtle">
                    <span className="font-semibold text-fg-muted">{h.symbol}</span>
                    <MarketTag market={h.market} label={tEnumAll(`market.${h.market}` as never)} />
                    {h.exchange ? <span className="hidden sm:inline">{h.exchange}</span> : null}
                  </p>
                </div>
                <ImportAssetButton provider={h.provider} providerRef={h.ref} name={h.name} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <p className="mt-4 text-xs text-fg-subtle">{q ? t("delayNote") : `${t("exploreHint")} ${t("delayNote")}`}</p>
    </>
  );
}
