import { BellRing, CalendarDays, Layers, Newspaper, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Lattice } from "@/components/brand/lattice";
import { Logo } from "@/components/brand/logo";
import { AssetAvatar, ChangeBadge } from "@/components/finance/display";
import { LocaleSwitcher, ThemeToggle } from "@/components/layout/preferences";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/domain/money";
import { routes } from "@/lib/routes";
import { getUser } from "@/server/auth";

const MARKETS = ["casablanca", "us", "europe", "commodities", "crypto"] as const;

export default async function LandingPage() {
  const [t, locale, user] = await Promise.all([getTranslations("landing"), getLocale(), getUser()]);
  const startHref = user ? routes.dashboard : routes.signup;

  const features = [
    { icon: Layers, key: "oneView" },
    { icon: Newspaper, key: "explained" },
    { icon: CalendarDays, key: "calendar" },
    { icon: BellRing, key: "alerts" },
  ] as const;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href={routes.home} aria-label="Bayan">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg md:block">
            {t("navFeatures")}
          </a>
          <a href="#how" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg md:block">
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
        {/* Hero: the one bold moment — a Majorelle panel carrying the product. */}
        <section className="mx-auto max-w-6xl px-3 sm:px-5">
          <div className="relative overflow-hidden rounded-[28px] bg-[#4b45d6] px-6 pt-12 pb-10 text-white sm:px-12 sm:pt-16 lg:pb-12 dark:bg-[#2c2896]">
            <Lattice />
            <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              <div>
                <h1 className="font-display text-[42px] leading-[1.02] text-balance sm:text-[60px]">{t("title")}</h1>
                <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-white/80">{t("subtitle")}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-white text-[#2c2896] hover:bg-white/90">
                    <Link href={startHref}>{t("cta")}</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35)] hover:bg-white/10 hover:text-white"
                  >
                    <a href="#how">{t("ctaSecondary")}</a>
                  </Button>
                </div>
                <p className="mt-5 text-sm text-white/65">{t("free")}</p>
              </div>

              <ProductPreview
                locale={locale}
                labels={{
                  total: t("preview.total"),
                  today: t("preview.today"),
                  news: t("preview.news"),
                  newsText: t("preview.newsText"),
                  summary: t("preview.summary"),
                }}
              />
            </div>
          </div>
        </section>

        {/* Markets covered, in the same colours the app uses for them. */}
        <section className="mx-auto max-w-6xl px-5 pt-10 sm:px-8">
          <h2 className="sr-only">{t("marketsLabel")}</h2>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-fg-muted">
            {MARKETS.map((m) => (
              <li key={m} className={`market-${m} inline-flex items-center gap-2`}>
                <span aria-hidden className="size-2 rounded-full bg-[var(--market)]" />
                {t(`markets.${m}`)}
              </li>
            ))}
          </ul>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-6 px-5 pt-24 sm:px-8">
          <h2 className="max-w-xl font-display text-[32px] leading-[1.1] sm:text-[38px]">{t("featuresTitle")}</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            {features.map(({ icon: Icon, key }) => (
              <div key={key} className="bg-surface p-7 sm:p-8">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.01em]">{t(`features.${key}.title`)}</h3>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-fg-muted">{t(`features.${key}.text`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-6 px-5 pt-24 sm:px-8">
          <h2 className="font-display text-[32px] leading-[1.1] sm:text-[38px]">{t("howTitle")}</h2>
          <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {(["one", "two", "three"] as const).map((step, i) => (
              <li key={step} className="relative">
                {i < 2 ? <span aria-hidden className="absolute top-4 right-[-1.5rem] left-11 hidden h-px bg-border-strong md:block" /> : null}
                <span className="relative flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg ring-4 ring-bg">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.01em]">{t(`how.${step}.title`)}</h3>
                <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-fg-muted">{t(`how.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-5 pt-24 sm:px-8">
          <div className="grid gap-10 border-t border-border pt-12 md:grid-cols-2">
            <div className="flex gap-4">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">{t("principles.inform.title")}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{t("principles.inform.text")}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">{t("principles.privacy.title")}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{t("principles.privacy.text")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-3 pt-24 sm:px-5">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] border border-border bg-surface px-6 py-10 sm:px-12 md:flex-row md:items-center">
            <p className="max-w-xl font-display text-[26px] leading-[1.15] sm:text-[30px]">{t("finalTitle")}</p>
            <Button asChild size="lg">
              <Link href={startHref}>{t("cta")}</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto mt-16 flex max-w-6xl flex-col gap-3 border-t border-border px-5 py-8 text-sm text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo className="opacity-80 [&_span]:text-[17px]" markClassName="size-6" />
        <span>{t("footerNote")}</span>
        <span>© {new Date().getFullYear()} Bayan</span>
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
  const line = "M0,58 C24,56 36,48 60,50 S98,34 120,38 S158,44 180,30 S222,24 244,26 S282,12 300,10";

  return (
    <div aria-hidden className="relative text-fg sm:mb-28">
      <div className="relative rounded-2xl bg-surface p-6 shadow-[0_24px_60px_-20px_rgb(11_16_32/0.55)]">
        <p className="text-sm font-medium text-fg-muted">{labels.total}</p>
        <p className="mt-1.5 font-display text-[34px] leading-none tabular">{formatMoney(48230.5, "MAD", locale)}</p>
        <p className="mt-2.5 flex items-center gap-2 text-sm">
          <ChangeBadge value={0.0086} locale={locale} />
          <span className="font-semibold text-gain tabular">+{formatMoney(412.3, "MAD", locale)}</span>
          <span className="text-fg-subtle">{labels.today}</span>
        </p>
        <svg viewBox="0 0 300 72" className="mt-5 h-16 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="preview-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--primary-line)" stopOpacity="0.18" />
              <stop offset="1" stopColor="var(--primary-line)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L300,72 L0,72Z`} fill="url(#preview-fill)" />
          <path d={line} fill="none" stroke="var(--primary-line)" strokeWidth="2.25" vectorEffect="non-scaling-stroke" />
        </svg>
        <ul className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.symbol} className="flex items-center gap-3 py-2.5">
              <AssetAvatar symbol={r.symbol} market={r.market} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
              <span className="hidden text-sm tabular min-[400px]:inline">{r.value}</span>
              <span className="w-[68px] text-right">
                <ChangeBadge value={r.change} locale={locale} />
              </span>
            </li>
          ))}
        </ul>
        <div className="absolute top-full -left-3 -mt-5 hidden w-72 rounded-xl border border-border bg-surface p-4 shadow-pop sm:block lg:-left-12">
          <p className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
            {labels.news}
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">MSA</span>
          </p>
          <p className="mt-2 text-sm leading-snug">{labels.newsText}</p>
          <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-fg-subtle">
            <Sparkles className="size-3" /> {labels.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
