import { z } from "zod";

import { baseCurrencies } from "@/domain/money";

/**
 * Input schemas shared by forms and Server Actions. Server Actions always
 * re-validate: client-side checks are a convenience, never a control.
 * Error messages are i18n keys under "errors".
 */

const uuid = z.uuid("invalid");
const positive = z.coerce.number("invalid").finite("invalid").positive("positive");
const nonNegative = z.coerce.number("invalid").finite("invalid").min(0, "nonNegative");
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate")
  .refine((d) => !Number.isNaN(Date.parse(d)), "invalidDate");

export const emailSchema = z.email("email").max(254).trim().toLowerCase();
export const passwordSchema = z
  .string()
  .min(10, "passwordLength")
  .max(72, "passwordLength")
  .regex(/[a-zA-Z]/, "passwordStrength")
  .regex(/\d/, "passwordStrength");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "required").max(72),
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "required").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "passwordMismatch" });

export const transactionSchema = z
  .object({
    id: uuid.optional(),
    portfolioId: uuid,
    assetId: uuid,
    type: z.enum(["buy", "sell", "dividend", "fee"]),
    date: isoDate,
    quantity: nonNegative.default(0),
    price: nonNegative.default(0),
    fees: nonNegative.default(0),
    amount: nonNegative.default(0),
    note: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
  })
  .superRefine((v, ctx) => {
    if (v.type === "buy" || v.type === "sell") {
      if (v.quantity <= 0) ctx.addIssue({ code: "custom", path: ["quantity"], message: "positive" });
    } else if (v.amount <= 0) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "positive" });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (v.date > today) ctx.addIssue({ code: "custom", path: ["date"], message: "futureDate" });
  });
export type TransactionFormInput = z.input<typeof transactionSchema>;

export const portfolioSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "required").max(60, "tooLong"),
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(80, "tooLong"),
  baseCurrency: z.enum(baseCurrencies),
  locale: z.enum(["en", "fr"]),
});

export const alertSchema = z.object({
  assetId: uuid,
  type: z.enum(["price_above", "price_below", "daily_move"]),
  threshold: positive,
});

export const assetSchema = z.object({
  symbol: z.string().trim().toUpperCase().min(1, "required").max(20).regex(/^[A-Z0-9.\-/]+$/, "invalid"),
  name: z.string().trim().min(1, "required").max(120),
  assetClass: z.enum(["stock", "etf", "index", "crypto", "commodity"]),
  market: z.enum(["casablanca", "us", "europe", "crypto", "commodities"]),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "invalid"),
  exchange: z.string().trim().max(60).optional().transform((v) => v || null),
  providerRef: z.string().trim().max(80).optional().transform((v) => v || null),
  keywords: z
    .string()
    .max(500)
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 20),
    ),
});

export const eventSchema = z.object({
  assetId: uuid,
  type: z.enum(["dividend", "agm", "earnings", "split", "other"]),
  title: z.string().trim().min(1, "required").max(200),
  eventDate: isoDate,
  amount: z
    .union([z.literal(""), nonNegative])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  sourceUrl: z
    .union([z.literal(""), z.url("invalid").startsWith("https://", "invalid")])
    .optional()
    .transform((v) => v || null),
});

export const priceImportSchema = z.object({
  assetId: uuid,
  rows: z.string().trim().min(1, "required").max(120_000, "priceRows"),
});

export const idSchema = z.object({ id: uuid });

/** Turns a FormData into a plain object (single values only). */
export function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value;
  }
  return out;
}

export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
