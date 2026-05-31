import "server-only";

import type { MarketContext } from "@/lib/types/event";
import { getMarketProviderAsync } from "@/lib/market/stub";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase";
import { getCompanyByTicker } from "@/lib/data/seed-companies";

export async function fetchMarketSnapshot(ticker: string): Promise<{
  context: MarketContext;
  snapshot: Record<string, unknown>;
} | null> {
  const provider = await getMarketProviderAsync();
  const quote = await provider.getQuote(ticker);
  if (!quote) return null;

  const context: MarketContext = {
    price_at_detection: quote.price,
    day_return: quote.day_return,
    already_moved_pct: quote.day_return ? Math.abs(quote.day_return) * 100 : 0,
  };

  const snapshot = {
    ticker,
    snapshot_time: quote.timestamp,
    price: quote.price,
    previous_close: quote.previous_close,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    volume: quote.volume,
    day_return: quote.day_return,
    provider: provider.name,
  };

  return { context, snapshot };
}

export async function persistMarketSnapshot(
  eventId: string,
  snapshot: Record<string, unknown>,
) {
  if (!isSupabaseConfigured()) return;
  const db = getSupabaseAdmin();
  await db.from("market_snapshots").insert({
    event_id: eventId,
    ...snapshot,
  });
}

export async function scheduleForwardReturns(eventId: string, ticker: string) {
  const company = getCompanyByTicker(ticker);
  const sectorEtf = company?.sector_etf ?? "SPY";
  const now = new Date();
  const horizons: { horizon: string; days: number }[] = [
    { horizon: "same_close", days: 0 },
    { horizon: "next_close", days: 1 },
    { horizon: "5_td", days: 5 },
    { horizon: "20_td", days: 20 },
    { horizon: "60_td", days: 60 },
  ];

  const rows = horizons.map(({ horizon, days }) => {
    const due = new Date(now);
    due.setDate(due.getDate() + days);
    return {
      event_id: eventId,
      ticker,
      sector_etf: sectorEtf,
      horizon,
      due_at: due.toISOString(),
      status: "pending",
    };
  });

  if (!isSupabaseConfigured()) {
    const { readFile, writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const path = join(process.cwd(), ".data", "forward_returns.json");
    await mkdir(join(process.cwd(), ".data"), { recursive: true });
    let all: unknown[] = [];
    try {
      all = JSON.parse(await readFile(path, "utf-8")) as unknown[];
    } catch {
      /* empty */
    }
    all.push(...rows.map((r) => ({ ...r, id: crypto.randomUUID() })));
    await writeFile(path, JSON.stringify(all, null, 2));
    return;
  }

  const db = getSupabaseAdmin();
  await db.from("forward_returns").insert(rows);
}
