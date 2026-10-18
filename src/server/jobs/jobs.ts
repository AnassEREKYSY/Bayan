import "server-only";

import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

import { summaryNumbersSupported } from "@/domain/summary-guard";
import { serverEnv } from "@/lib/env.server";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

import { fetchText } from "./http";
import { configuredProviders, fetchFxRates } from "./providers";

/**
 * Scheduled jobs. They run with the service-role client (no user session),
 * so every write here is to shared market data or to notifications.
 */

export const jobNames = ["fx", "quotes", "news", "summaries", "alerts"] as const;
export type JobName = (typeof jobNames)[number];

interface JobContext {
  /** Paced rounds allowed for rate-limited providers in this run. */
  rounds: number;
}

type JobFn = (db: AdminSupabase, ctx: JobContext) => Promise<Record<string, Json>>;

// ─── FX ─────────────────────────────────────────────────────────────────────
const fxJob: JobFn = async (db) => {
  const { asOf, rates } = await fetchFxRates();
  const rows = Object.entries(rates).map(([quote, rate]) => ({ quote, rate, as_of: asOf }));
  const { error } = await db.from("fx_rates").upsert(rows);
  if (error) throw error;
  return { currencies: rows.length, asOf };
};

// ─── Quotes & price history ─────────────────────────────────────────────────
const BACKFILL_PER_RUN = 2;
const BACKFILL_DAYS = 365;
/** Assets someone holds, follows or has an alert on. Refreshed first. */
async function usedAssetIds(db: AdminSupabase): Promise<Set<string>> {
  const [tx, watch, alerts] = await Promise.all([
    db.from("transactions").select("asset_id").limit(50_000),
    db.from("watchlist_items").select("asset_id").limit(50_000),
    db.from("alert_rules").select("asset_id").eq("is_active", true).limit(50_000),
  ]);
  return new Set([...(tx.data ?? []), ...(watch.data ?? []), ...(alerts.data ?? [])].map((r) => r.asset_id));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const quotesJob: JobFn = async (db, { rounds }) => {
  const [{ data: assets, error }, used] = await Promise.all([
    db.from("assets").select("id, symbol, market, provider_ref, quote:asset_quotes(updated_at)").eq("is_active", true),
    usedAssetIds(db),
  ]);
  if (error) throw error;

  type Row = { id: string; symbol: string; market: string; provider_ref: string | null; quote: { updated_at: string } | null };
  const rows = (assets ?? []) as unknown as Row[];
  const stalest = (a: Row, b: Row) => (a.quote?.updated_at ?? "").localeCompare(b.quote?.updated_at ?? "");
  const fresh = (r: Row) => r.quote != null && Date.now() - Date.parse(r.quote.updated_at) < 12 * 60 * 60_000;

  const report: Record<string, Json> = {};
  for (const provider of configuredProviders(serverEnv())) {
    const supported = rows.filter((a) => provider.supports(a as never));
    // Providers that price everything in one request (the Casablanca feed)
    // take every asset; rate-limited ones take what people use, stalest first.
    const queue =
      supported.length <= provider.batchSize
        ? supported
        : supported.filter((a) => used.has(a.id) && !fresh(a)).sort(stalest);
    if (queue.length === 0) continue;

    let requested = 0;
    let updated = 0;
    const errors: string[] = [];
    for (let round = 0; round < rounds && queue.length > 0; round++) {
      if (round > 0) await sleep(provider.roundPauseMs ?? 0);
      const batch = queue.splice(0, provider.batchSize) as never[];
      requested += batch.length;
      try {
        const quotes = await provider.quotes(batch);
        if (quotes.length > 0) {
          const now = new Date().toISOString();
          const { error: qErr } = await db.from("asset_quotes").upsert(
            quotes.map((q) => ({
              asset_id: q.assetId,
              price: q.price,
              previous_close: q.previousClose,
              as_of: q.asOf,
              source: q.source,
              updated_at: now,
            })),
          );
          if (qErr) throw qErr;
          const { error: pErr } = await db
            .from("asset_prices")
            .upsert(quotes.map((q) => ({ asset_id: q.assetId, price_date: q.asOf.slice(0, 10), close: q.price })));
          if (pErr) throw pErr;
        }
        updated += quotes.length;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "failed");
      }

      // Backfill a year of history for assets that have little or none.
      if (provider.history) {
        let done = 0;
        for (const asset of batch as Row[]) {
          if (done >= BACKFILL_PER_RUN) break;
          const { count } = await db.from("asset_prices").select("asset_id", { count: "exact", head: true }).eq("asset_id", asset.id);
          if ((count ?? 0) >= 30) continue;
          try {
            const points = await provider.history(asset as never, BACKFILL_DAYS);
            if (points.length) {
              await db.from("asset_prices").upsert(points.map((p) => ({ asset_id: asset.id, price_date: p.date, close: p.close })));
            }
            done++;
          } catch {
            // History is best-effort; quotes above already succeeded.
          }
        }
      }
    }
    report[provider.name] = { requested, updated, waiting: queue.length, ...(errors.length ? { errors } : {}) };
  }
  return report;
};

