export interface Quote {
  ticker: string;
  price: number;
  previous_close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  day_return?: number;
  timestamp: string;
}

export interface MarketProvider {
  name: string;
  getQuote(ticker: string): Promise<Quote | null>;
}
