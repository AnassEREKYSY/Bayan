import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher, ThemeToggle } from "@/components/layout/preferences";
import { routes } from "@/lib/routes";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-fg lg:flex">
        <Link href={routes.home} className="relative z-10 inline-flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
            <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.12" />
            <path d="M10.4 7.2v17.6" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M10.4 18.4a6.4 6.4 0 1 1 12.8 0a6.4 6.4 0 1 1 -12.8 0" fill="none" stroke="currentColor" strokeWidth="3.2" />
            <circle cx="24" cy="8.6" r="2.3" className="fill-accent" />
          </svg>
          <span className="font-display text-[22px] font-semibold">bayan</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-[34px] leading-tight font-medium">{t("asideTitle")}</p>
          <p className="mt-4 text-[15px] leading-relaxed opacity-80">{t("asideText")}</p>
        </div>

        <p className="relative z-10 text-sm opacity-70">{t("asideNote")}</p>

        {/* Quiet contour lines, drawn rather than generated, echoing the logo's bowl */}
        <svg className="absolute -right-40 -bottom-40 size-[560px] opacity-[0.09]" viewBox="0 0 200 200" aria-hidden>
          {[90, 74, 58, 42, 26].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="1" />
          ))}
        </svg>
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