// ─── News (RSS) ─────────────────────────────────────────────────────────────
/** Feeds checked in October 2026. Add or remove sources here. */
export const newsSources = [
  { name: "Médias24", url: "https://medias24.com/feed/", language: "fr" },
  { name: "Hespress Économie", url: "https://fr.hespress.com/economie/feed", language: "fr" },
] as const;

const rssItem = z.object({
  title: z.string(),
  link: z.string(),
  pubDate: z.string().optional(),
  description: z.string().optional(),
});

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&#8217;|&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const newsJob: JobFn = async (db) => {
  const { data: assets, error } = await db.from("assets").select("id, keywords").eq("is_active", true);
  if (error) throw error;
  const matchers = (assets ?? []).flatMap((a) =>
    a.keywords
      .filter((k) => k.trim().length >= 3)
      .map((k) => ({
        assetId: a.id,
        re: new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(k.trim())}([^\\p{L}\\p{N}]|$)`, "iu"),
      })),
  );

  const parser = new XMLParser({ ignoreAttributes: true, processEntities: false });
  const report: Record<string, Json> = {};

  for (const source of newsSources) {
    try {
      const xml = parser.parse(await fetchText(source.url)) as { rss?: { channel?: { item?: unknown } } };
      const rawItems = xml.rss?.channel?.item;
      const items = (Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : []).slice(0, 50);

      let stored = 0;
      for (const raw of items) {
        const parsed = rssItem.safeParse(raw);
        if (!parsed.success || !parsed.data.link.startsWith("https://")) continue;
        const title = stripHtml(parsed.data.title).slice(0, 400);
        const excerpt = stripHtml(parsed.data.description ?? "").slice(0, 2000);
        const haystack = `${title} ${excerpt}`;
        const assetIds = [...new Set(matchers.filter((m) => m.re.test(haystack)).map((m) => m.assetId))];
        if (assetIds.length === 0) continue; // keep only news about tracked assets

        const published = parsed.data.pubDate ? new Date(parsed.data.pubDate) : new Date();
        const { data: news, error: nErr } = await db
          .from("news_items")
          .upsert(
            {
              title,
              url: parsed.data.link,
              source: source.name,
              language: source.language,
              published_at: Number.isNaN(published.getTime()) ? new Date().toISOString() : published.toISOString(),
              content_excerpt: excerpt || null,
            },
            { onConflict: "url", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle();
        if (nErr || !news) continue;

        await db.from("news_item_assets").upsert(assetIds.map((asset_id) => ({ news_id: news.id, asset_id })));
        stored++;
      }
      report[source.name] = { scanned: items.length, stored };
    } catch (e) {
      report[source.name] = { error: e instanceof Error ? e.message : "failed" };
    }
  }
  return report;
};

// ─── AI summaries ───────────────────────────────────────────────────────────
const SUMMARIES_PER_RUN = 10;
const summarySchema = z.object({ fr: z.string().min(10).max(600), en: z.string().min(10).max(600) });

const SYSTEM_PROMPT = [
  "You summarise financial news for individual investors.",
  "Use only facts stated in the text. Never add numbers, predictions, opinions or advice.",
  "Never tell the reader to buy, sell or hold anything.",
  'Answer with JSON only: {"fr": "...", "en": "..."} — each at most 2 short sentences in plain language.',
].join(" ");

const summariesJob: JobFn = async (db) => {
  const env = serverEnv();
  if (!env.AI_BASE_URL || !env.AI_API_KEY || !env.AI_MODEL) {
    const skipped: Record<string, Json> = { skipped: "AI not configured" };
    return skipped;
  }

  const { data: pending, error } = await db
    .from("news_items")
    .select("id, title, content_excerpt")
    .eq("summary_status", "pending")
    .order("created_at", { ascending: true })
    .limit(SUMMARIES_PER_RUN);
  if (error) throw error;

  let done = 0;
  let rejected = 0;
  for (const item of pending ?? []) {
    const source = `${item.title}\n\n${item.content_excerpt ?? ""}`.trim();
    if (source.length < 80) {
      await db.from("news_items").update({ summary_status: "skipped" }).eq("id", item.id);
      continue;
    }

    try {
      const res = await fetch(`${env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(30_000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.AI_API_KEY}` },
        body: JSON.stringify({
          model: env.AI_MODEL,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: source },
          ],
        }),
      });
      if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const parsed = summarySchema.safeParse(JSON.parse(body.choices?.[0]?.message?.content ?? "{}"));

      const valid =
        parsed.success &&
        summaryNumbersSupported(parsed.data.fr, source) &&
        summaryNumbersSupported(parsed.data.en, source);

      await db
        .from("news_items")
        .update(
          valid
            ? {
                summary_fr: parsed.data.fr,
                summary_en: parsed.data.en,
                summary_status: "done",
                summarized_at: new Date().toISOString(),
              }
            : { summary_status: "rejected", summarized_at: new Date().toISOString() },
        )
        .eq("id", item.id);
      if (valid) done++;
      else rejected++;
    } catch {
      // Leave it pending; it will be retried on the next run.
    }
  }
  return { done, rejected };
};

// ─── Alerts & event reminders ───────────────────────────────────────────────
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const alertsJob: JobFn = async (db) => {
  const { data: rules, error } = await db
    .from("alert_rules")
    .select("*, asset:assets(symbol, currency)")
    .eq("is_active", true);
  if (error) throw error;

  type RuleRow = {
    id: string;
    user_id: string;
    asset_id: string;
    type: "price_above" | "price_below" | "daily_move";
    threshold: number;
    last_triggered_at: string | null;
    asset: { symbol: string; currency: string } | null;
  };

  const assetIds = [...new Set((rules ?? []).map((r) => r.asset_id))];
  const { data: quotes } = assetIds.length
    ? await db.from("asset_quotes").select("*").in("asset_id", assetIds)
    : { data: [] };
  const quoteOf = new Map((quotes ?? []).map((q) => [q.asset_id, q]));

  let triggered = 0;
  const now = Date.now();
  for (const rule of (rules ?? []) as unknown as RuleRow[]) {
    const q = quoteOf.get(rule.asset_id);
    if (!q || !rule.asset) continue;
    if (rule.last_triggered_at && now - Date.parse(rule.last_triggered_at) < COOLDOWN_MS) continue;

    const price = Number(q.price);
    const prev = q.previous_close == null ? null : Number(q.previous_close);
    const move = prev && prev > 0 ? ((price - prev) / prev) * 100 : null;
    const threshold = Number(rule.threshold);

    const hit =
      (rule.type === "price_above" && price >= threshold) ||
      (rule.type === "price_below" && price <= threshold) ||
      (rule.type === "daily_move" && move != null && Math.abs(move) >= threshold);
    if (!hit) continue;

    const title =
      rule.type === "daily_move"
        ? `${rule.asset.symbol} ${move! >= 0 ? "+" : ""}${move!.toFixed(2)} %`
        : `${rule.asset.symbol} ${price.toFixed(2)} ${rule.asset.currency}`;

    await db.from("notifications").insert({
      user_id: rule.user_id,
      kind: "alert",
      title,
      body: rule.type,
      asset_id: rule.asset_id,
    });
    await db.from("alert_rules").update({ last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
    triggered++;
  }

  // Remind holders and watchers 3 days before an event.
  const today = new Date().toISOString().slice(0, 10);
  const in3 = new Date(now + 3 * 86_400_000).toISOString().slice(0, 10);
  const { data: events } = await db
    .from("corporate_events")
    .select("id, asset_id, title, event_date, type")
    .gte("event_date", today)
    .lte("event_date", in3);

  let reminders = 0;
  for (const ev of events ?? []) {
    const [{ data: holders }, { data: watchers }] = await Promise.all([
      db.from("transactions").select("user_id").eq("asset_id", ev.asset_id),
      db.from("watchlist_items").select("user_id").eq("asset_id", ev.asset_id),
    ]);
    const users = new Set([...(holders ?? []), ...(watchers ?? [])].map((r) => r.user_id));
    const title = `${ev.title} · ${ev.event_date}`.slice(0, 200);
    for (const userId of users) {
      const { count } = await db
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("kind", "event")
        .eq("title", title);
      if (count) continue;
      await db.from("notifications").insert({ user_id: userId, kind: "event", title, body: ev.type, asset_id: ev.asset_id });
      reminders++;
    }
  }

  return { triggered, reminders };
};

const registry: Record<JobName, JobFn> = {
  fx: fxJob,
  quotes: quotesJob,
  news: newsJob,
  summaries: summariesJob,
  alerts: alertsJob,
};

/** Runs jobs in order, logging each one to job_runs. One failure never stops the others. */
/**
 * `rounds` lets the scheduled run spend a few minutes pacing rate-limited
 * providers (8 requests a minute on Twelve Data's free plan), while an admin
 * clicking "refresh" gets a single quick round.
 */
export async function runJobs(db: AdminSupabase, names: readonly JobName[], { rounds = 1 }: { rounds?: number } = {}) {
  const ctx: JobContext = { rounds: Math.min(Math.max(1, rounds), 4) };
  const results: Record<string, unknown> = {};
  for (const name of names) {
    const { data: run } = await db.from("job_runs").insert({ job: name }).select("id").single();
    try {
      const detail = await registry[name](db, ctx);
      results[name] = { ok: true, ...detail };
      if (run) await db.from("job_runs").update({ ok: true, finished_at: new Date().toISOString(), detail }).eq("id", run.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "failed";
      results[name] = { ok: false, error: message };
      if (run)
        await db.from("job_runs").update({ ok: false, finished_at: new Date().toISOString(), detail: { error: message } }).eq("id", run.id);
    }
  }
  return results;
}
