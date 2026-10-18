"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { routes } from "@/lib/routes";
import { initialActionState } from "@/server/action-result";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/server/actions/auth";

import { FormError, useActionFeedback } from "./action-form";

export function SignInForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const t = useTranslations("auth");
  const tErr = useTranslations("errors");
  const [state, action, pending] = useActionState(signIn, initialActionState);
  const { fieldError } = useActionFeedback(state);
  const error = !state.ok && state.error !== "checkFields" ? tErr(state.error as never) : linkError ? tErr("linkExpired") : undefined;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field id="email" label={t("email")} error={fieldError("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field id="password" label={t("password")} error={fieldError("password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="-mt-1 text-right">
        <Link href={routes.forgotPassword} className="text-sm font-medium text-primary hover:underline">
          {t("forgot")}
        </Link>
      </div>
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(signUp, initialActionState);
  const { fieldError, formError } = useActionFeedback(state);

  if (state.ok && state.message === "checkInbox") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MailCheck className="size-6" />
        </div>
        <p className="font-semibold">{t("checkInboxTitle")}</p>
        <p className="text-sm text-fg-muted">{t("checkInboxText")}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="displayName" label={t("name")} error={fieldError("displayName")}>
        <Input id="displayName" name="displayName" autoComplete="name" required maxLength={80} autoFocus />
      </Field>
      <Field id="email" label={t("email")} error={fieldError("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label={t("password")} hint={t("passwordHint")} error={fieldError("password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("creating") : t("createAccount")}
      </Button>
      <p className="text-center text-xs text-fg-subtle">{t("terms")}</p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(requestPasswordReset, initialActionState);
  const { fieldError } = useActionFeedback(state);

  if (state.ok && state.message === "resetSent") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MailCheck className="size-6" />
        </div>
        <p className="text-sm text-fg-muted">{t("resetSent")}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="email" label={t("email")} error={fieldError("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {t("sendLink")}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(updatePassword, initialActionState);
  const { fieldError, formError } = useActionFeedback(state);

  if (state.ok && state.message === "passwordUpdated") {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-fg-muted">{t("passwordUpdated")}</p>
        <Button asChild size="lg">
          <Link href={routes.dashboard}>{t("continue")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="password" label={t("newPassword")} hint={t("passwordHint")} error={fieldError("password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required autoFocus />
      </Field>
      <Field id="confirm" label={t("confirmPassword")} error={fieldError("confirm")}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {t("savePassword")}
      </Button>
    </form>
  );
}
