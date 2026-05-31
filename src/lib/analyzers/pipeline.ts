import "server-only";

import { analyzeEvent } from "@/lib/analyzers/analyze-event";
import type { EventInput, Origin } from "@/lib/types/event";
import { loadCompanyDictionary, saveAnalyzedEvent } from "@/lib/db/queries";
import { fetchMarketSnapshot, persistMarketSnapshot, scheduleForwardReturns } from "@/lib/market/snapshots";
import { scoreEvent } from "@/lib/scoring/score-event";
import { sendDiscordAlert, shouldAutoAlert } from "@/lib/alerts/discord";
import { isAiClassifierEnabled } from "@/lib/analyzers/ai-classify";

export async function runAnalyzePipeline(
  input: EventInput,
  options: { origin?: Origin; save?: boolean; alert?: boolean } = {},
) {
  const origin = options.origin ?? input.origin ?? "manual";
  const dictionary = await loadCompanyDictionary();

  let marketContext;
  let marketSnapshot: Record<string, unknown> | null = null;

  const preliminary = await analyzeEvent(input, {
    dictionary,
    useAi: isAiClassifierEnabled(),
  });

  const primaryTicker =
    preliminary.entities.find((e) => e.is_primary && e.ticker)?.ticker ??
    preliminary.primary_ticker;

  if (primaryTicker && process.env.FINNHUB_API_KEY) {
    const snap = await fetchMarketSnapshot(primaryTicker);
    if (snap) {
      marketContext = snap.context;
      marketSnapshot = snap.snapshot;
    }
  }

  const analysis = await analyzeEvent(input, {
    dictionary,
    market: marketContext,
    useAi: isAiClassifierEnabled(),
  });

  if (marketContext && analysis.score.score_mode === "text_only") {
    analysis.score = scoreEvent(
      input,
      analysis.classification,
      analysis.entities,
      marketContext,
      "text_plus_market",
    );
  }

  let eventId: string | undefined;
  let eventUpdated = false;
  if (options.save !== false) {
    const saved = await saveAnalyzedEvent(input, analysis, origin);
    eventId = saved.id;
    eventUpdated = saved.updated;
    if (marketSnapshot && eventId) {
      await persistMarketSnapshot(eventId, marketSnapshot);
    }
    if (primaryTicker && eventId && !eventUpdated) {
      await scheduleForwardReturns(eventId, primaryTicker);
    }
    if (options.alert !== false && shouldAutoAlert(analysis, origin)) {
      await sendDiscordAlert(input, analysis, eventId);
    }
  }

  return { analysis, eventId, marketSnapshot, eventUpdated };
}
