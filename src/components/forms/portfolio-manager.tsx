"use client";

import { FolderCog, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { initialActionState, type ActionResult } from "@/server/action-result";
import { deletePortfolio, savePortfolio, setDefaultPortfolio } from "@/server/actions/portfolios";

import { useActionFeedback } from "./action-form";

interface PortfolioItem {
  id: string;
  name: string;
  is_default: boolean;
}

export function PortfolioManager({ portfolios }: { portfolios: PortfolioItem[] }) {
  const t = useTranslations("portfolio");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const tOk = useTranslations("success");
  const [pending, startTransition] = useTransition();
  const [state, action, saving] = useActionState(savePortfolio, initialActionState);
  const { fieldError } = useActionFeedback(state);

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (res.message) toast.success(tOk(res.message as never));
      } else toast.error(tErr(res.error as never));
    });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <FolderCog />
          {t("manage")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("manage")} description={t("manageHint")} closeLabel={tc("close")}>
        <ul className="mb-6 divide-y divide-border rounded-md border border-border">
          {portfolios.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2.5">
              <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
              {p.is_default ? (
                <Badge tone="primary">{t("default")}</Badge>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label={t("makeDefault", { name: p.name })}
                    onClick={() => run(() => setDefaultPortfolio(p.id))}
                  >
                    <Star />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label={t("delete", { name: p.name })}
                    onClick={() => {
                      if (window.confirm(t("deleteConfirm", { name: p.name }))) run(() => deletePortfolio(p.id));
                    }}
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>

        <form action={action} className="flex items-end gap-2">
          <Field id="new-portfolio" label={t("newName")} error={fieldError("name")} className="flex-1">
            <Input id="new-portfolio" name="name" maxLength={60} required placeholder={t("namePlaceholder")} />
          </Field>
          <Button type="submit" disabled={saving}>
            {tc("create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
