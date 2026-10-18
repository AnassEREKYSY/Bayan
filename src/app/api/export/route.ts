import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Neutralise spreadsheet formula injection and quote every cell. */
function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Downloads the signed-in user's transactions as CSV (RLS limits it to their own rows). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("transactions")
    .select("executed_at, type, quantity, price, fees, amount, currency, note, asset:assets(symbol, name, market), portfolio:portfolios(name)")
    .order("executed_at", { ascending: true })
    .limit(50000);
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });

  type Row = {
    executed_at: string;
    type: string;
    quantity: number;
    price: number;
    fees: number;
    amount: number;
    currency: string;
    note: string | null;
    asset: { symbol: string; name: string; market: string } | null;
    portfolio: { name: string } | null;
  };

  const header = ["date", "portfolio", "symbol", "name", "market", "type", "quantity", "price", "fees", "amount", "currency", "note"];
  const lines = ((data ?? []) as unknown as Row[]).map((r) =>
    [
      r.executed_at.slice(0, 10),
      r.portfolio?.name,
      r.asset?.symbol,
      r.asset?.name,
      r.asset?.market,
      r.type,
      r.quantity,
      r.price,
      r.fees,
      r.amount,
      r.currency,
      r.note,
    ]
      .map(csvCell)
      .join(","),
  );

  return new NextResponse([header.join(","), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bayan-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
