"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/server/action-result";

/**
 * Shows a toast when a Server Action settles and returns a translator for
 * field errors. `onSuccess` runs once per successful submission.
 */
export function useActionFeedback(state: ActionResult, onSuccess?: () => void) {
  const tErrors = useTranslations("errors");
  const tSuccess = useTranslations("success");
  const last = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (state === last.current) return;
    const isFirst = last.current === null;
    last.current = state;
    if (isFirst) return;

    if (state.ok) {
      if (state.message) toast.success(tSuccess(state.message as never));
      onSuccess?.();
    } else if (state.error !== "checkFields") {
      toast.error(tErrors(state.error as never));
    }
  }, [state, onSuccess, tErrors, tSuccess]);

  const fieldError = (name: string): string | undefined => {
    if (state.ok) return undefined;
    const key = state.fieldErrors?.[name];
    return key ? tErrors(key as never) : undefined;
  };

  const formError = !state.ok && state.error === "checkFields" ? tErrors("checkFields") : undefined;

  return { fieldError, formError };
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-loss-soft px-3 py-2 text-sm text-loss">
      {message}
    </p>
  );
}
