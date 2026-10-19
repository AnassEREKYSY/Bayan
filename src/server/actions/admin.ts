"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parsePriceRows } from "@/domain/price-import";
import { assetSchema, eventSchema, fieldErrorsOf, formToObject, idSchema, priceImportSchema } from "@/lib/validation";

import { fail, type ActionResult } from "../action-result";
import { getProfile } from "../auth";
import { jobNames, runJobs } from "../jobs/jobs";

async function assertAdmin() {
  const profile = await getProfile();
  return profile?.role === "admin";
}

export async function createAsset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await assertAdmin())) return fail("forbidden");
  const parsed = assetSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));
  const v = parsed.data;

  // Writes go through the user client: RLS re-checks is_admin() in the database.
  const supabase = await createClient();
  const { error } = await supabase.from("assets").insert({
    symbol: v.symbol,
    name: v.name,
    asset_class: v.assetClass,
    market: v.market,
    currency: v.currency,
    exchange: v.exchange,
    provider_ref: v.providerRef,
    keywords: v.keywords,
  });
  if (error) return error.code === "23505" ? fail("checkFields", { symbol: "duplicateAsset" }) : fail("generic");

  revalidatePath("/admin");
  revalidatePath("/markets");
  return { ok: true, message: "assetCreated" };
}

export async function createEvent(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await assertAdmin())) return fail("forbidden");
  const parsed = eventSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));
  const v = parsed.data;

  const supabase = await createClient();
  const { data: asset } = await supabase.from("assets").select("currency").eq("id", v.assetId).maybeSingle();
  if (!asset) return fail("checkFields", { assetId: "invalid" });

  const { error } = await supabase.from("corporate_events").insert({
    asset_id: v.assetId,
    type: v.type,
    title: v.title,
    event_date: v.eventDate,
    amount: v.amount,
    currency: v.amount != null ? asset.currency : null,
    source_url: v.sourceUrl,
  });
  if (error) return fail("generic");

  revalidatePath("/admin");
  revalidatePath("/calendar");
  return { ok: true, message: "eventCreated" };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  if (!(await assertAdmin())) return fail("forbidden");
  if (!idSchema.safeParse({ id }).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.from("corporate_events").delete().eq("id", id);
  if (error) return fail("generic");
  revalidatePath("/admin");
  revalidatePath("/calendar");
  return { ok: true, message: "eventDeleted" };
}

/** Lets an admin refresh data on demand instead of waiting for the schedule. */
export async function runAllJobs(): Promise<ActionResult> {
  if (!(await assertAdmin())) return fail("forbidden");
  await runJobs(createAdminClient(), jobNames);
  revalidatePath("/", "layout");
  return { ok: true, message: "jobsDone" };
}

/**
 * Saves closing prices typed or pasted by an admin, for markets that have no
 * price API (Casablanca). The latest row becomes the asset's current price,
 * the one before it the previous close, so the day's change shows too.
 */
export async function importPrices(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await assertAdmin())) return fail("forbidden");
  const parsed = priceImportSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));

  const { points, badLines } = parsePriceRows(parsed.data.rows);
  if (badLines.length) return fail("checkFields", { rows: "priceRows" });
  if (points.length === 0) return fail("checkFields", { rows: "required" });

  // Prices are shared reference data: no RLS write policy, so the service role
  // writes them, after the admin check above.
  const db = createAdminClient();
  const { data: asset } = await db.from("assets").select("id").eq("id", parsed.data.assetId).maybeSingle();
  if (!asset) return fail("checkFields", { assetId: "invalid" });

  const { error } = await db
    .from("asset_prices")
    .upsert(points.map((p) => ({ asset_id: asset.id, price_date: p.date, close: p.close })));
  if (error) return fail("generic");

  // Only move the current price forward, never back to an older day.
  const last = points.at(-1)!;
  const { data: current } = await db.from("asset_quotes").select("as_of").eq("asset_id", asset.id).maybeSingle();
  if (!current || current.as_of.slice(0, 10) <= last.date) {
    const { data: prev } = await db
      .from("asset_prices")
      .select("close")
      .eq("asset_id", asset.id)
      .lt("price_date", last.date)
      .order("price_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const now = new Date().toISOString();
    await db.from("asset_quotes").upsert({
      asset_id: asset.id,
      price: last.close,
      previous_close: prev?.close ?? null,
      // Closing prices: stamp them at the Casablanca close (15:30 local = 14:30 UTC).
      as_of: `${last.date}T14:30:00Z`,
      source: "manual",
      updated_at: now,
    });
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "pricesImported" };
}
