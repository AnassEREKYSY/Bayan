"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowLeftRight,
  Bell,
  CalendarDays,
  ChartCandlestick,
  LayoutDashboard,
  Menu,
  Newspaper,
  PieChart,
  Settings,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const mainItems = [
  { href: routes.dashboard, key: "dashboard", icon: LayoutDashboard },
  { href: routes.portfolio, key: "portfolio", icon: PieChart },
  { href: routes.transactions, key: "transactions", icon: ArrowLeftRight },
  { href: routes.markets, key: "markets", icon: ChartCandlestick },
  { href: routes.watchlist, key: "watchlist", icon: Star },
  { href: routes.news, key: "news", icon: Newspaper },
  { href: routes.calendar, key: "calendar", icon: CalendarDays },
  { href: routes.alerts, key: "alerts", icon: Bell },
] as const;

type NavKey = (typeof mainItems)[number]["key"] | "settings" | "admin";

function NavLinks({ isAdmin, unread, onNavigate }: { isAdmin: boolean; unread: number; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const item = (href: string, key: NavKey, Icon: typeof Bell, badge?: number) => (
    <li key={key}>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={isActive(href) ? "page" : undefined}
        className={cn(
          "relative flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors",
          isActive(href)
            ? "bg-white/[0.07] font-semibold text-white before:absolute before:top-2.5 before:bottom-2.5 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-mint"
            : "font-medium text-navy-muted hover:bg-white/[0.04] hover:text-white",
        )}
      >
        <Icon className={cn("size-[18px]", isActive(href) ? "text-mint" : "text-navy-muted")} strokeWidth={isActive(href) ? 2.2 : 1.8} />
        <span className="flex-1">{t(key)}</span>
        {badge ? (
          <span className="min-w-5 rounded-full bg-mint px-1.5 text-center text-[11px] leading-5 font-bold text-mint-fg tabular">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    </li>
  );

  return (
    <nav aria-label={t("label")} className="flex flex-1 flex-col">
      <ul className="flex flex-col gap-0.5">
        {mainItems.map(({ href, key, icon }) => item(href, key, icon, key === "alerts" ? unread : undefined))}
      </ul>
      <ul className="mt-auto flex flex-col gap-0.5 border-t border-white/10 pt-4">
        {item(routes.settings, "settings", Settings)}
        {isAdmin ? item(routes.admin, "admin", ShieldCheck) : null}
      </ul>
    </nav>
  );
}

export function Sidebar({ isAdmin, unread }: { isAdmin: boolean; unread: number }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-navy px-3 pt-6 pb-4 lg:flex">
      <Link href={routes.dashboard} className="mb-9 px-3">
        <Logo onDark />
      </Link>
      <NavLinks isAdmin={isAdmin} unread={unread} />
    </aside>
  );
}

export function MobileNav({ isAdmin, unread }: { isAdmin: boolean; unread: number }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="relative -ml-1 rounded-md p-2 text-fg-muted hover:bg-surface-muted lg:hidden"
        aria-label={t("open")}
      >
        <Menu className="size-5" />
        {unread ? <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-mint ring-2 ring-bg" /> : null}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(11_16_32/0.5)] backdrop-blur-[2px] lg:hidden" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-navy px-3 pt-6 pb-4 shadow-pop lg:hidden">
          <DialogPrimitive.Title className="sr-only">{t("label")}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{t("label")}</DialogPrimitive.Description>
          <div className="mb-9 flex items-center justify-between px-3">
            <Logo onDark />
            <DialogPrimitive.Close className="rounded-md p-1.5 text-navy-muted hover:bg-white/10 hover:text-white" aria-label={t("close")}>
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <NavLinks isAdmin={isAdmin} unread={unread} onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
