import { Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AssetTable } from "@/components/finance/asset-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { routes } from "@/lib/routes";
import { listWatchlistIds } from "@/server/data/content";
import type { AssetWithQuote } from "@/server/data/market";
import { getPageContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("watchlist") };
}

export default async function WatchlistPage() {
  const { supabase, locale } = await getPageContext();
  const t = await getTranslations("watchlist");
  const ids = await listWatchlistIds(supabase);

  const { data } = ids.length
    ? await supabase.from("assets").select("*, quote:asset_quotes(*)").in("id", ids).order("symbol")
    : { data: [] };
  const assets = (data ?? []) as unknown as AssetWithQuote[];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        {assets.length ? (
          <AssetTable assets={assets} locale={locale} watched={new Set(ids)} />
        ) : (
          <EmptyState
            icon={<Star />}
            title={t("emptyTitle")}
            description={t("emptyText")}
            action={
              <Button asChild>
                <Link href={routes.markets}>{t("browse")}</Link>
              </Button>
            }
          />
        )}
      </Card>
    </>
  );
}
