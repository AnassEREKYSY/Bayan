"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { alertSchema, fieldErrorsOf, formToObject, idSchema } from "@/lib/validation";

import { fail, type ActionResult } from "../action-result";
import { getUser } from "../auth";

const MAX_ALERTS = 50;
const MAX_WATCHLIST = 200;

export async function toggleWatchlist(assetId: string, watch: boolean): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("unauthorized");
  if (!idSchema.safeParse({ id: assetId }).success) return fail("invalid");

  const supabase = await createClient();
  if (watch) {
    const { count } = await supabase.from("watchlist_items").select("asset_id", { count: "exact", head: true });
    if ((count ?? 0) >= MAX_WATCHLIST) return fail("watchlistLimit");
    const { error } = await supabase.from("watchlist_items").upsert({ asset_id: assetId, user_id: user.id });
    if (error) return fail("generic");
  } else {
    const { error } = await supabase.from("watchlist_items").delete().eq("asset_id", assetId);
    if (error) return fail("generic");
  }

  revalidatePath("/watchlist");
  revalidatePath("/assets/[id]", "page");
  revalidatePath("/markets");
  return { ok: true, message: watch ? "watchAdded" : "watchRemoved" };
}

export async function createAlert(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("unauthorized");

  const parsed = alertSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));
  if (parsed.data.type === "daily_move" && parsed.data.threshold > 100) {
    return fail("checkFields", { threshold: "tooLarge" });
  }

  const supabase = await createClient();
  const { count } = await supabase.from("alert_rules").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_ALERTS) return fail("alertLimit");

  const { error } = await supabase.from("alert_rules").insert({
    user_id: user.id,
    asset_id: parsed.data.assetId,
    type: parsed.data.type,
    threshold: parsed.data.threshold,
  });
  if (error) return fail("generic");

  revalidatePath("/alerts");
  return { ok: true, message: "alertCreated" };
}

export async function setAlertActive(id: string, active: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse({ id }).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.from("alert_rules").update({ is_active: active }).eq("id", id);
  if (error) return fail("generic");
  revalidatePath("/alerts");
  return { ok: true };
}

export async function deleteAlert(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse({ id }).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.from("alert_rules").delete().eq("id", id);
  if (error) return fail("generic");
  revalidatePath("/alerts");
  return { ok: true, message: "alertDeleted" };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) return fail("generic");
  revalidatePath("/", "layout");
  return { ok: true };
}
