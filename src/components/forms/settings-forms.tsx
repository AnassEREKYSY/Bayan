"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { baseCurrencies } from "@/domain/money";
import { cn } from "@/lib/utils";
import { initialActionState } from "@/server/action-result";
import { updatePassword } from "@/server/actions/auth";
import { deleteAccount, updateProfile } from "@/server/actions/settings";

import { FormError, useActionFeedback } from "./action-form";

export function ProfileForm({
  displayName,
  baseCurrency,
  locale,
}: {
  displayName: string;
  baseCurrency: string;
  locale: string;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const tp = useTranslations("prefs");
  const [state, action, pending] = useActionState(updateProfile, initialActionState);
  const { fieldError } = useActionFeedback(state);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field id="displayName" label={t("displayName")} error={fieldError("displayName")} className="sm:col-span-2">
        <Input id="displayName" name="displayName" defaultValue={displayName} maxLength={80} autoComplete="name" />
      </Field>
      <Field id="baseCurrency" label={t("baseCurrency")} hint={t("baseCurrencyHint")}>
        <Select id="baseCurrency" name="baseCurrency" defaultValue={baseCurrency}>
          {baseCurrencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="locale" label={tp("language")}>
        <Select id="locale" name="locale" defaultValue={locale}>
          <option value="fr">{tp("locale.fr")}</option>
          <option value="en">{tp("locale.en")}</option>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
      </div>
    </form>
  );
}

export function ThemePicker() {
  const t = useTranslations("prefs");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard hydration guard for next-themes
  useEffect(() => setMounted(true), []);

  const options = [
    { value: "light", label: t("light"), icon: Sun },
    { value: "dark", label: t("dark"), icon: Moon },
    { value: "system", label: t("system"), icon: Monitor },
  ] as const;

  return (
    <div role="radiogroup" aria-label={t("theme")} className="grid grid-cols-3 gap-2 sm:max-w-md">
      {options.map(({ value, label, icon: Icon }) => {
        const selected = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm font-medium transition-colors",
              selected ? "border-primary bg-primary-soft text-fg" : "border-border-strong text-fg-muted hover:bg-surface-muted",
            )}
          >
            <Icon className="size-5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function PasswordForm() {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(updatePassword, initialActionState);
  const { fieldError, formError } = useActionFeedback(state);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field id="new-password" label={tAuth("newPassword")} hint={tAuth("passwordHint")} error={fieldError("password")}>
        <Input id="new-password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field id="confirm-password" label={tAuth("confirmPassword")} error={fieldError("confirm")}>
        <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <div className="sm:col-span-2">
        <FormError message={formError} />
        <Button type="submit" variant="secondary" disabled={pending} className="mt-1">
          {pending ? tc("saving") : t("changePassword")}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const t = useTranslations("settings");
  const [state, action, pending] = useActionState(deleteAccount, initialActionState);
  const { fieldError } = useActionFeedback(state);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field id="confirm-delete" label={t("deleteConfirmLabel")} error={fieldError("confirm")} className="flex-1">
        <Input id="confirm-delete" name="confirm" autoComplete="off" placeholder={t("deleteWord")} />
      </Field>
      <Button type="submit" variant="danger" disabled={pending}>
        {t("deleteAccount")}
      </Button>
    </form>
  );
}
