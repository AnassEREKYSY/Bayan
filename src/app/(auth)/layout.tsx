import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Lattice } from "@/components/brand/lattice";
import { Logo, LogoMark } from "@/components/brand/logo";
import { LocaleSwitcher, ThemeToggle } from "@/components/layout/preferences";
import { routes } from "@/lib/routes";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative m-3 hidden flex-col justify-between overflow-hidden rounded-[24px] bg-[#4b45d6] p-12 text-white lg:flex dark:bg-[#2c2896]">
        <Lattice />
        <Link href={routes.home} className="relative z-10 inline-flex items-center gap-2">
          <LogoMark inverted />
          <span className="text-[20px] leading-none font-semibold tracking-[-0.03em]">bayan</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-[36px] leading-[1.08]">{t("asideTitle")}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">{t("asideText")}</p>
        </div>

        <p className="relative z-10 text-sm text-white/65">{t("asideNote")}</p>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link href={routes.home} className="lg:invisible">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
