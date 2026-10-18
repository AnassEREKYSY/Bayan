"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assetSchema, eventSchema, fieldErrorsOf, formToObject, idSchema } from "@/lib/validation";

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
