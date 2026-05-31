"use client";

import { useState, useTransition } from "react";
import {
  previewEventAction,
  saveEventAction,
  sendTestAlertAction,
} from "@/app/actions/events";
import type { AnalyzeResult, EventInput } from "@/lib/types/event";
import { ScoreBadge } from "@/components/ScoreBadge";
import { DirectionBadge } from "@/components/DirectionBadge";
import { ReasonCodes } from "@/components/ReasonCodes";

export function PasteEventForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState<EventInput>({
    raw_text: "",
    source_type: "manual",
    source_url: "",
    speaker: "",
    event_datetime: "",
    ticker_override: "",
  });

  function buildInput(): EventInput {
    return {
      ...form,
      origin: "manual",
    };
  }

  function analyze() {
    startTransition(async () => {
      setMessage(null);
      setSavedId(null);
      const analysis = await previewEventAction(buildInput());
      setResult(analysis);
    });
  }

  function save() {
    startTransition(async () => {
      const { eventId } = await saveEventAction(buildInput());
      setSavedId(eventId ?? null);
      setMessage(eventId ? `Saved event ${eventId}` : "Saved");
    });
  }

  function testAlert() {
    startTransition(async () => {
      const { ok } = await sendTestAlertAction(buildInput());
      setMessage(ok ? "Test alert sent" : "Alert failed (check DISCORD_WEBHOOK_URL)");
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-sm font-medium">Raw text</span>
          <textarea
            className="mt-1 w-full rounded border border-zinc-300 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            rows={8}
            value={form.raw_text}
            onChange={(e) => setForm({ ...form, raw_text: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Source type</span>
          <input
            className="mt-1 w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={form.source_type}
            onChange={(e) => setForm({ ...form, source_type: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Speaker</span>
          <input
            className="mt-1 w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={form.speaker ?? ""}
            onChange={(e) => setForm({ ...form, speaker: e.target.value })}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium">Source URL</span>
          <input
            className="mt-1 w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={form.source_url ?? ""}
            onChange={(e) => setForm({ ...form, source_url: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Ticker override</span>
          <input
            className="mt-1 w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="IBM"
            value={form.ticker_override ?? ""}
            onChange={(e) =>
              setForm({ ...form, ticker_override: e.target.value })
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={analyze}
          disabled={pending || !form.raw_text.trim()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Analyze
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending || !form.raw_text.trim()}
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={testAlert}
          disabled={pending}
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Send test alert
        </button>
      </div>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {savedId && (
        <p className="text-sm">
          <a href={`/events/${savedId}`} className="underline">
            View event
          </a>
        </p>
      )}

      {result && (
        <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-3">
            <ScoreBadge
              score={result.score.score}
              level={result.score.alert_level}
            />
            <DirectionBadge direction={result.score.direction} />
            <span className="text-xs text-zinc-500">
              {result.classification.event_type} · {result.score.score_mode}
            </span>
          </div>
          <p className="text-sm">{result.classification.summary}</p>
          <div>
            <h3 className="mb-1 text-sm font-medium">Entities</h3>
            <ul className="space-y-1 text-sm">
              {result.entities.map((e, i) => (
                <li key={i}>
                  {e.entity_text} → {e.ticker ?? "—"} ({e.confidence.toFixed(2)}
                  {e.is_primary ? ", primary" : ""})
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium">Score breakdown</h3>
            <pre className="text-xs text-zinc-600 dark:text-zinc-400">
              {JSON.stringify(result.score.score_breakdown, null, 2)}
            </pre>
          </div>
          <ReasonCodes codes={result.score.reason_codes} />
        </div>
      )}
    </div>
  );
}
