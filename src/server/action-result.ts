import type { FieldErrors } from "@/lib/validation";

/**
 * Uniform result of every Server Action. `error` and the values of
 * `fieldErrors` are i18n keys under "errors" — never raw database messages,
 * which could leak internals.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export const initialActionState: ActionResult = { ok: true };

export const fail = (error: string, fieldErrors?: FieldErrors): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});
