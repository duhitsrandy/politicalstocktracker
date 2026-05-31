import Link from "next/link";
import { ScoreBadge } from "@/components/ScoreBadge";
import { DirectionBadge } from "@/components/DirectionBadge";

export interface EventRow {
  id: string;
  detected_at: string;
  source_type: string;
  speaker: string | null;
  event_type: string | null;
  score: number | null;
  alert_level: string | null;
  direction: string | null;
  origin: string;
  raw_text: string;
  primary_ticker?: string | null;
}

export function EventTable({ events }: { events: EventRow[] }) {
  if (!events.length) {
    return (
      <p className="text-sm text-zinc-500">
        No events yet. Paste one on the Paste Event page.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Ticker</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Score</th>
            <th className="px-3 py-2">Dir</th>
            <th className="px-3 py-2">Origin</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr
              key={e.id}
              className="border-t border-zinc-100 dark:border-zinc-800"
            >
              <td className="px-3 py-2 whitespace-nowrap">
                <Link href={`/events/${e.id}`} className="hover:underline">
                  {new Date(e.detected_at).toLocaleString()}
                </Link>
              </td>
              <td className="px-3 py-2 font-mono">{e.primary_ticker ?? "—"}</td>
              <td className="px-3 py-2">{e.source_type}</td>
              <td className="px-3 py-2">{e.event_type ?? "—"}</td>
              <td className="px-3 py-2">
                {e.score != null ? (
                  <ScoreBadge score={e.score} level={e.alert_level ?? undefined} />
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2">
                {e.direction ? <DirectionBadge direction={e.direction} /> : "—"}
              </td>
              <td className="px-3 py-2 text-xs">{e.origin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
