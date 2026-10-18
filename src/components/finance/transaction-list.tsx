import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { AssetOption } from "@/components/forms/asset-select";
import { TransactionActions } from "@/components/forms/transaction-actions";
import { Badge } from "@/components/ui/misc";
import { formatQuantity } from "@/domain/money";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { TransactionWithAsset } from "@/server/data/portfolio";

import { AssetAvatar, Money } from "./display";

const tone = { buy: "primary", sell: "accent", dividend: "gain", fee: "neutral" } as const;

/** Rows of transactions with visible edit and delete buttons. */
export async function TransactionList({
  items,
  locale,
  assets,
  portfolios,
  showAsset = true,
}: {
  items: TransactionWithAsset[];
  locale: string;
  assets: AssetOption[];
  portfolios: { id: string; name: string }[];
  showAsset?: boolean;
}) {
  const tType = await getTranslations("enums.transactionType");
  const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: showAsset ? undefined : "numeric", timeZone: "UTC" });

  return (
    <ul className="divide-y divide-border">
      {items.map((tx) => {
        const isTrade = tx.type === "buy" || tx.type === "sell";
        const total = isTrade
          ? Number(tx.quantity) * Number(tx.price) + (tx.type === "buy" ? Number(tx.fees) : -Number(tx.fees))
          : Number(tx.amount);
        const day = dayFmt.format(new Date(tx.executed_at));
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3 pr-2 pl-4 sm:pl-5">
            {showAsset ? <AssetAvatar symbol={tx.asset.symbol} market={tx.asset.market} /> : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {showAsset ? (
                  <Link href={routes.asset(tx.asset_id)} className="truncate text-sm font-semibold hover:text-primary">
                    {tx.asset.name}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold tabular">{day}</span>
                )}
                <Badge tone={tone[tx.type]}>{tType(tx.type)}</Badge>
              </div>
              <p className="flex flex-wrap gap-x-3 text-xs text-fg-subtle tabular">
                {showAsset ? <span>{day}</span> : null}
                {isTrade ? (
                  <span>
                    {formatQuantity(Number(tx.quantity), locale)} × <Money value={Number(tx.price)} currency={tx.currency} locale={locale} />
                  </span>
                ) : null}
                {tx.note ? <span className="truncate italic">{tx.note}</span> : null}
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
              assets={assets}
              portfolios={portfolios}
              label={`${tx.asset.name}, ${tType(tx.type)}, ${day}`}
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
  );
}
