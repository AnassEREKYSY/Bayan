import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses RLS — use only in trusted server code
 * (scheduled jobs, account deletion) and never with user-controlled filters
 * that are not checked first.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type AdminSupabase = ReturnType<typeof createAdminClient>;
