import type { MarketProvider, Quote } from "@/lib/market/provider";

/** Deterministic stub quotes for dev without API keys */
export function createStubMarketProvider(): MarketProvider {
  return {
    name: "stub",
    async getQuote(ticker: string): Promise<Quote | null> {
      const hash = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const price = 50 + (hash % 400);
      const prev = price * 0.98;
      return {
        ticker,
        price,
        previous_close: prev,
        day_return: (price - prev) / prev,
        volume: 1_000_000,
        timestamp: new Date().toISOString(),
      };
    },
  };
}

export async function getMarketProviderAsync(): Promise<MarketProvider> {
  if (process.env.FINNHUB_API_KEY) {
    const { createFinnhubProvider } = await import("@/lib/market/finnhub-provider");
    return createFinnhubProvider();
  }
  return createStubMarketProvider();
}

/** Sync accessor — stub only (use getMarketProviderAsync in server paths with Finnhub) */
export function getMarketProvider(): MarketProvider {
  return createStubMarketProvider();
}
