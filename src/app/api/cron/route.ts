import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env.server";
import { timingSafeEqual } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobNames, runJobs, type JobName } from "@/server/jobs/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Scheduled job endpoint, called by Vercel Cron (see vercel.json) with
 * `Authorization: Bearer <CRON_SECRET>`.
 *   GET /api/cron?jobs=fx,quotes
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(auth, `Bearer ${serverEnv().CRON_SECRET}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const requested = (request.nextUrl.searchParams.get("jobs") ?? jobNames.join(","))
    .split(",")
    .map((j) => j.trim())
    .filter((j): j is JobName => (jobNames as readonly string[]).includes(j));

  if (requested.length === 0) {
    return NextResponse.json({ error: "no valid jobs" }, { status: 400 });
  }

  const results = await runJobs(createAdminClient(), requested);
  return NextResponse.json({ ok: true, results });
}
