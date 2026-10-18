import { ArrowRight, BellRing, CalendarDays, Layers, Newspaper, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { AssetAvatar, ChangeBadge } from "@/components/finance/display";
import { LocaleSwitcher, ThemeToggle } from "@/components/layout/preferences";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/domain/money";
import { routes } from "@/lib/routes";
import { getUser } from "@/server/auth";

export default async function LandingPage() {
  const [t, locale, user] = await Promise.all([getTranslations("landing"), getLocale(), getUser()]);

  const features = [
    { icon: Layers, key: "oneView" },
    { icon: Newspaper, key: "explained" },
    { icon: CalendarDays, key: "calendar" },
    { icon: BellRing, key: "alerts" },
  ] as const;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href={routes.home} aria-label="Bayan">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          <a href="#features" className="hidden rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg md:block">
            {t("navFeatures")}
          </a>
          <a href="#how" className="hidden rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg md:block">
            {t("navHow")}
          </a>
          <LocaleSwitcher />
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm" className="ml-2">
              <Link href={routes.dashboard}>{t("openApp")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="ml-1 hidden sm:inline-flex">
                <Link href={routes.login}>{t("signIn")}</Link>
              </Button>
              <Button asChild size="sm" className="ml-1">
                <Link href={routes.signup}>{t("start")}</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-28 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <p className="mb-5 text-xs font-bold tracking-[0.14em] text-accent uppercase">{t("eyebrow")}</p>
            <h1 className="font-display text-[44px] leading-[1.04] font-medium tracking-tight text-balance sm:text-[56px]">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-fg-muted">{t("subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={user ? routes.dashboard : routes.signup}>
                  {t("cta")}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#how">{t("ctaSecondary")}</a>
              </Button>
            </div>
            <p className="mt-5 text-sm text-fg-subtle">{t("free")}</p>
          </div>

          <ProductPreview locale={locale} labels={{
            total: t("preview.total"),
            today: t("preview.today"),
            news: t("preview.news"),
            newsText: t("preview.newsText"),
            summary: t("preview.summary"),
          }} />
        </section>

        {/* Features */}
        <section id="features" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 className="max-w-2xl font-display text-[34px] leading-tight font-medium">{t("featuresTitle")}</h2>
            <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2">
              {features.map(({ icon: Icon, key }) => (
                <div key={key} className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t(`features.${key}.title`)}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{t(`features.${key}.text`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="font-display text-[34px] leading-tight font-medium">{t("howTitle")}</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {(["one", "two", "three"] as const).map((step, i) => (
              <li key={step} className="border-t-2 border-fg pt-5">
                <span className="font-display text-sm font-semibold text-accent">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{t(`how.${step}.title`)}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{t(`how.${step}.text`)}</p>
              </li>
            ))}
          </ol>

          <div className="mt-16 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-semibold text-fg-muted">{t("marketsLabel")}</span>
            {(["casablanca", "us", "europe", "commodities", "crypto"] as const).map((m) => (
              <span key={m} className="rounded-full border border-border-strong px-3 py-1 text-sm">
                {t(`markets.${m}`)}
              </span>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-7">
              <Sparkles className="size-5 text-accent" />
              <h3 className="mt-4 font-semibold">{t("principles.inform.title")}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{t("principles.inform.text")}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-7">
              <ShieldCheck className="size-5 text-primary" />
              <h3 className="mt-4 font-semibold">{t("principles.privacy.title")}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{t("principles.privacy.text")}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary text-primary-fg">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center">
            <p className="max-w-xl font-display text-[28px] leading-tight font-medium">{t("finalTitle")}</p>
            <Button asChild size="lg" className="bg-primary-fg text-primary hover:bg-primary-fg/90">
              <Link href={user ? routes.dashboard : routes.signup}>
                {t("cta")}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} Bayan</span>
        <span>{t("footerNote")}</span>
      </footer>
    </div>
  );
}

/** A static, honest preview of the dashboard built from the real UI pieces. */
function ProductPreview({
  locale,
  labels,
}: {
  locale: string;
  labels: { total: string; today: string; news: string; newsText: string; summary: string };
}) {
  const rows = [
    { symbol: "MSA", name: "Marsa Maroc", market: "casablanca", value: formatMoney(1880, "MAD", locale), change: 0.0124 },
    { symbol: "CW8", name: "Amundi MSCI World", market: "europe", value: formatMoney(612.4, "EUR", locale), change: -0.0031 },
    { symbol: "XAU", name: "Gold", market: "commodities", value: formatMoney(398.2, "USD", locale), change: 0.0057 },
    { symbol: "BTC", name: "Bitcoin", market: "crypto", value: formatMoney(254.1, "USD", locale), change: 0.0213 },
  ];

  return (
    <div aria-hidden className="relative">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-pop">
        <p className="text-sm text-fg-muted">{labels.total}</p>
        <p className="mt-1 font-display text-[34px] leading-none font-medium tabular">{formatMoney(48230.5, "MAD", locale)}</p>
        <p className="mt-2 flex items-center gap-2 text-sm">
          <span className="font-semibold text-gain tabular">+{formatMoney(412.3, "MAD", locale)}</span>
          <ChangeBadge value={0.0086} locale={locale} />
          <span className="text-fg-subtle">{labels.today}</span>
        </p>
        <svg viewBox="0 0 300 70" className="mt-4 h-16 w-full" preserveAspectRatio="none">
          <path
            d="M0,52 C20,50 30,44 50,46 S85,30 105,34 S140,40 160,28 S200,22 220,24 S255,12 275,14 L300,8"
            fill="none"
            stroke="var(--gain)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ul className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.symbol} className="flex items-center gap-3 py-2.5">
              <AssetAvatar symbol={r.symbol} market={r.market} />
              <span className="flex-1 truncate text-sm font-semibold">{r.name}</span>
              <span className="text-sm tabular">{r.value}</span>
              <ChangeBadge value={r.change} locale={locale} />
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-20 -left-4 hidden w-72 rounded-lg border border-border bg-surface p-4 shadow-pop sm:block lg:-left-10">
        <p className="text-xs font-semibold text-fg-muted">{labels.news} · MSA</p>
        <p className="mt-1.5 text-sm leading-snug">{labels.newsText}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-fg-subtle">
          <Sparkles className="size-3" /> {labels.summary}
        </p>
      </div>
    </div>
  );
}
