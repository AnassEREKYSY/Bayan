"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale, localeCookie } from "@/i18n/config";
import { publicEnv } from "@/lib/env";
import { routes } from "@/lib/routes";
import { safeRedirectPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsOf,
  forgotPasswordSchema,
  formToObject,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";

import { fail, type ActionResult } from "../action-result";

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message whatever the cause, so the form cannot be used to probe accounts.
  if (error) return fail(error.code === "email_not_confirmed" ? "emailNotConfirmed" : "invalidCredentials");

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));

  const cookieLocale = (await cookies()).get(localeCookie)?.value;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}${routes.authCallback}?next=${routes.dashboard}`,
      data: {
        display_name: parsed.data.displayName,
        locale: isLocale(cookieLocale) ? cookieLocale : "fr",
      },
    },
  });

  if (error) {
    if (error.code === "weak_password") return fail("checkFields", { password: "passwordStrength" });
    if (error.code === "over_email_send_rate_limit") return fail("rateLimited");
    // Do not reveal whether the email is already registered.
    console.error("signUp failed", error.code);
  }
  return { ok: true, message: "checkInbox" };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.home);
}

export async function requestPasswordReset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}${routes.authCallback}?next=${routes.resetPassword}`,
  });
  // Always succeed: never confirm whether an account exists.
  return { ok: true, message: "resetSent" };
}

export async function updatePassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return fail("checkFields", { password: "samePassword" });
    return fail("generic");
  }
  return { ok: true, message: "passwordUpdated" };
}
