import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/forms/auth-forms";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("forgotTitle") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="font-display text-[30px] leading-tight font-medium">{t("forgotTitle")}</h1>
      <p className="mt-2 mb-8 text-sm text-fg-muted">{t("forgotText")}</p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm">
        <Link href={routes.login} className="font-semibold text-primary hover:underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </>
  );
}
