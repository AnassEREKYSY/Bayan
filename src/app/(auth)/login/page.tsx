import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SignInForm } from "@/components/forms/auth-forms";
import { routes } from "@/lib/routes";
import { safeRedirectPath } from "@/lib/security";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("signIn") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const t = await getTranslations("auth");
  const next = safeRedirectPath(typeof sp.next === "string" ? sp.next : undefined);

  return (
    <>
      <h1 className="font-display text-[30px] leading-[1.1]">{t("welcomeBack")}</h1>
      <p className="mt-2 mb-8 text-sm text-fg-muted">{t("signInText")}</p>
      <SignInForm next={next} linkError={sp.error === "link"} />
      <p className="mt-8 text-center text-sm text-fg-muted">
        {t("noAccount")}{" "}
        <Link href={routes.signup} className="font-semibold text-primary hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </>
  );
}
