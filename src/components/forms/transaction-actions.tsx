"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { deleteTransaction } from "@/server/actions/transactions";

import type { AssetOption } from "./asset-select";
import { TransactionDialog, type TransactionDraft } from "./transaction-dialog";

/** Visible edit and delete buttons for one transaction, with a confirmation step. */
export function TransactionActions({
  draft,
  assets,
  portfolios,
  label,
}: {
  draft: TransactionDraft & { id: string };
  assets: AssetOption[];
  portfolios: { id: string; name: string }[];
  /** Short description of the row for screen readers ("Marsa Maroc, buy, 12 Nov"). */
  label: string;
}) {
  const t = useTranslations("transactions");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const tOk = useTranslations("success");
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const remove = () =>
    startTransition(async () => {
      const res = await deleteTransaction(draft.id);
      if (res.ok) {
        toast.success(tOk("transactionDeleted"));
        setConfirming(false);
      } else toast.error(tErr(res.error as never));
    });

  return (
    <div className="flex shrink-0 items-center">
      <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label={`${t("edit")} — ${label}`} title={t("edit")}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setConfirming(true)}
        disabled={pending}
        aria-label={`${t("delete")} — ${label}`}
        title={t("delete")}
        className="hover:bg-loss-soft hover:text-loss"
      >
        <Trash2 />
      </Button>

      <TransactionDialog assets={assets} portfolios={portfolios} draft={draft} open={editing} onOpenChange={setEditing} />

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent title={t("deleteConfirm")} description={label} closeLabel={tCommon("close")} className="sm:max-w-md">
          <p className="text-sm text-fg-muted">{t("deleteHint")}</p>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">{tCommon("cancel")}</Button>
            </DialogClose>
            <Button variant="danger" onClick={remove} disabled={pending}>
              <Trash2 />
              {t("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
