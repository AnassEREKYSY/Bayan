import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div>
        <p className="font-display text-[64px] leading-none font-medium text-fg-subtle">404</p>
        <h1 className="mt-3 text-lg font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("text")}</p>
      </div>
      <Button asChild>
        <Link href={routes.home}>{t("back")}</Link>
      </Button>
    </main>
  );
}
