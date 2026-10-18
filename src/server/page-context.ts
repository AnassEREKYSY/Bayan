import "server-only";

import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";

import { requireProfile } from "./auth";
import { listAssetOptions } from "./data/market";
import { listPortfolios, pickPortfolio } from "./data/portfolio";

/** Common data every signed-in page needs. */
export async function getPageContext() {
  const [profile, locale, supabase] = await Promise.all([requireProfile(), getLocale(), createClient()]);
  return { profile, locale, supabase, base: profile.base_currency };
}

/** Portfolios + the selected one (from ?p=) + assets for the transaction form. */
export async function getPortfolioContext(requestedId?: string) {
  const ctx = await getPageContext();
  const [portfolios, assetOptions] = await Promise.all([listPortfolios(ctx.supabase), listAssetOptions(ctx.supabase)]);
  const portfolio = pickPortfolio(portfolios, requestedId);
  return { ...ctx, portfolios, portfolio, assetOptions };
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
