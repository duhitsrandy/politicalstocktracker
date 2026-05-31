import "server-only";

import type { MarketProvider, Quote } from "@/lib/market/provider";

export function createFinnhubProvider(): MarketProvider {
  const apiKey = process.env.FINNHUB_API_KEY;
  return {
    name: "finnhub",
    async getQuote(ticker: string): Promise<Quote | null> {
      if (!apiKey) return null;
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
        { next: { revalidate: 60 } },
      );
      if (!res.ok) return null;
      const d = (await res.json()) as {
        c: number;
        pc: number;
        o: number;
        h: number;
        l: number;
        v: number;
        t: number;
      };
      if (!d.c) return null;
      const day_return = d.pc ? (d.c - d.pc) / d.pc : undefined;
      return {
        ticker,
        price: d.c,
        previous_close: d.pc,
        open: d.o,
        high: d.h,
        low: d.l,
        volume: d.v,
        day_return,
        timestamp: new Date(d.t * 1000).toISOString(),
      };
    },
  };
}
