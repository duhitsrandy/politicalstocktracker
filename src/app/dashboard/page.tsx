import { listEvents } from "@/lib/db/queries";
import { EventTable, type EventRow } from "@/components/EventTable";
import { isSupabaseConfigured } from "@/lib/db/supabase";

export default async function DashboardPage() {
  const events = await listEvents({ limit: 100 });
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
      <EventTable events={rows} />
    </div>
  );
}
