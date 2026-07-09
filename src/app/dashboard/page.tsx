import { listEvents } from "@/lib/db/queries";
import { EventTable, type EventRow } from "@/components/EventTable";
import { isSupabaseConfigured } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let events: Awaited<ReturnType<typeof listEvents>> = [];
  let loadError: string | null = null;

  try {
    events = await listEvents({ limit: 100 });
  } catch (error) {
    console.error("dashboard listEvents failed:", error);
    loadError =
      error instanceof Error
        ? error.message
        : "Failed to load events from the database.";
  }

  const rows: EventRow[] = events.map((e) => ({
    id: e.id,
    detected_at: e.detected_at,
    source_type: e.source_type,
    speaker: e.speaker,
    event_type: e.event_type,
    score: e.score,
    alert_level: e.alert_level,
    direction: e.direction,
    origin: e.origin,
    raw_text: e.raw_text,
    primary_ticker: (e as { primary_ticker?: string | null }).primary_ticker ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Live Radar</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Political catalyst events ·{" "}
          {isSupabaseConfigured() ? "Supabase" : "local .data store"}
        </p>
      </div>
      {loadError ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Could not load events</p>
          <p className="mt-1 opacity-90">{loadError}</p>
          <p className="mt-2 opacity-80">
            If this persists, check that the Supabase project is active (not
            paused) and that Vercel Production env vars are set.
          </p>
        </div>
      ) : null}
      <EventTable events={rows} />
    </div>
  );
}
