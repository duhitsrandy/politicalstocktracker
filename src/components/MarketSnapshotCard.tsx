export function MarketSnapshotCard({
  snapshot,
}: {
  snapshot: Record<string, unknown> | null;
}) {
  if (!snapshot) {
    return (
      <p className="text-sm text-zinc-500">
        No market quote — add <code className="text-xs">FINNHUB_API_KEY</code> to{" "}
        <code className="text-xs">.env.local</code> and restart{" "}
        <code className="text-xs">npm run dev</code>.
      </p>
    );
  }

  const ticker = String(snapshot.ticker ?? "—");
  const price = snapshot.price != null ? Number(snapshot.price) : null;
  const dayReturn =
    snapshot.day_return != null ? Number(snapshot.day_return) : null;
  const provider = String(snapshot.provider ?? "unknown");

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <h3 className="mb-2 font-medium">Market snapshot ({provider})</h3>
      <dl className="grid grid-cols-2 gap-2">
        <div>
          <dt className="text-zinc-500">Ticker</dt>
          <dd className="font-mono">{ticker}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Price</dt>
          <dd>{price != null ? `$${price.toFixed(2)}` : "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Day change</dt>
          <dd>
            {dayReturn != null ? (
              <span
                className={
                  dayReturn >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {dayReturn >= 0 ? "+" : ""}
                {(dayReturn * 100).toFixed(2)}%
              </span>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Volume</dt>
          <dd>
            {snapshot.volume != null
              ? Number(snapshot.volume).toLocaleString()
              : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
