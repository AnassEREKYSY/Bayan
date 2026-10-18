import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { NewsList } from "@/components/news/news-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { listNews, listWatchlistIds } from "@/server/data/content";
import { firstParam, getPageContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("news") };
}

const PAGE_SIZE = 20;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function NewsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const scope = firstParam(sp.scope) === "all" ? "all" : "mine";
  const before = firstParam(sp.before);
  const validBefore = before && !Number.isNaN(Date.parse(before)) ? before : undefined;

  const { supabase, locale } = await getPageContext();
  const t = await getTranslations("news");

  let assetIds: string[] | undefined;
  if (scope === "mine") {
    const [{ data: txAssets }, watchIds] = await Promise.all([
      supabase.from("transactions").select("asset_id"),
      listWatchlistIds(supabase),
    ]);
    assetIds = [...new Set([...(txAssets ?? []).map((r) => r.asset_id), ...watchIds])];
  }

  const items = await listNews(supabase, { assetIds, limit: PAGE_SIZE, before: validBefore });
  const last = items[items.length - 1];
  const tab = (value: "mine" | "all") => (
    <Link
      href={`${routes.news}?scope=${value}`}
      aria-current={scope === value ? "true" : undefined}
      className={cn(
        "rounded-[5px] px-3 py-1.5 text-sm font-semibold",
        scope === value ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg",
      )}
    >
      {t(value === "mine" ? "mine" : "all")}
    </Link>
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<div className="inline-flex rounded-md bg-surface-muted p-0.5">{tab("mine")}{tab("all")}</div>} />

      {items.length ? (
        <>
          <NewsList items={items} locale={locale} />
          {items.length === PAGE_SIZE && last ? (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" asChild>
                <Link href={`${routes.news}?scope=${scope}&before=${encodeURIComponent(last.published_at)}`}>{t("older")}</Link>
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Card>
          <EmptyState icon={<Newspaper />} title={t("emptyTitle")} description={scope === "mine" ? t("emptyMine") : t("emptyAll")} />
        </Card>
      )}
      <p className="mt-6 text-xs text-fg-subtle">{t("note")}</p>
    </>
  );
}
