"use client";

import { CheckCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/action-result";
import { deleteAlert, markAllNotificationsRead, setAlertActive } from "@/server/actions/watch-alerts";

function useRunner() {
  const tErr = useTranslations("errors");
  const tOk = useTranslations("success");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(tErr(res.error as never));
      else if (res.message) toast.success(tOk(res.message as never));
    });
  return { pending, run };
}

export function AlertRowControls({ id, active, label }: { id: string; active: boolean; label: string }) {
  const t = useTranslations("alerts");
  const { pending, run } = useRunner();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={t("toggle", { name: label })}
        disabled={pending}
        onClick={() => run(() => setAlertActive(id, !active))}
        className={cn(
          "relative h-6 w-10 rounded-full transition-colors disabled:opacity-60",
          active ? "bg-mint" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-card transition-transform",
            active && "translate-x-4",
          )}
        />
      </button>
      <Button variant="ghost" size="icon" disabled={pending} aria-label={t("delete", { name: label })} onClick={() => run(() => deleteAlert(id))}>
        <Trash2 />
      </Button>
    </div>
  );
}

export function MarkAllRead() {
  const t = useTranslations("alerts");
  const { pending, run } = useRunner();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(markAllNotificationsRead)}>
      <CheckCheck />
      {t("markAllRead")}
    </Button>
  );
}
