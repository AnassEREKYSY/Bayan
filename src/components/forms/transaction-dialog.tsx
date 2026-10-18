"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { initialActionState } from "@/server/action-result";
import { saveTransaction } from "@/server/actions/transactions";

import { FormError, useActionFeedback } from "./action-form";
import { AssetSelect, type AssetOption } from "./asset-select";

export interface TransactionDraft {
  id?: string;
  portfolioId?: string;
  assetId?: string;
  type?: "buy" | "sell" | "dividend" | "fee";
  date?: string;
  quantity?: number;
  price?: number;
  fees?: number;
  amount?: number;
  note?: string | null;
}

interface Props {
  assets: AssetOption[];
  portfolios: { id: string; name: string }[];
  defaultPortfolioId?: string;
  draft?: TransactionDraft;
  trigger?: React.ReactNode;
  /** Controlled mode (e.g. opened from a menu). When set, no trigger is rendered. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransactionDialog(props: Props) {
  const { assets, portfolios, defaultPortfolioId, draft, trigger } = props;
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const [innerOpen, setInnerOpen] = useState(false);
  const controlled = props.open !== undefined;
  const open = controlled ? props.open! : innerOpen;
  const setOpen = controlled ? (v: boolean) => props.onOpenChange?.(v) : setInnerOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlled ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus />
              {t("add")}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent title={draft?.id ? t("edit") : t("add")} description={t("formHint")} closeLabel={tc("close")}>
        {open ? (
          <TransactionForm
            assets={assets}
            portfolios={portfolios}
            defaultPortfolioId={defaultPortfolioId}
            draft={draft}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  assets,
  portfolios,
  defaultPortfolioId,
  draft,
  onDone,
}: Omit<Props, "trigger" | "open" | "onOpenChange"> & { onDone: () => void }) {
  const t = useTranslations("transactions");
  const te = useTranslations("enums.transactionType");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(saveTransaction, initialActionState);
  const { fieldError, formError } = useActionFeedback(state, onDone);

  const [type, setType] = useState(draft?.type ?? "buy");
  const [asset, setAsset] = useState(assets.find((a) => a.id === draft?.assetId));
  const isTrade = type === "buy" || type === "sell";
  const today = new Date().toISOString().slice(0, 10);
  const unit = asset ? ` (${asset.currency})` : "";

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {draft?.id ? <input type="hidden" name="id" value={draft.id} /> : null}

      <div role="radiogroup" aria-label={t("type")} className="grid grid-cols-4 gap-1 rounded-md bg-surface-muted p-1">
        {(["buy", "sell", "dividend", "fee"] as const).map((v) => (
          <label
            key={v}
            className="cursor-pointer rounded-[5px] py-1.5 text-center text-sm font-semibold text-fg-muted has-[:checked]:bg-surface has-[:checked]:text-fg has-[:checked]:shadow-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name="type"
              value={v}
              checked={type === v}
              onChange={() => setType(v)}
              className="sr-only"
            />
            {te(v)}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tx-asset" label={t("asset")} error={fieldError("assetId")} className="sm:col-span-2">
          <AssetSelect
            id="tx-asset"
            name="assetId"
            assets={assets}
            defaultValue={draft?.assetId}
            invalid={!!fieldError("assetId")}
            onChange={setAsset}
          />
        </Field>

        <Field id="tx-portfolio" label={t("portfolio")} error={fieldError("portfolioId")}>
          <Select id="tx-portfolio" name="portfolioId" defaultValue={draft?.portfolioId ?? defaultPortfolioId}>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="tx-date" label={t("date")} error={fieldError("date")}>
          <Input id="tx-date" name="date" type="date" max={today} defaultValue={draft?.date ?? today} required />
        </Field>

        {isTrade ? (
          <>
            <Field id="tx-qty" label={t("quantity")} error={fieldError("quantity")}>
              <Input
                id="tx-qty"
                name="quantity"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                defaultValue={draft?.quantity ?? ""}
                aria-invalid={!!fieldError("quantity") || undefined}
                required
              />
            </Field>
            <Field id="tx-price" label={`${t("price")}${unit}`} error={fieldError("price")}>
              <Input
                id="tx-price"
                name="price"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                defaultValue={draft?.price ?? ""}
                required
              />
            </Field>
            <Field id="tx-fees" label={`${t("fees")}${unit}`} hint={t("feesHint")} error={fieldError("fees")}>
              <Input
                id="tx-fees"
                name="fees"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                defaultValue={draft?.fees ?? 0}
              />
            </Field>
          </>
        ) : (
          <Field
            id="tx-amount"
            label={`${type === "dividend" ? t("dividendAmount") : t("feeAmount")}${unit}`}
            error={fieldError("amount")}
            className="sm:col-span-2"
          >
            <Input
              id="tx-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              defaultValue={draft?.amount ?? ""}
              aria-invalid={!!fieldError("amount") || undefined}
              required
            />
          </Field>
        )}

        <Field id="tx-note" label={t("note")} error={fieldError("note")} className="sm:col-span-2">
          <Textarea id="tx-note" name="note" maxLength={500} rows={2} defaultValue={draft?.note ?? ""} />
        </Field>
      </div>

      <FormError message={formError} />

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
      </div>
    </form>
  );
}
