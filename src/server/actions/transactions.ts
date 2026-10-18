"use server";

import { revalidatePath } from "next/cache";

import { findOversell } from "@/domain/portfolio";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, formToObject, idSchema, transactionSchema } from "@/lib/validation";

import { fail, type ActionResult } from "../action-result";
import { getUser } from "../auth";
import { toTransactionInput } from "../data/portfolio";

const revalidateAll = () => {
  for (const path of ["/dashboard", "/portfolio", "/transactions", "/assets/[id]"]) {
    revalidatePath(path, path.includes("[") ? "page" : undefined);
  }
};

export async function saveTransaction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("unauthorized");

  const parsed = transactionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("checkFields", fieldErrorsOf(parsed.error));
  const input = parsed.data;

  const supabase = await createClient();

  // RLS guarantees the portfolio belongs to the user; we still check to give a clear error.
  const [{ data: portfolio }, { data: asset }] = await Promise.all([
    supabase.from("portfolios").select("id").eq("id", input.portfolioId).maybeSingle(),
    supabase.from("assets").select("id, currency").eq("id", input.assetId).maybeSingle(),
  ]);
  if (!portfolio) return fail("notFound");
  if (!asset) return fail("checkFields", { assetId: "invalid" });

  const isTrade = input.type === "buy" || input.type === "sell";
  const record = {
    portfolio_id: input.portfolioId,
    asset_id: input.assetId,
    type: input.type,
    quantity: isTrade ? input.quantity : 0,
    price: isTrade ? input.price : 0,
    fees: isTrade ? input.fees : 0,
    amount: isTrade ? 0 : input.amount,
    currency: asset.currency,
    // Midday UTC keeps the chosen calendar day stable across time zones.
    executed_at: `${input.date}T12:00:00.000Z`,
    note: input.note,
  };

  // A sell (or an edit of an earlier buy) must never leave a negative position.
  const { data: history, error: historyError } = await supabase
    .from("transactions")
    .select("*")
    .eq("portfolio_id", input.portfolioId)
    .eq("asset_id", input.assetId);
  if (historyError) return fail("generic");

  const others = (history ?? []).filter((t) => t.id !== input.id).map(toTransactionInput);
  const candidate = toTransactionInput({ ...record, id: "new", user_id: user.id, created_at: "" });
  if (findOversell([...others, candidate])) {
    return fail("checkFields", { quantity: "oversell" });
  }

  // When an edit moves a transaction to another portfolio or asset, the
  // history it leaves must stay valid too.
  if (input.id) {
    const { data: original } = await supabase.from("transactions").select("*").eq("id", input.id).maybeSingle();
    if (!original) return fail("notFound");
    if (original.portfolio_id !== input.portfolioId || original.asset_id !== input.assetId) {
      const { data: previous } = await supabase
        .from("transactions")
        .select("*")
        .eq("portfolio_id", original.portfolio_id)
        .eq("asset_id", original.asset_id);
      if (findOversell((previous ?? []).filter((t) => t.id !== input.id).map(toTransactionInput))) {
        return fail("deleteWouldOversell");
      }
    }
  }

  const { error } = input.id
    ? await supabase.from("transactions").update(record).eq("id", input.id)
    : await supabase.from("transactions").insert(record);

  if (error) {
    console.error("saveTransaction failed", error.code);
    return fail("generic");
  }

  revalidateAll();
  return { ok: true, message: input.id ? "transactionUpdated" : "transactionAdded" };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) return fail("invalid");

  const supabase = await createClient();
  const { data: tx } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (!tx) return fail("notFound");

  // Deleting a buy must not leave later sells uncovered.
  const { data: history } = await supabase
    .from("transactions")
    .select("*")
    .eq("portfolio_id", tx.portfolio_id)
    .eq("asset_id", tx.asset_id);
  if (findOversell((history ?? []).filter((t) => t.id !== id).map(toTransactionInput))) {
    return fail("deleteWouldOversell");
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return fail("generic");

  revalidateAll();
  return { ok: true, message: "transactionDeleted" };
}
