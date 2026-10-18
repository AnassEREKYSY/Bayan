import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { MobileNav, Sidebar } from "@/components/layout/app-nav";
import { LocaleSwitcher, ThemeToggle } from "@/components/layout/preferences";
import { UserMenu } from "@/components/layout/user-menu";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireUser } from "@/server/auth";
import { countUnreadNotifications } from "@/server/data/content";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, profile] = await Promise.all([requireUser(), requireProfile()]);
  const unread = await countUnreadNotifications(await createClient());
  const isAdmin = profile.role === "admin";

  return (
    <div className="flex min-h-dvh">
      <Sidebar isAdmin={isAdmin} unread={unread} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg/90 px-4 backdrop-blur sm:px-6 lg:px-10">
          <MobileNav isAdmin={isAdmin} unread={unread} />
          <Link href={routes.dashboard} className="lg:hidden" aria-label="Bayan">
            <LogoMark className="size-7" />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
            <div className="ml-2">
              <UserMenu name={profile.display_name ?? ""} email={user.email ?? ""} />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
