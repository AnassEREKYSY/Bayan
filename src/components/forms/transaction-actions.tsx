"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTransaction } from "@/server/actions/transactions";

import type { AssetOption } from "./asset-select";
import { TransactionDialog, type TransactionDraft } from "./transaction-dialog";

export function TransactionActions({
  draft,
  assets,
  portfolios,
}: {
  draft: TransactionDraft & { id: string };
  assets: AssetOption[];
  portfolios: { id: string; name: string }[];
}) {
  const t = useTranslations("transactions");
  const tErr = useTranslations("errors");
  const tOk = useTranslations("success");
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const remove = () => {
    if (!window.confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      const res = await deleteTransaction(draft.id);
      if (res.ok) toast.success(tOk("transactionDeleted"));
      else toast.error(tErr(res.error as never));
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending} aria-label={t("actions")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-loss" onSelect={remove}>
            <Trash2 className="!text-loss" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TransactionDialog assets={assets} portfolios={portfolios} draft={draft} open={editing} onOpenChange={setEditing} />
    </>
  );
}
