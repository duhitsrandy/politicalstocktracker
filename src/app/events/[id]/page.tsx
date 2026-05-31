import { notFound } from "next/navigation";
import { getEventById } from "@/lib/db/queries";
import { ScoreBadge } from "@/components/ScoreBadge";
import { DirectionBadge } from "@/components/DirectionBadge";
import { ReasonCodes } from "@/components/ReasonCodes";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEventById(id);
  if (!data) notFound();

  const { event, entities, snapshots, forward_returns } = data;
  const breakdown = event.score_breakdown as Record<string, number> | null;
  const reasons = (event.reason_codes as string[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Event</h1>
        {event.score != null && (
          <ScoreBadge score={event.score} level={event.alert_level ?? undefined} />
        )}
        {event.direction && <DirectionBadge direction={event.direction} />}
        <span className="text-xs text-zinc-500">{event.origin}</span>
      </div>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500">Original text</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{event.raw_text}</p>
        {event.source_url && (
          <a
            href={event.source_url}
            className="mt-2 inline-block text-sm text-blue-600 underline"
            target="_blank"
            rel="noreferrer"
          >
            Source link
          </a>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">Entities</h2>
        <ul className="space-y-1 text-sm">
          {entities.map((e: Record<string, unknown>) => (
            <li key={String(e.id)}>
              {String(e.entity_text)} → {String(e.ticker ?? "—")} (
              {Number(e.resolver_confidence).toFixed(2)}
              {e.is_primary ? ", primary" : ""})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">Classification</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          <div>
            <dt className="text-zinc-500">Event type</dt>
            <dd>{event.event_type}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Catalyst</dt>
            <dd>{event.catalyst_type}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Policy domain</dt>
            <dd>{event.policy_domain}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Classifier</dt>
            <dd>{event.classifier_version}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Scoring</dt>
            <dd>{event.scoring_version}</dd>
          </div>
        </dl>
      </section>

      {breakdown && (
        <section>
          <h2 className="mb-2 text-sm font-medium">Score breakdown</h2>
          <pre className="rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
            {JSON.stringify(breakdown, null, 2)}
          </pre>
        </section>
      )}

      <ReasonCodes codes={reasons} />

      {snapshots.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium">Market snapshot</h2>
          <pre className="rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
            {JSON.stringify(snapshots[0], null, 2)}
          </pre>
        </section>
      )}

      {forward_returns.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium">Forward returns</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-1">Horizon</th>
                  <th>Status</th>
                  <th>Excess vs sector</th>
                </tr>
              </thead>
              <tbody>
                {forward_returns.map((r: Record<string, unknown>) => (
                  <tr key={String(r.id)} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-1">{String(r.horizon)}</td>
                    <td>{String(r.status)}</td>
                    <td>
                      {r.excess_return_vs_sector != null
                        ? (Number(r.excess_return_vs_sector) * 100).toFixed(2) + "%"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
