export const SCORING_VERSION = "v1.0.0";

export const SPEAKER_SCORES: Record<string, number> = {
  president: 30,
  vice_president: 22,
  cabinet_secretary: 20,
  agency_head: 18,
  committee_chair: 10,
  major_news_official: 10,
  social_commentary: 3,
};

export const SOURCE_TYPE_SCORES: Record<string, number> = {
  white_house_remarks: 20,
  white_house_release: 20,
  executive_order: 25,
  fact_sheet: 25,
  defense_contract: 30,
  sec_filing: 18,
  agency_release: 20,
  news_article: 8,
  manual: 5,
  unknown: 0,
};

export const EVENT_TYPE_LANGUAGE_SCORES: Record<string, number> = {
  government_contract: 30,
  contract_modification: 18,
  government_funding: 35,
  equity_stake: 35,
  buy_like_language: 25,
  tariff_protection: 20,
  tariff_threat: 20,
  national_security: 18,
  export_control: 20,
  sanction: 20,
  regulatory_threat: 20,
  antitrust_threat: 20,
  company_praise: 12,
  ceo_praise: 8,
  sector_policy: 5,
};

export const FRESHNESS_SCORES: Record<string, number> = {
  fresh: 15,
  confirming: 3,
  stale: -10,
  duplicate: -25,
  echo: -20,
};
