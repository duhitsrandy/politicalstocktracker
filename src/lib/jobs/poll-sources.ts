import "server-only";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase";
import {
  fetchWhiteHouseArticle,
  fetchWhiteHouseList,
  WHITEHOUSE_LIST_URLS,
} from "@/lib/sources/whitehouse";
import {
  DEFENSE_CONTRACTS_URL,
  fetchDefenseContractsPage,
  parseDefenseContractText,
} from "@/lib/sources/defense-contracts";
import { runAnalyzePipeline } from "@/lib/analyzers/pipeline";

export async function pollWhiteHouse(): Promise<{ processed: number }> {
  if (process.env.ENABLE_SOURCE_POLLING !== "true") {
    return { processed: 0 };
  }

  let processed = 0;
  const db = isSupabaseConfigured() ? getSupabaseAdmin() : null;

  for (const list of WHITEHOUSE_LIST_URLS) {
    const links = await fetchWhiteHouseList(list.url);
    for (const link of links.slice(0, 5)) {
      const doc = await fetchWhiteHouseArticle(
        link.url,
        list.sourceType,
        list.sourceName,
      );
      if (!doc || doc.fetch_error || doc.extracted_text.length < 80) continue;

      if (db) {
        const { error } = await db.from("source_documents").upsert(
          {
            source_type: doc.source_type,
            source_name: doc.source_name,
            source_url: doc.source_url,
            title: doc.title,
            published_at: doc.published_at,
            extracted_text: doc.extracted_text,
            content_hash: doc.content_hash,
            processed: true,
            fetch_error: doc.fetch_error,
          },
          { onConflict: "source_url" },
        );
        if (error) continue;
      }

      await runAnalyzePipeline(
        {
          raw_text: doc.extracted_text,
          source_type: doc.source_type,
          source_name: doc.source_name,
          source_url: doc.source_url,
          title: doc.title,
          speaker: "White House",
        },
        { origin: "live", save: true, alert: true },
      );
      processed++;
    }
  }

  return { processed };
}

export async function pollDefenseContracts(): Promise<{ processed: number }> {
  if (process.env.ENABLE_SOURCE_POLLING !== "true") {
    return { processed: 0 };
  }

  const text = await fetchDefenseContractsPage();
  if (!text) return { processed: 0 };

  const contracts = parseDefenseContractText(text);
  let processed = 0;

  for (const c of contracts.slice(0, 10)) {
    if (!c.ticker || c.match_confidence < 0.85) continue;

    const eventType = c.is_modification ? "contract_modification" : "government_contract";

    await runAnalyzePipeline(
      {
        raw_text: c.raw_snippet,
        source_type: "defense_contract",
        source_name: "Department of Defense",
        source_url: DEFENSE_CONTRACTS_URL,
        speaker: c.agency,
        title: `${c.matched_public_parent} — ${eventType}`,
        ticker_override: c.ticker,
      },
      { origin: "live", save: true, alert: true },
    );
    processed++;
  }

  return { processed };
}
