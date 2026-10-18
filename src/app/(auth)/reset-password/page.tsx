import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ResetPasswordForm } from "@/components/forms/auth-forms";
import { requireUser } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("resetTitle") };
}

/** Reached from the password-reset email, after /auth/callback created a session. */
export default async function ResetPasswordPage() {
  await requireUser();
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="font-display text-[30px] leading-tight font-medium">{t("resetTitle")}</h1>
      <p className="mt-2 mb-8 text-sm text-fg-muted">{t("resetText")}</p>
      <ResetPasswordForm />
    </>
  );
}
