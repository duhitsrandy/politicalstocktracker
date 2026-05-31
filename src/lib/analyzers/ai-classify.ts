import "server-only";

import { z } from "zod";
import type { Classification, EntityCandidate, EventInput } from "@/lib/types/event";
import { classifyEventRules, CLASSIFIER_VERSION_RULES } from "@/lib/analyzers/classify-event";

export const CLASSIFIER_VERSION_AI = "ai-v1.0.0";

const AiClassificationSchema = z.object({
  event_type: z.string(),
  sentiment: z.string(),
  direction: z.enum(["bullish", "bearish", "mixed", "neutral", "unknown"]),
  policy_domain: z.string(),
  catalyst_type: z.string(),
  market_relevance: z.enum(["low", "medium", "high", "unknown"]),
  language_features: z.array(z.string()),
  summary: z.string(),
  risk_notes: z.array(z.string()),
  confidence: z.number(),
  primary_ticker: z.string().nullable().optional(),
  rejected_tickers: z.array(z.string()).optional(),
});

export type AiClassificationExtended = Classification & {
  primary_ticker?: string | null;
  rejected_tickers?: string[];
  ai_raw_classification?: unknown;
};

export function isAiClassifierEnabled(): boolean {
  return (
    process.env.ENABLE_AI_CLASSIFIER === "true" &&
    Boolean(process.env.OPENAI_API_KEY)
  );
}

export async function classifyWithAi(
  input: EventInput,
  normalizedText: string,
  entities: EntityCandidate[],
): Promise<AiClassificationExtended | null> {
  if (!isAiClassifierEnabled()) return null;

  const entitySummary = entities.map((e) => ({
    entity_text: e.entity_text,
    ticker: e.ticker,
    confidence: e.confidence,
    match_type: e.match_type,
    is_common_word_risk: e.confidence < 0.85,
  }));

  const prompt = `You are classifying a political/government/company catalyst event for possible public-market relevance.
Return strict JSON only, no markdown.

Score is NOT your job. direction is separate from market relevance.

Text:
${normalizedText}

Known detected entities:
${JSON.stringify(entitySummary, null, 2)}

Source: ${input.source_type}
Speaker: ${input.speaker ?? "unknown"}

Classify. Use allowed event_type values: company_praise, buy_like_language, ceo_praise, government_contract, government_funding, equity_stake, tariff_protection, tariff_threat, regulatory_threat, antitrust_threat, export_control, sanction, national_security, sector_policy, executive_order, agency_rule, contract_modification, unknown.

direction: bullish | bearish | mixed | neutral | unknown

catalyst_type: primary_catalyst | confirming_catalyst | echo | policy_breadcrumb | noise | unknown

If entities include common-word tickers (NOW, ON, AI, CAT, DE, OPEN) used as normal English words, list them in rejected_tickers.

Pick primary_ticker for the main public company affected, or null.

Return JSON:
{
  "event_type": "",
  "sentiment": "",
  "direction": "",
  "policy_domain": "",
  "catalyst_type": "",
  "market_relevance": "",
  "language_features": [],
  "summary": "",
  "risk_notes": [],
  "confidence": 0.0,
  "primary_ticker": null,
  "rejected_tickers": []
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: "You return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    console.error("AI classify failed", await res.text());
    return null;
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices[0]?.message?.content;
  if (!content) return null;

  const parsed = AiClassificationSchema.safeParse(JSON.parse(content));
  if (!parsed.success) return null;

  const p = parsed.data;
  const rulesFallback = classifyEventRules(input, normalizedText, entities);

  return {
    event_type: p.event_type as Classification["event_type"],
    sentiment: p.sentiment as Classification["sentiment"],
    direction: p.direction,
    policy_domain: p.policy_domain,
    catalyst_type: p.catalyst_type as Classification["catalyst_type"],
    market_relevance: p.market_relevance,
    language_features: p.language_features,
    freshness_class: rulesFallback.freshness_class,
    summary: p.summary,
    risk_notes: p.risk_notes,
    confidence: p.confidence,
    classifier_version: CLASSIFIER_VERSION_AI,
    primary_ticker: p.primary_ticker ?? null,
    rejected_tickers: p.rejected_tickers ?? [],
    ai_raw_classification: parsed.data,
  };
}
