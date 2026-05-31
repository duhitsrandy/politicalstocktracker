import type {
  Classification,
  Direction,
  EntityCandidate,
  EventInput,
  EventType,
  FreshnessClass,
} from "@/lib/types/event";

export const CLASSIFIER_VERSION_RULES = "rules-v1.0.0";

export function classifyEventRules(
  input: EventInput,
  normalizedText: string,
  entities: EntityCandidate[],
): Classification {
  const lower = normalizedText.toLowerCase();
  const speaker = (input.speaker ?? "").toLowerCase();
  const sourceType = (input.source_type ?? "unknown").toLowerCase();

  let event_type: EventType = "unknown";
  let direction: Direction = "unknown";
  const language_features: string[] = [];

  if (/\b(buy|purchase|go out and buy)\b/i.test(lower)) {
    event_type = "buy_like_language";
    direction = "bullish";
    language_features.push("buy_like_language");
  } else if (/\b(contract|award|procurement)\b/i.test(lower)) {
    event_type = sourceType.includes("defense")
      ? "government_contract"
      : "government_contract";
    direction = "bullish";
    language_features.push("contract_or_procurement");
  } else if (/\b(modification|option exercised|ceiling)\b/i.test(lower)) {
    event_type = "contract_modification";
    direction = "mixed";
  } else if (/\b(funding|grant|loan|equity stake|investment)\b/i.test(lower)) {
    event_type = /\bequity\b/i.test(lower) ? "equity_stake" : "government_funding";
    direction = "bullish";
    language_features.push("direct_government_money");
  } else if (/\btariff\b/i.test(lower)) {
    event_type = /\b(must pay|threat|unless)\b/i.test(lower)
      ? "tariff_threat"
      : "tariff_protection";
    direction = event_type === "tariff_threat" ? "bearish" : "mixed";
    language_features.push("tariff_language");
  } else if (/\b(export control|sanction|ban)\b/i.test(lower)) {
    event_type = /\bsanction\b/i.test(lower) ? "sanction" : "export_control";
    direction = "bearish";
  } else if (/\b(antitrust|investigation|regulat)\b/i.test(lower)) {
    event_type = /\bantitrust\b/i.test(lower)
      ? "antitrust_threat"
      : "regulatory_threat";
    direction = "bearish";
  } else if (/\b(national security|critical to)\b/i.test(lower)) {
    event_type = "national_security";
    direction = "mixed";
    language_features.push("national_security");
  } else if (
    /\b(praise|incredible|fantastic|great company|done an incredible job)\b/i.test(
      lower,
    )
  ) {
    event_type =
      /\bceo\b/i.test(lower) && !/\b(company|corporation|has done)\b/i.test(lower)
        ? "ceo_praise"
        : "company_praise";
    direction = "bullish";
    language_features.push("positive_praise");
  } else if (/\b(executive order|fact sheet)\b/i.test(lower)) {
    event_type = "executive_order";
    direction = "mixed";
  } else if (/\b(semiconductor|chips|ai infrastructure|quantum)\b/i.test(lower)) {
    event_type = "sector_policy";
    direction = "mixed";
  }

  const primary = entities.find((e) => e.is_primary) ?? entities[0];
  const policy_domain = inferPolicyDomain(lower, primary?.theme);

  let catalyst_type = classifyEventRulesCatalyst(sourceType, event_type);
  let freshness_class: FreshnessClass = "fresh";
  if (sourceType.includes("news") || sourceType === "news_article") {
    freshness_class = "confirming";
  }

  const market_relevance =
    entities.some((e) => e.ticker && e.confidence >= 0.85) &&
    event_type !== "unknown"
      ? "high"
      : entities.length > 0
        ? "medium"
        : "low";

  const summary = buildSummary(input.speaker, primary?.company_name, event_type);

  return {
    event_type,
    sentiment: directionToSentiment(direction),
    direction,
    policy_domain,
    catalyst_type,
    market_relevance,
    language_features,
    freshness_class,
    summary,
    risk_notes: [],
    confidence: 0.75,
    classifier_version: CLASSIFIER_VERSION_RULES,
  };
}

function classifyEventRulesCatalyst(
  sourceType: string,
  eventType: EventType,
): Classification["catalyst_type"] {
  if (sourceType.includes("white_house") || eventType === "government_contract") {
    return "primary_catalyst";
  }
  if (eventType === "sector_policy" || eventType === "company_praise") {
    return "policy_breadcrumb";
  }
  if (eventType === "unknown") return "noise";
  return "primary_catalyst";
}

function inferPolicyDomain(lower: string, theme?: string): string {
  if (/\bquantum\b/.test(lower) || theme === "quantum") return "quantum";
  if (/\b(semiconductor|chips)\b/.test(lower)) return "semiconductors";
  if (/\b(ai|artificial intelligence)\b/.test(lower)) return "AI";
  if (/\b(defense|pentagon)\b/.test(lower)) return "defense";
  if (/\b(nuclear|smr)\b/.test(lower)) return "energy";
  if (/\b(crypto|bitcoin)\b/.test(lower)) return "crypto";
  if (/\b(tariff|manufacturing)\b/.test(lower)) return "trade";
  return theme ?? "unknown";
}

function directionToSentiment(direction: Direction): Classification["sentiment"] {
  if (direction === "bullish") return "positive";
  if (direction === "bearish") return "negative";
  if (direction === "mixed") return "mixed";
  if (direction === "neutral") return "neutral";
  return "unknown";
}

function buildSummary(
  speaker: string | undefined,
  company: string | undefined,
  eventType: EventType,
): string {
  const who = speaker ? `${speaker} ` : "";
  const co = company ?? "a company";
  return `${who}event related to ${co}: ${eventType.replace(/_/g, " ")}`;
}

export function inferSpeakerLevel(speaker?: string, sourceType?: string): string {
  const s = (speaker ?? "").toLowerCase();
  if (s.includes("trump") || s.includes("president")) return "president";
  if (s.includes("vice president") || s.includes("vance")) return "vice_president";
  if (s.includes("secretary")) return "cabinet_secretary";
  if (sourceType?.includes("defense_contract")) return "agency_head";
  return "unknown";
}
