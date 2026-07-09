import { listEvents, getPerformanceStats } from "@/lib/db/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab ?? "live";

  const originFilter =
    activeTab === "all"
      ? undefined
      : activeTab === "manual"
        ? "manual"
        : activeTab === "backtest"
          ? "backfill"
          : "live";

  let stats: Awaited<ReturnType<typeof getPerformanceStats>> = {
    total: 0,
    urgent: 0,
    avg_score: 0,
    by_bucket: {},
  };
  let events: Awaited<ReturnType<typeof listEvents>> = [];
  let loadError: string | null = null;

  try {
    [stats, events] = await Promise.all([
      getPerformanceStats(originFilter),
      listEvents({
        origin: originFilter,
        limit: 200,
      }),
    ]);
  } catch (error) {
    console.error("performance page load failed:", error);
    loadError =
      error instanceof Error
        ? error.message
        : "Failed to load performance data from the database.";
  }

  const byType: Record<string, number> = {};
  const byDirection: Record<string, number> = {};
  for (const e of events) {
    const t = e.event_type ?? "unknown";
    byType[t] = (byType[t] ?? 0) + 1;
    const d = e.direction ?? "unknown";
    byDirection[d] = (byDirection[d] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Performance</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Validation layer — default view is live events only.
        </p>
      </div>
      {loadError ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Could not load performance data</p>
          <p className="mt-1 opacity-90">{loadError}</p>
        </div>
      ) : null}

      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <TabLink href="/performance" active={activeTab === "live"}>
          Live
        </TabLink>
        <TabLink href="/performance?tab=manual" active={activeTab === "manual"}>
          Manual
        </TabLink>
        <TabLink href="/performance?tab=backtest" active={activeTab === "backtest"}>
          Backtest
        </TabLink>
        <TabLink href="/performance?tab=all" active={activeTab === "all"}>
          All
        </TabLink>
      </div>

      {activeTab === "backtest" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Backtest caveat:</strong> Historical backfills are vulnerable to
          hindsight dictionary bias and selection bias. Use pre-registered rules only.
          Run <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">npm run backtest</code>{" "}
          for the offline gate.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total signals" value={String(stats.total)} />
        <StatCard label="High / urgent" value={String(stats.urgent)} />
        <StatCard label="Avg score" value={stats.avg_score.toFixed(1)} />
        <StatCard
          label="Score buckets"
          value={Object.entries(stats.by_bucket)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ") || "—"}
        />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium">By event type</h2>
        <ul className="text-sm text-zinc-600 dark:text-zinc-400">
          {Object.entries(byType).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">By direction</h2>
        <ul className="text-sm text-zinc-600 dark:text-zinc-400">
          {Object.entries(byDirection).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`border-b-2 px-3 py-2 text-sm ${
        active
          ? "border-zinc-900 font-medium dark:border-zinc-100"
          : "border-transparent text-zinc-500"
      }`}
    >
      {children}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
