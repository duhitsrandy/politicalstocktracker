import type { AnalyzeResult, CompanyRecord, EventInput, MarketContext } from "@/lib/types/event";
import { normalizeText } from "@/lib/analyzers/normalize-text";
import { prefilterCatalyst } from "@/lib/analyzers/prefilter";
import {
  hasCompanyCandidate,
  resolveTickers,
} from "@/lib/analyzers/resolve-ticker";
import { classifyEventRules } from "@/lib/analyzers/classify-event";
import { scoreEvent } from "@/lib/scoring/score-event";
import { SEED_COMPANIES } from "@/lib/data/seed-companies";

export interface AnalyzeOptions {
  dictionary?: CompanyRecord[];
  market?: MarketContext;
  useAi?: boolean;
}

/** Pure analyzer — no DB, no network (unless useAi and key present). */
export async function analyzeEvent(
  input: EventInput,
  options: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  const dictionary = options.dictionary ?? SEED_COMPANIES;
  const normalized_text = normalizeText(input.raw_text);

  const entities = resolveTickers(
    normalized_text,
    dictionary,
    input.ticker_override,
  );

  const companyCandidate = hasCompanyCandidate(entities);
  const prefilter = prefilterCatalyst(normalized_text, companyCandidate);

  let classification = classifyEventRules(input, normalized_text, entities);

  if (prefilter.should_classify && options.useAi) {
    try {
      const { classifyWithAi } = await import("@/lib/analyzers/ai-classify");
      const aiResult = await classifyWithAi(input, normalized_text, entities);
      if (aiResult) {
        classification = aiResult;
        applyAiPrimaryEntity(entities, aiResult);
      }
    } catch {
      // fall back to rules
    }
  }

  const scoreMode = options.market ? "text_plus_market" : "text_only";
  const score = scoreEvent(
    input,
    classification,
    entities,
    options.market,
    scoreMode,
  );

  const primary = entities.find((e) => e.is_primary && e.ticker);

  return {
    normalized_text,
    prefilter: {
      has_company_candidate: prefilter.has_company_candidate,
      has_catalyst_keyword: prefilter.has_catalyst_keyword,
      should_classify: prefilter.should_classify,
    },
    entities,
    classification,
    score,
    primary_ticker: primary?.ticker ?? null,
  };
}

function applyAiPrimaryEntity(
  entities: import("@/lib/types/event").EntityCandidate[],
  classification: import("@/lib/types/event").Classification & {
    primary_ticker?: string | null;
    rejected_tickers?: string[];
  },
) {
  const ai = classification as { primary_ticker?: string; rejected_tickers?: string[] };
  if (ai.rejected_tickers?.length) {
    for (const t of ai.rejected_tickers) {
      const idx = entities.findIndex((e) => e.ticker === t);
      if (idx >= 0) entities.splice(idx, 1);
    }
  }
  if (ai.primary_ticker) {
    for (const e of entities) {
      e.is_primary = e.ticker === ai.primary_ticker;
    }
  }
}
