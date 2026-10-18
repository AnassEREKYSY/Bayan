/** Central list of app routes, so links and guards never drift apart. */
export const routes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  authCallback: "/auth/callback",
  dashboard: "/dashboard",
  portfolio: "/portfolio",
  transactions: "/transactions",
  markets: "/markets",
  asset: (id: string) => `/assets/${id}`,
  watchlist: "/watchlist",
  news: "/news",
  calendar: "/calendar",
  alerts: "/alerts",
  settings: "/settings",
  admin: "/admin",
} as const;

/** Paths that require a signed-in user. */
export const protectedPrefixes = [
  "/dashboard",
  "/portfolio",
  "/transactions",
  "/markets",
  "/assets",
  "/watchlist",
  "/news",
  "/calendar",
  "/alerts",
  "/settings",
  "/admin",
  "/reset-password",
] as const;

/** Paths only meant for signed-out users. */
export const guestOnlyPaths = ["/login", "/signup", "/forgot-password"] as const;

export function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isGuestOnlyPath(pathname: string): boolean {
  return guestOnlyPaths.some((p) => pathname === p);
}
