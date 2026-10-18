"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleWatchlist } from "@/server/actions/watch-alerts";

export function WatchButton({ assetId, watched, withLabel }: { assetId: string; watched: boolean; withLabel?: boolean }) {
  const t = useTranslations("watchlist");
  const tErr = useTranslations("errors");
  const [optimistic, setOptimistic] = useOptimistic(watched);
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      setOptimistic(!optimistic);
      const res = await toggleWatchlist(assetId, !optimistic);
      if (!res.ok) toast.error(tErr(res.error as never));
    });

  const label = optimistic ? t("remove") : t("add");

  return (
    <Button
      variant={withLabel ? "secondary" : "ghost"}
      size={withLabel ? "md" : "icon"}
      onClick={toggle}
      disabled={pending}
      aria-pressed={optimistic}
      aria-label={withLabel ? undefined : label}
    >
      <Star className={cn(optimistic && "fill-accent text-accent")} />
      {withLabel ? label : null}
    </Button>
  );
}
