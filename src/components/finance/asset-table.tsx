import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { WatchButton } from "@/components/forms/watch-button";
import { routes } from "@/lib/routes";
import type { AssetWithQuote } from "@/server/data/market";

import { AssetAvatar, ChangeBadge, Money } from "./display";

/** Responsive list of assets with their latest price and daily change. */
export async function AssetTable({
  assets,
  locale,
  watched,
}: {
  assets: AssetWithQuote[];
  locale: string;
  watched: ReadonlySet<string>;
}) {
  const t = await getTranslations("markets");
  const tEnum = await getTranslations("enums");

  return (
    <ul className="divide-y divide-border">
      {assets.map((a) => {
        const price = a.quote ? Number(a.quote.price) : null;
        const prev = a.quote?.previous_close != null ? Number(a.quote.previous_close) : null;
        const change = price != null && prev ? (price - prev) / prev : null;
        return (
          <li key={a.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/60 sm:px-5">
            <Link href={routes.asset(a.id)} className="flex min-w-0 flex-1 items-center gap-3">
              <AssetAvatar symbol={a.symbol} market={a.market} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{a.name}</p>
                <p className="flex items-center gap-2 truncate text-xs text-fg-subtle">
                  <span className="font-semibold text-fg-muted">{a.symbol}</span>
                  <span>{tEnum(`assetClass.${a.asset_class}` as never)}</span>
                  {a.exchange ? <span className="hidden sm:inline">{a.exchange}</span> : null}
                </p>
              </div>
            </Link>
            <div className="text-right">
              <p className="text-sm font-semibold">
                {price != null ? <Money value={price} currency={a.currency} locale={locale} /> : <span className="text-xs font-normal text-fg-subtle">{t("noPrice")}</span>}
              </p>
              {price != null ? <ChangeBadge value={change} locale={locale} /> : null}
            </div>
            <WatchButton assetId={a.id} watched={watched.has(a.id)} />
          </li>
        );
      })}
    </ul>
  );
}
