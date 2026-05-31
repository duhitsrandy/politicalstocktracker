export const EVENT_TYPES = [
  "company_praise",
  "buy_like_language",
  "ceo_praise",
  "government_contract",
  "government_funding",
  "equity_stake",
  "tariff_protection",
  "tariff_threat",
  "regulatory_threat",
  "antitrust_threat",
  "export_control",
  "sanction",
  "national_security",
  "sector_policy",
  "executive_order",
  "agency_rule",
  "public_private_partnership",
  "factory_or_jobs_announcement",
  "foreign_policy_exposure",
  "contract_modification",
  "unknown",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const SENTIMENTS = [
  "positive",
  "negative",
  "mixed",
  "neutral",
  "unknown",
] as const;

export type Sentiment = (typeof SENTIMENTS)[number];

export const DIRECTIONS = [
  "bullish",
  "bearish",
  "mixed",
  "neutral",
  "unknown",
] as const;

export type Direction = (typeof DIRECTIONS)[number];

export const CATALYST_TYPES = [
  "primary_catalyst",
  "confirming_catalyst",
  "echo",
  "policy_breadcrumb",
  "noise",
  "unknown",
] as const;

export type CatalystType = (typeof CATALYST_TYPES)[number];

export const MARKET_RELEVANCE = [
  "low",
  "medium",
  "high",
  "unknown",
] as const;

export type MarketRelevance = (typeof MARKET_RELEVANCE)[number];

export const FRESHNESS_CLASSES = [
  "fresh",
  "confirming",
  "stale",
  "duplicate",
  "echo",
] as const;

export type FreshnessClass = (typeof FRESHNESS_CLASSES)[number];

export const ALERT_LEVELS = [
  "log",
  "watch",
  "medium",
  "high",
  "urgent",
] as const;

export type AlertLevel = (typeof ALERT_LEVELS)[number];

export const ORIGINS = ["manual", "live", "backfill", "test"] as const;
export type Origin = (typeof ORIGINS)[number];

export const SCORE_MODES = ["text_only", "text_plus_market"] as const;
export type ScoreMode = (typeof SCORE_MODES)[number];

export const MATCH_TYPES = [
  "manual_override",
  "cashtag",
  "company_name",
  "alias",
  "ceo_person",
  "ticker_context",
  "theme",
] as const;

export type MatchType = (typeof MATCH_TYPES)[number];

export interface CompanyRecord {
  ticker: string;
  company_name: string;
  cik?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  sector_etf?: string;
  aliases: string[];
  people: string[];
  themes: string[];
  is_common_word_ticker: boolean;
  requires_context: boolean;
}

export interface EventInput {
  raw_text: string;
  source_type: string;
  source_name?: string;
  source_url?: string;
  speaker?: string;
  event_datetime?: string;
  title?: string;
  ticker_override?: string;
  origin?: Origin;
}

export interface EntityCandidate {
  entity_text: string;
  entity_type: "company" | "theme" | "sector";
  ticker: string | null;
  company_name?: string;
  cik?: string;
  sector?: string;
  theme?: string;
  confidence: number;
  match_type: MatchType;
  is_direct_company_mention: boolean;
  is_ceo_mention: boolean;
  is_sector_mention: boolean;
  is_primary: boolean;
}

export interface Classification {
  event_type: EventType;
  sentiment: Sentiment;
  direction: Direction;
  policy_domain: string;
  catalyst_type: CatalystType;
  market_relevance: MarketRelevance;
  language_features: string[];
  freshness_class: FreshnessClass;
  summary: string;
  risk_notes: string[];
  confidence: number;
  classifier_version: string;
}

export interface ScoreBreakdown {
  source: number;
  entity: number;
  language: number;
  freshness: number;
  market: number;
  total: number;
}

export interface MarketContext {
  price_at_detection?: number;
  day_return?: number;
  volume_zscore?: number;
  already_moved_pct?: number;
}

export interface ScoreResult {
  score: number;
  alert_level: AlertLevel;
  direction: Direction;
  reason_codes: string[];
  score_breakdown: ScoreBreakdown;
  scoring_version: string;
  score_mode: ScoreMode;
}

export interface AnalyzeResult {
  normalized_text: string;
  prefilter: {
    has_company_candidate: boolean;
    has_catalyst_keyword: boolean;
    should_classify: boolean;
  };
  entities: EntityCandidate[];
  classification: Classification;
  score: ScoreResult;
  primary_ticker: string | null;
}

export interface FixtureExpectation {
  id: string;
  description: string;
  input: EventInput;
  expect: {
    must_not_include_tickers?: string[];
    must_include_tickers?: string[];
    primary_ticker?: string | null;
    event_type?: EventType;
    direction?: Direction;
    score_min?: number;
    score_max?: number;
    market_relevance_min?: MarketRelevance;
  };
}
