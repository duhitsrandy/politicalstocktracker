import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

/** Dev fallback when Supabase env is not set */
const DATA_DIR = join(process.cwd(), ".data");

export interface LocalEventRow {
  id: string;
  event_datetime: string | null;
  detected_at: string;
  source_type: string;
  source_name: string | null;
  source_url: string | null;
  source_hash: string | null;
  speaker: string | null;
  title: string | null;
  raw_text: string;
  normalized_text: string | null;
  event_type: string | null;
  sentiment: string | null;
  policy_domain: string | null;
  catalyst_type: string | null;
  freshness_class: string | null;
  direction: string | null;
  score: number | null;
  alert_level: string | null;
  reason_codes: string[] | null;
  score_breakdown: Record<string, number> | { source: number; entity: number; language: number; freshness: number; market: number; total: number } | null;
  score_mode: string | null;
  origin: string;
  status: string;
  classifier_version: string | null;
  scoring_version: string | null;
  ai_raw_classification: unknown;
  ai_summary: string | null;
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await ensureDataDir();
  await writeFile(join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

export async function localListEvents(): Promise<LocalEventRow[]> {
  return readJson<LocalEventRow[]>("events.json", []);
}

export async function localGetEvent(id: string): Promise<LocalEventRow | null> {
  const all = await localListEvents();
  return all.find((e) => e.id === id) ?? null;
}

export async function localInsertEvent(
  row: Omit<LocalEventRow, "id" | "detected_at"> & { id?: string },
): Promise<LocalEventRow> {
  const all = await localListEvents();
  const event: LocalEventRow = {
    ...row,
    id: row.id ?? randomUUID(),
    detected_at: new Date().toISOString(),
  };
  all.unshift(event);
  await writeJson("events.json", all);
  return event;
}

export async function localUpsertEventBySourceHash(
  row: Omit<LocalEventRow, "id" | "detected_at"> & { id?: string },
): Promise<{ event: LocalEventRow; updated: boolean }> {
  const all = await localListEvents();
  const hash = row.source_hash;
  const idx =
    hash != null ? all.findIndex((e) => e.source_hash === hash) : -1;

  if (idx >= 0) {
    const existing = all[idx]!;
    const event: LocalEventRow = {
      ...existing,
      ...row,
      id: existing.id,
      detected_at: existing.detected_at,
    };
    all[idx] = event;
    await writeJson("events.json", all);
    return { event, updated: true };
  }

  const event = await localInsertEvent(row);
  return { event, updated: false };
}

export async function localListEntities(eventId: string) {
  const all = await readJson<Record<string, unknown[]>>(
    "event_entities.json",
    {},
  );
  return (all[eventId] ?? []) as Record<string, unknown>[];
}

export async function localSaveEntities(
  eventId: string,
  entities: Record<string, unknown>[],
) {
  const all = await readJson<Record<string, unknown[]>>(
    "event_entities.json",
    {},
  );
  all[eventId] = entities;
  await writeJson("event_entities.json", all);
}
