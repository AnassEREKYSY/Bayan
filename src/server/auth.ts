import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

/** The signed-in user (validated with Supabase Auth), deduplicated per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect(routes.login);
  return user;
}

export const getProfile = cache(async (): Promise<Tables<"profiles"> | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

export async function requireProfile() {
  await requireUser();
  const profile = await getProfile();
  if (!profile) redirect(routes.login);
  return profile;
}

export async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect(routes.dashboard);
  return profile;
}
