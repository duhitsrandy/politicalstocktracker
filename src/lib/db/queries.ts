import "server-only";

import { createHash } from "crypto";
import type { AnalyzeResult, EventInput, Origin } from "@/lib/types/event";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase";
import {
  localGetEvent,
  localListEntities,
  localListEvents,
  localSaveEntities,
  localUpsertEventBySourceHash,
  type LocalEventRow,
} from "@/lib/db/local-store";
import { SEED_COMPANIES } from "@/lib/data/seed-companies";

function optionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Postgres timestamptz rejects ""; empty form fields must become a valid ISO timestamp or null. */
function resolveEventDatetime(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return new Date().toISOString();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export function buildSourceHash(input: EventInput, normalizedText: string): string {
  const snippet = normalizedText.slice(0, 200);
  return createHash("sha256")
    .update(`${input.source_url ?? ""}|${snippet}`)
    .digest("hex");
}

export async function listEvents(filters?: {
  origin?: string;
  limit?: number;
}) {
  if (!isSupabaseConfigured()) {
    let rows = await localListEvents();
    if (filters?.origin) rows = rows.filter((r) => r.origin === filters.origin);
    const sliced = rows.slice(0, filters?.limit ?? 100);
    const enriched = await Promise.all(
      sliced.map(async (e) => {
        const ents = await localListEntities(e.id);
        const primary = ents.find((x) => x.is_primary) as { ticker?: string } | undefined;
        return { ...e, primary_ticker: primary?.ticker ?? null };
      }),
    );
    return enriched;
  }
  const db = getSupabaseAdmin();
  let q = db
    .from("events")
    .select("*, event_entities(ticker, is_primary)")
    .order("detected_at", { ascending: false });
  if (filters?.origin) q = q.eq("origin", filters.origin);
  if (filters?.limit) q = q.limit(filters.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown> & {
      event_entities?: { ticker: string; is_primary: boolean }[];
    };
    const ents = r.event_entities ?? [];
    const primary = ents.find((e) => e.is_primary) ?? ents[0];
    const { event_entities: _e, ...event } = r;
    return {
      ...(event as typeof row),
      primary_ticker: primary?.ticker ?? null,
    };
  });
}

export async function getEventById(id: string) {
  if (!isSupabaseConfigured()) {
    const event = await localGetEvent(id);
    if (!event) return null;
    const entities = await localListEntities(id);
    return { event, entities, snapshots: [], forward_returns: [] };
  }
  const db = getSupabaseAdmin();
  const { data: event, error } = await db.from("events").select("*").eq("id", id).single();
  if (error || !event) return null;
  const { data: entities } = await db
    .from("event_entities")
    .select("*")
    .eq("event_id", id);
  const { data: snapshots } = await db
    .from("market_snapshots")
    .select("*")
    .eq("event_id", id);
  const { data: forward_returns } = await db
    .from("forward_returns")
    .select("*")
    .eq("event_id", id);
  return { event, entities: entities ?? [], snapshots: snapshots ?? [], forward_returns: forward_returns ?? [] };
}

