import { createFinnhubProvider } from "../src/lib/market/finnhub-provider";

async function main() {
  if (!process.env.FINNHUB_API_KEY?.trim()) {
    console.error("FINNHUB_API_KEY is missing. Add it to .env.local");
    process.exit(1);
  }

  const provider = createFinnhubProvider();
  console.log(`Provider: ${provider.name}`);

  for (const symbol of ["AAPL", "NVDA", "SPY"]) {
    const quote = await provider.getQuote(symbol);
    if (!quote) {
      console.error(`Failed to fetch ${symbol}`);
      process.exit(1);
    }
    const pct = quote.day_return != null ? (quote.day_return * 100).toFixed(2) : "n/a";
    console.log(
      `${symbol}: $${quote.price.toFixed(2)} (prev close $${quote.previous_close.toFixed(2)}, day ${pct}%)`,
    );
  }

  console.log("\nFinnhub connection OK.");
}

main();
