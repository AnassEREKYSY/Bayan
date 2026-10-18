import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/misc";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { NewsItem } from "@/server/data/content";

function relativeTime(iso: string, locale: string) {
  const diff = (Date.parse(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(iso));
}

export async function NewsList({ items, locale, compact }: { items: NewsItem[]; locale: string; compact?: boolean }) {
  const t = await getTranslations("news");

  return (
    <ul className={cn("flex flex-col", compact ? "gap-4" : "gap-3")}>
      {items.map((n) => {
        const summary = n.summary_status === "done" ? (locale === "fr" ? n.summary_fr : n.summary_en) : null;
        const text = summary ?? n.content_excerpt;
        return (
          <li key={n.id} className={cn(!compact && "rounded-lg border border-border bg-surface p-5 shadow-card")}>
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
              <span className="font-semibold text-fg-muted">{n.source}</span>
              <span aria-hidden>·</span>
              <time dateTime={n.published_at}>{relativeTime(n.published_at, locale)}</time>
              {n.assets.slice(0, 3).map((a) => (
                <Link key={a.id} href={routes.asset(a.id)}>
                  <Badge tone="primary">{a.symbol}</Badge>
                </Link>
              ))}
            </div>
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-start gap-1.5 font-semibold text-fg hover:text-primary"
            >
              <span className={cn(compact ? "text-sm" : "text-[15px]")}>{n.title}</span>
              <ExternalLink className="mt-1 size-3.5 shrink-0 text-fg-subtle group-hover:text-primary" aria-hidden />
              <span className="sr-only">{t("opensNewTab")}</span>
            </a>
            {text && !(compact && !summary) ? (
              <p className={cn("mt-1.5 text-sm text-fg-muted", compact && "line-clamp-2")}>{text}</p>
            ) : null}
            {summary && !compact ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-fg-subtle">
                <Sparkles className="size-3" aria-hidden />
                {t("aiSummary")}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
