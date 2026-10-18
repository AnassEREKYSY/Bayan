/**
 * Returns a same-origin relative path, or the fallback. Prevents open
 * redirects through `?next=` parameters (e.g. "//evil.com" or "https://…").
 */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

/** Constant-time string comparison for secrets. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export function buildContentSecurityPolicy(
  nonce: string,
  supabaseUrl: string,
  opts: { isDev: boolean; upgradeInsecure: boolean },
): string {
  const { isDev, upgradeInsecure } = opts;
  const supabase = new URL(supabaseUrl);
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", supabase.origin, `wss://${supabase.host}`],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };
  const policy = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
  // Only upgrade when the site itself is served over HTTPS (not on http://localhost).
  return upgradeInsecure && !isDev ? `${policy}; upgrade-insecure-requests` : policy;
}
