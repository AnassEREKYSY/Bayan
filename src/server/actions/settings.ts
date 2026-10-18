"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale, localeCookie, type Locale } from "@/i18n/config";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, formToObject, profileSchema } from "@/lib/validation";

import { fail, type ActionResult } from "../action-result";
import { getUser } from "../auth";

async function writeLocaleCookie(locale: Locale) {
  (await cookies()).set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}

/** Language switch, available to signed-out visitors too. */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  await writeLocaleCookie(locale);

  const user = await getUser();
  if (user) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ locale }).eq("id", user.id);
  }
  revalidatePath("/", "layout");
}

export async function updateProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("unauthorized");

  const parsed = profileSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName || null,
      base_currency: parsed.data.baseCurrency,
      locale: parsed.data.locale,
    })
    .eq("id", user.id);
  if (error) return fail("generic");

  await writeLocaleCookie(parsed.data.locale);
  revalidatePath("/", "layout");
  return { ok: true, message: "profileSaved" };
}

/**
 * Permanently deletes the account. All user rows cascade from auth.users.
 * Requires the user to type the confirmation word.
 */
export async function deleteAccount(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("unauthorized");

  const confirmation = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (confirmation !== "DELETE" && confirmation !== "SUPPRIMER") {
    return fail("checkFields", { confirm: "confirmationMismatch" });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteAccount failed", error.code);
    return fail("generic");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.home);
}
