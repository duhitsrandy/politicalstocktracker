import "server-only";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase";
import { getMarketProviderAsync } from "@/lib/market/stub";

export async function updateForwardReturns(): Promise<{ updated: number }> {
  if (!isSupabaseConfigured()) {
    return { updated: 0 };
  }

  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: pending } = await db
    .from("forward_returns")
    .select("*")
    .eq("status", "pending")
    .lte("due_at", now)
    .limit(50);

  if (!pending?.length) return { updated: 0 };

  const provider = await getMarketProviderAsync();
  let updated = 0;

  for (const row of pending) {
    const ticker = row.ticker as string;
    const sectorEtf = (row.sector_etf as string) || "SPY";

    const endQuote = await provider.getQuote(ticker);
    const sectorQuote = await provider.getQuote(sectorEtf);
    const spyQuote = await provider.getQuote("SPY");
    const qqqQuote = await provider.getQuote("QQQ");

    if (!endQuote) {
      await db
        .from("forward_returns")
        .update({ status: "error" })
        .eq("id", row.id);
      continue;
    }

    const startPrice = Number(row.start_price) || endQuote.previous_close;
    const endPrice = endQuote.price;
    const raw_return = startPrice ? (endPrice - startPrice) / startPrice : null;
    const sector_return =
      sectorQuote?.previous_close && sectorQuote.price
        ? (sectorQuote.price - sectorQuote.previous_close) /
          sectorQuote.previous_close
        : null;
    const spy_return =
      spyQuote?.previous_close && spyQuote.price
        ? (spyQuote.price - spyQuote.previous_close) / spyQuote.previous_close
        : null;
    const qqq_return =
      qqqQuote?.previous_close && qqqQuote.price
        ? (qqqQuote.price - qqqQuote.previous_close) / qqqQuote.previous_close
        : null;

    await db
      .from("forward_returns")
      .update({
        measured_at: now,
        end_price: endPrice,
        start_price: startPrice,
        raw_return,
        sector_return,
        spy_return,
        qqq_return,
        excess_return_vs_sector:
          raw_return != null && sector_return != null
            ? raw_return - sector_return
            : null,
        excess_return_vs_spy:
          raw_return != null && spy_return != null
            ? raw_return - spy_return
            : null,
        excess_return_vs_qqq:
          raw_return != null && qqq_return != null
            ? raw_return - qqq_return
            : null,
        status: "measured",
      })
      .eq("id", row.id);

    updated++;
  }

  return { updated };
}
