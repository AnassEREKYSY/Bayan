"use client";

import { BellPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { initialActionState } from "@/server/action-result";
import { createAlert } from "@/server/actions/watch-alerts";

import { FormError, useActionFeedback } from "./action-form";
import { AssetSelect, type AssetOption } from "./asset-select";

export function AlertDialog({
  assets,
  fixedAsset,
  variant = "primary",
}: {
  assets?: AssetOption[];
  fixedAsset?: AssetOption;
  variant?: "primary" | "secondary";
}) {
  const t = useTranslations("alerts");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <BellPlus />
          {t("create")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("create")} description={t("createHint")} closeLabel={tc("close")}>
        {open ? <AlertForm assets={assets ?? []} fixedAsset={fixedAsset} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function AlertForm({ assets, fixedAsset, onDone }: { assets: AssetOption[]; fixedAsset?: AssetOption; onDone: () => void }) {
  const t = useTranslations("alerts");
  const tType = useTranslations("enums.alertType");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(createAlert, initialActionState);
  const { fieldError, formError } = useActionFeedback(state, onDone);
  const [type, setType] = useState<"price_above" | "price_below" | "daily_move">("price_above");
  const [asset, setAsset] = useState<AssetOption | undefined>(fixedAsset);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {fixedAsset ? (
        <input type="hidden" name="assetId" value={fixedAsset.id} />
      ) : (
        <Field id="alert-asset" label={t("asset")} error={fieldError("assetId")}>
          <AssetSelect id="alert-asset" name="assetId" assets={assets} onChange={setAsset} />
        </Field>
      )}
      <Field id="alert-type" label={t("condition")}>
        <Select id="alert-type" name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          {(["price_above", "price_below", "daily_move"] as const).map((v) => (
            <option key={v} value={v}>
              {tType(v)}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        id="alert-threshold"
        label={type === "daily_move" ? t("thresholdPct") : `${t("thresholdPrice")}${asset ? ` (${asset.currency})` : ""}`}
        hint={type === "daily_move" ? t("thresholdPctHint") : undefined}
        error={fieldError("threshold")}
      >
        <Input id="alert-threshold" name="threshold" type="number" inputMode="decimal" step="any" min="0" required />
      </Field>
      <FormError message={formError} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : tc("create")}
        </Button>
      </div>
    </form>
  );
}