export async function saveAnalyzedEvent(
  input: EventInput,
  analysis: AnalyzeResult,
  origin: Origin = "manual",
): Promise<{ id: string; updated: boolean }> {
  const source_hash = buildSourceHash(input, analysis.normalized_text);
  const row = {
    event_datetime: resolveEventDatetime(input.event_datetime),
    source_type: input.source_type,
    source_name: optionalText(input.source_name),
    source_url: optionalText(input.source_url),
    source_hash,
    speaker: optionalText(input.speaker),
    title: optionalText(input.title),
    raw_text: input.raw_text,
    normalized_text: analysis.normalized_text,
    event_type: analysis.classification.event_type,
    sentiment: analysis.classification.sentiment,
    policy_domain: analysis.classification.policy_domain,
    catalyst_type: analysis.classification.catalyst_type,
    freshness_class: analysis.classification.freshness_class,
    direction: analysis.score.direction,
    score: analysis.score.score,
    alert_level: analysis.score.alert_level,
    reason_codes: analysis.score.reason_codes,
    score_breakdown: analysis.score.score_breakdown,
    score_mode: analysis.score.score_mode,
    origin,
    status: "active",
    classifier_version: analysis.classification.classifier_version,
    scoring_version: analysis.score.scoring_version,
    ai_raw_classification:
      (analysis.classification as { ai_raw_classification?: unknown })
        .ai_raw_classification ?? null,
    ai_summary: analysis.classification.summary,
  };

  const entityRows = analysis.entities.map((e) => ({
    entity_text: e.entity_text,
    entity_type: e.entity_type,
    company_name: e.company_name,
    ticker: e.ticker,
    sector: e.sector,
    resolver_confidence: e.confidence,
    match_type: e.match_type,
    is_direct_company_mention: e.is_direct_company_mention,
    is_ceo_mention: e.is_ceo_mention,
    is_sector_mention: e.is_sector_mention,
    is_primary: e.is_primary,
  }));

  if (!isSupabaseConfigured()) {
    const { event: saved, updated } = await localUpsertEventBySourceHash({
      ...row,
      score_breakdown: { ...row.score_breakdown },
    } as Omit<LocalEventRow, "id" | "detected_at">);
    await localSaveEntities(
      saved.id,
      entityRows.map((e) => ({ ...e, event_id: saved.id })),
    );
    return { id: saved.id, updated };
  }

  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from("events")
    .select("id")
    .eq("source_hash", source_hash)
    .maybeSingle();

  const { data: event, error } = await db
    .from("events")
    .upsert(row, { onConflict: "source_hash" })
    .select("id")
    .single();
  if (error) throw error;

  const updated = Boolean(existing);

  await db.from("event_entities").delete().eq("event_id", event.id);
  if (entityRows.length > 0) {
    const withEventId = entityRows.map((e) => ({ ...e, event_id: event.id }));
    const { error: entityError } = await db
      .from("event_entities")
      .insert(withEventId);
    if (entityError) throw entityError;
  }
  return { id: event.id, updated };
}

export async function loadCompanyDictionary() {
  if (!isSupabaseConfigured()) return SEED_COMPANIES;
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("company_dictionary")
    .select("*")
    .eq("is_active", true);
  if (!data?.length) return SEED_COMPANIES;
  return data.map((r) => ({
    ticker: r.ticker,
    company_name: r.company_name,
    cik: r.cik ?? undefined,
    exchange: r.exchange ?? undefined,
    sector: r.sector ?? undefined,
    industry: r.industry ?? undefined,
    sector_etf: r.sector_etf ?? undefined,
    aliases: (r.aliases as string[]) ?? [],
    people: (r.people as string[]) ?? [],
    themes: (r.themes as string[]) ?? [],
    is_common_word_ticker: r.is_common_word_ticker ?? false,
    requires_context: r.requires_context ?? false,
  }));
}

export async function getPerformanceStats(originFilter?: string) {
  const events = await listEvents({ origin: originFilter, limit: 500 });
  const withScore = events.filter((e) => e.score != null);
  const urgent = withScore.filter((e) => e.alert_level === "urgent" || e.alert_level === "high");

  const bucket = (score: number) => {
    if (score >= 86) return "86-100";
    if (score >= 71) return "71-85";
    if (score >= 51) return "51-70";
    if (score >= 31) return "31-50";
    return "0-30";
  };

  const byBucket: Record<string, number> = {};
  for (const e of withScore) {
    const b = bucket(e.score!);
    byBucket[b] = (byBucket[b] ?? 0) + 1;
  }

  return {
    total: events.length,
    urgent: urgent.length,
    avg_score:
      withScore.length > 0
        ? withScore.reduce((s, e) => s + (e.score ?? 0), 0) / withScore.length
        : 0,
    by_bucket: byBucket,
  };
}
