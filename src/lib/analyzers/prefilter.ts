const CATALYST_KEYWORDS = [
  "contract",
  "award",
  "funding",
  "grant",
  "loan",
  "equity stake",
  "tariff",
  "export control",
  "sanction",
  "national security",
  "critical",
  "semiconductor",
  "chips",
  "quantum",
  "nuclear",
  "pentagon",
  "department of defense",
  "commerce department",
  "energy department",
  "antitrust",
  "investigation",
  "buy",
  "great company",
  "fantastic company",
  "incredible job",
  "executive order",
  "procurement",
  "defense",
  "rare earth",
];

export interface PrefilterResult {
  has_company_candidate: boolean;
  has_catalyst_keyword: boolean;
  should_classify: boolean;
  matched_keywords: string[];
}

export function prefilterCatalyst(
  normalizedText: string,
  hasCompanyCandidate: boolean,
): PrefilterResult {
  const lower = normalizedText.toLowerCase();
  const matched_keywords = CATALYST_KEYWORDS.filter((kw) => lower.includes(kw));
  const has_catalyst_keyword = matched_keywords.length > 0;
  const should_classify =
    has_catalyst_keyword && (hasCompanyCandidate || hasThemeHint(lower));

  return {
    has_company_candidate: hasCompanyCandidate,
    has_catalyst_keyword,
    should_classify,
    matched_keywords,
  };
}

function hasThemeHint(lower: string): boolean {
  const themes = [
    "ai infrastructure",
    "semiconductor",
    "quantum computing",
    "defense contractor",
    "rare earth",
    "chip policy",
  ];
  return themes.some((t) => lower.includes(t));
}
