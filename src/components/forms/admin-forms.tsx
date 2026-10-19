"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { initialActionState } from "@/server/action-result";
import { createAsset, createEvent, deleteEvent, importPrices, runAllJobs } from "@/server/actions/admin";

import { FormError, useActionFeedback } from "./action-form";
import { AssetSelect, type AssetOption } from "./asset-select";

export function RunJobsButton() {
  const t = useTranslations("admin");
  const tErr = useTranslations("errors");
  const tOk = useTranslations("success");
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await runAllJobs();
          if (res.ok) toast.success(tOk("jobsDone"));
          else toast.error(tErr(res.error as never));
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} />
      {pending ? t("running") : t("runJobs")}
    </Button>
  );
}

export function AssetForm() {
  const t = useTranslations("admin");
  const tEnum = useTranslations("enums");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(createAsset, initialActionState);
  const { fieldError, formError } = useActionFeedback(state);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field id="a-symbol" label={t("symbol")} error={fieldError("symbol")}>
        <Input id="a-symbol" name="symbol" required maxLength={20} />
      </Field>
      <Field id="a-name" label={t("name")} error={fieldError("name")}>
        <Input id="a-name" name="name" required maxLength={120} />
      </Field>
      <Field id="a-market" label={t("market")}>
        <Select id="a-market" name="market" defaultValue="casablanca">
          {(["casablanca", "us", "europe", "commodities", "crypto"] as const).map((m) => (
            <option key={m} value={m}>
              {tEnum(`market.${m}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="a-class" label={t("assetClass")}>
        <Select id="a-class" name="assetClass" defaultValue="stock">
          {(["stock", "etf", "index", "commodity", "crypto"] as const).map((c) => (
            <option key={c} value={c}>
              {tEnum(`assetClass.${c}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="a-currency" label={t("currency")} error={fieldError("currency")}>
        <Input id="a-currency" name="currency" defaultValue="MAD" maxLength={3} required />
      </Field>
      <Field id="a-exchange" label={t("exchange")}>
        <Input id="a-exchange" name="exchange" maxLength={60} />
      </Field>
      <Field id="a-provider" label={t("providerRef")} hint={t("providerRefHint")}>
        <Input id="a-provider" name="providerRef" maxLength={80} />
      </Field>
      <Field id="a-keywords" label={t("keywords")} hint={t("keywordsHint")}>
        <Input id="a-keywords" name="keywords" maxLength={500} />
      </Field>
      <div className="sm:col-span-2">
        <FormError message={formError} />
        <Button type="submit" disabled={pending} className="mt-1">
          {tc("create")}
        </Button>
      </div>
    </form>
  );
}

export function EventForm({ assets }: { assets: AssetOption[] }) {
  const t = useTranslations("admin");
  const tEnum = useTranslations("enums.eventType");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(createEvent, initialActionState);
  const { fieldError, formError } = useActionFeedback(state);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field id="e-asset" label={t("asset")} error={fieldError("assetId")}>
        <AssetSelect id="e-asset" name="assetId" assets={assets} />
      </Field>
      <Field id="e-type" label={t("eventType")}>
        <Select id="e-type" name="type" defaultValue="dividend">
          {(["dividend", "agm", "earnings", "split", "other"] as const).map((e) => (
            <option key={e} value={e}>
              {tEnum(e)}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="e-title" label={t("eventTitle")} error={fieldError("title")} className="sm:col-span-2">
        <Input id="e-title" name="title" required maxLength={200} />
      </Field>
      <Field id="e-date" label={t("eventDate")} error={fieldError("eventDate")}>
        <Input id="e-date" name="eventDate" type="date" required />
      </Field>
      <Field id="e-amount" label={t("amount")} hint={t("amountHint")} error={fieldError("amount")}>
        <Input id="e-amount" name="amount" type="number" step="any" min="0" />
      </Field>
      <Field id="e-source" label={t("sourceUrl")} error={fieldError("sourceUrl")} className="sm:col-span-2">
        <Input id="e-source" name="sourceUrl" type="url" placeholder="https://" />
      </Field>
      <div className="sm:col-span-2">
        <FormError message={formError} />
        <Button type="submit" disabled={pending} className="mt-1">
          {tc("create")}
        </Button>
      </div>
    </form>
  );
}

export function DeleteEventButton({ id, label }: { id: string; label: string }) {
  const t = useTranslations("admin");
  const tErr = useTranslations("errors");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={t("deleteEvent", { name: label })}
      onClick={() =>
        start(async () => {
          const res = await deleteEvent(id);
          if (!res.ok) toast.error(tErr(res.error as never));
        })
      }
    >
      <Trash2 />
    </Button>
  );
}

/** Paste closing prices for an asset that has no price API (Casablanca). */
export function PriceImportForm({ assets }: { assets: AssetOption[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(importPrices, initialActionState);
  const { fieldError, formError } = useActionFeedback(state);

  return (
    <form action={action} className="grid gap-4">
      <Field id="p-asset" label={t("asset")} error={fieldError("assetId")}>
        <AssetSelect id="p-asset" name="assetId" assets={assets} />
      </Field>
      <Field id="p-rows" label={t("priceRows")} hint={t("priceRowsHint")} error={fieldError("rows")}>
        <Textarea
          id="p-rows"
          name="rows"
          required
          rows={6}
          spellCheck={false}
          className="font-mono text-sm"
          placeholder={"16/10/2026;712,50\n15/10/2026;705,10"}
        />
      </Field>
      <div>
        <FormError message={formError} />
        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? tc("saving") : tc("save")}
        </Button>
      </div>
    </form>
  );
}
