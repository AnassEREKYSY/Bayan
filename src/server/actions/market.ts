"use server";

import { revalidatePath } from "next/cache";

import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/lib/supabase/database.types";

import { fail, type ActionResult } from "../action-result";
import { getUser } from "../auth";
import { importSchema, keywordsFor, resolveCatalogHit, type CatalogHit } from "../market/catalog";
import { refreshAsset } from "../market/refresh";

/** Each user can add this many new assets per 24 hours (protects the free quotas). */
const IMPORTS_PER_DAY = 25;

/**
 * Adds an asset found in a provider catalogue to Bayan's shared list, then
 * fetches its price and a year of history. Returns the asset id to open.
 * Everything stored comes from the provider, not from the browser.
 */
export async function importAsset(provider: string, ref: string): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return fail("unauthorized");

  const input = importSchema.safeParse({ provider, ref });
  if (!input.success) return fail("invalid");

  const db = createAdminClient();

  // Already in Bayan? Just open it.
  const existing = await db.from("assets").select("id").eq("provider_ref", input.data.ref).limit(1).maybeSingle();
  if (existing.data) return { ok: true, data: { id: existing.data.id } };

  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { count } = await db
    .from("asset_imports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= IMPORTS_PER_DAY) return fail("importLimit");

  let hit: CatalogHit | null;
  try {
    hit = await resolveCatalogHit(input.data, serverEnv());
  } catch {
    return fail("providerUnavailable");
  }
  if (!hit) return fail("notFound");

  // A stock already listed under the same ticker on that market is the same
  // company (e.g. AAPL added earlier without an exchange code).
  if (hit.provider === "twelvedata") {
    const same = await db.from("assets").select("id").eq("market", hit.market).eq("symbol", hit.symbol).maybeSingle();
    if (same.data) return { ok: true, data: { id: same.data.id } };
  }

  const row: TablesInsert<"assets"> = {
    symbol: hit.symbol,
    name: hit.name,
    asset_class: hit.assetClass,
    market: hit.market,
    currency: hit.currency,
    exchange: hit.exchange,
    provider_ref: hit.ref,
    keywords: keywordsFor(hit),
  };

  // Two listings can share a ticker on the same market (e.g. two exchanges
  // or two coins): keep the first, suffix the next ones.
  let inserted = await db.from("assets").insert(row).select("id, symbol, market, provider_ref").single();
  if (inserted.error?.code === "23505") {
    const suffix = hit.provider === "twelvedata" ? hit.ref.split("|")[1]! : hit.ref.slice(0, 8).toUpperCase();
    inserted = await db
      .from("assets")
      .insert({ ...row, symbol: `${hit.symbol}.${suffix}`.slice(0, 20) })
      .select("id, symbol, market, provider_ref")
      .single();
  }
  if (inserted.error || !inserted.data) return fail("generic");

  await db.from("asset_imports").insert({ user_id: user.id, asset_id: inserted.data.id });

  try {
    await refreshAsset(db, inserted.data, { history: true });
  } catch {
    // The asset exists; its price will arrive with the next refresh.
  }

  revalidatePath("/markets");
  return { ok: true, data: { id: inserted.data.id } };
}
