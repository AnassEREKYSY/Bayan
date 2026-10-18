"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, formToObject, idSchema, portfolioSchema } from "@/lib/validation";

import { fail, type ActionResult } from "../action-result";
import { getUser } from "../auth";

const MAX_PORTFOLIOS = 10;

export async function savePortfolio(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("unauthorized");

  const parsed = portfolioSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));

  const supabase = await createClient();

  if (parsed.data.id) {
    const { error } = await supabase
      .from("portfolios")
      .update({ name: parsed.data.name })
      .eq("id", parsed.data.id);
    if (error) return error.code === "23505" ? fail("checkFields", { name: "duplicateName" }) : fail("generic");
  } else {
    const { count } = await supabase.from("portfolios").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= MAX_PORTFOLIOS) return fail("portfolioLimit");
    const { error } = await supabase.from("portfolios").insert({ name: parsed.data.name, user_id: user.id });
    if (error) return error.code === "23505" ? fail("checkFields", { name: "duplicateName" }) : fail("generic");
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "portfolioSaved" };
}

export async function deletePortfolio(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse({ id }).success) return fail("invalid");
  const supabase = await createClient();
  // The RLS policy refuses to delete the default portfolio.
  const { error, count } = await supabase.from("portfolios").delete({ count: "exact" }).eq("id", id);
  if (error) return fail("generic");
  if (!count) return fail("cannotDeleteDefault");
  revalidatePath("/", "layout");
  return { ok: true, message: "portfolioDeleted" };
}

export async function setDefaultPortfolio(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse({ id }).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_default_portfolio", { target: id });
  if (error) return fail("generic");
  revalidatePath("/", "layout");
  return { ok: true, message: "portfolioSaved" };
}
