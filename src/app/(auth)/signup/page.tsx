import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SignUpForm } from "@/components/forms/auth-forms";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("createAccount") };
}

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="font-display text-[30px] leading-tight font-medium">{t("signUpTitle")}</h1>
      <p className="mt-2 mb-8 text-sm text-fg-muted">{t("signUpText")}</p>
      <SignUpForm />
      <p className="mt-8 text-center text-sm text-fg-muted">
        {t("haveAccount")}{" "}
        <Link href={routes.login} className="font-semibold text-primary hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </>
  );
}
