import "server-only";

import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters"),
  TWELVE_DATA_API_KEY: optional,
  COINGECKO_API_KEY: optional,
  CASABLANCA_FEED_URL: optional.pipe(z.url().optional()),
  AI_BASE_URL: optional.pipe(z.url().optional()),
  AI_API_KEY: optional,
  AI_MODEL: optional,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

/**
 * Server-only secrets, validated lazily so a missing optional provider key
 * never breaks pages that don't need it.
 */
export function serverEnv(): ServerEnv {
  cached ??= serverSchema.parse(process.env);
  return cached;
}
