import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

import type { Database } from "./database.types";

/** Supabase client for Client Components. Uses the public anon key + RLS. */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
