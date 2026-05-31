import type { CompanyRecord, EntityCandidate, MatchType } from "@/lib/types/event";
import { SEED_COMPANIES } from "@/lib/data/seed-companies";

const FINANCIAL_CONTEXT =
  /\b(stock|shares|ticker|NYSE|NASDAQ|invest|market|company|CEO|president|contract|award|tariff|buy)\b/i;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordBoundaryMatch(text: string, term: string): boolean {
  const re = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
  return re.test(text);
}

function hasFinancialContext(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - 80), index + 80);
  return FINANCIAL_CONTEXT.test(window);
}

export function resolveTickers(
  normalizedText: string,
  dictionary: CompanyRecord[] = SEED_COMPANIES,
  manualOverride?: string,
): EntityCandidate[] {
  const candidates: EntityCandidate[] = [];
  const seen = new Set<string>();

  if (manualOverride) {
    const company = dictionary.find(
      (c) => c.ticker.toUpperCase() === manualOverride.toUpperCase(),
    );
    if (company) {
      return [
        buildCandidate(company, company.ticker, "manual_override", 0.99, {
          is_primary: true,
          entity_text: company.ticker,
        }),
      ];
    }
  }

  // Cashtags $IBM
  for (const m of normalizedText.matchAll(/\$([A-Z]{1,5})\b/g)) {
    const sym = m[1]!;
    addTickerMatch(candidates, seen, dictionary, sym, "cashtag", 0.99, sym, m.index ?? 0);
  }

  // Company names and aliases (longest first)
  const aliasEntries: { company: CompanyRecord; alias: string }[] = [];
  for (const company of dictionary) {
    for (const alias of [company.company_name, ...company.aliases]) {
      if (alias.length >= 3) aliasEntries.push({ company, alias });
    }
  }
  aliasEntries.sort((a, b) => b.alias.length - a.alias.length);

  for (const { company, alias } of aliasEntries) {
    if (!wordBoundaryMatch(normalizedText, alias)) continue;
    const idx = normalizedText.toLowerCase().indexOf(alias.toLowerCase());
    if (company.requires_context && alias.length <= 6) {
      const exactInText = normalizedText.includes(alias);
      const hasContext = hasFinancialContext(normalizedText, idx);
      if (!exactInText && !hasContext) continue;
      if (!hasContext && alias[0] === alias[0]?.toUpperCase()) {
        const re = new RegExp(`\\b${escapeRegex(alias)}\\b`);
        if (!re.test(normalizedText)) continue;
      }
      if (!hasContext && alias.toLowerCase() === alias) {
        const re = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
        const m = re.exec(normalizedText);
        if (m && m[0] === m[0].toLowerCase() && !hasFinancialContext(normalizedText, m.index ?? 0))
          continue;
      }
    }
    const matchType: MatchType =
      alias === company.company_name ? "company_name" : "alias";
    const conf = matchType === "company_name" ? 0.96 : 0.95;
    addCompanyMatch(candidates, seen, company, alias, matchType, conf, idx);
  }

  // CEO / people
  for (const company of dictionary) {
    for (const person of company.people) {
      if (person.length < 4 || !wordBoundaryMatch(normalizedText, person)) continue;
      const key = `person:${company.ticker}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(
        buildCandidate(company, company.ticker, "ceo_person", 0.85, {
          entity_text: person,
          is_ceo_mention: true,
        }),
      );
    }
  }

  // Bare tickers in financial context
  for (const company of dictionary) {
    const sym = company.ticker;
    if (!wordBoundaryMatch(normalizedText, sym)) continue;
    const idx = normalizedText.search(new RegExp(`\\b${escapeRegex(sym)}\\b`, "i"));
    if (idx < 0) continue;

    let conf = company.is_common_word_ticker ? 0.65 : 0.92;
    if (company.requires_context && !hasFinancialContext(normalizedText, idx)) {
      if (company.is_common_word_ticker) continue;
      conf = 0.6;
    }
    addTickerMatch(
      candidates,
      seen,
      dictionary,
      sym,
      "ticker_context",
      conf,
      sym,
      idx,
    );
  }

  const hasStrongDirect = candidates.some(
    (c) => c.is_direct_company_mention && (c.confidence ?? 0) >= 0.9,
  );

  // Themes (skip noisy theme hits when we already have a strong direct match)
  for (const company of dictionary) {
    if (hasStrongDirect && !company.ticker) continue;
    for (const theme of company.themes) {
      if (hasStrongDirect && candidates.some((c) => c.ticker === company.ticker)) continue;
      if (theme.length < 4 || !normalizedText.toLowerCase().includes(theme.toLowerCase()))
        continue;
      const key = `theme:${company.ticker}:${theme}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        entity_text: theme,
        entity_type: "theme",
        ticker: company.ticker,
        company_name: company.company_name,
        sector: company.sector,
        theme,
        confidence: 0.72,
        match_type: "theme",
        is_direct_company_mention: false,
        is_ceo_mention: false,
        is_sector_mention: true,
        is_primary: false,
      });
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  if (candidates.length > 0 && !candidates.some((c) => c.is_primary)) {
    const top = candidates.find((c) => c.entity_type === "company" || c.ticker);
    if (top) top.is_primary = true;
  }

  return candidates;
}

function addTickerMatch(
  candidates: EntityCandidate[],
  seen: Set<string>,
  dictionary: CompanyRecord[],
  sym: string,
  matchType: MatchType,
  baseConf: number,
  entityText: string,
  index: number,
) {
  const company = dictionary.find((c) => c.ticker === sym.toUpperCase());
  if (!company) return;
  const key = `ticker:${company.ticker}`;
  if (seen.has(key)) return;
  let conf = baseConf;
  if (company.is_common_word_ticker && !hasFinancialContext("", index)) {
    if (company.requires_context) conf = Math.min(conf, 0.7);
  }
  seen.add(key);
  candidates.push(
    buildCandidate(company, company.ticker, matchType, conf, {
      entity_text: entityText,
      is_direct_company_mention: matchType === "cashtag" || matchType === "ticker_context",
    }),
  );
}

function addCompanyMatch(
  candidates: EntityCandidate[],
  seen: Set<string>,
  company: CompanyRecord,
  alias: string,
  matchType: MatchType,
  conf: number,
  _idx: number,
) {
  const key = `company:${company.ticker}`;
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push(
    buildCandidate(company, company.ticker, matchType, conf, {
      entity_text: alias,
      is_direct_company_mention: true,
    }),
  );
}

function buildCandidate(
  company: CompanyRecord,
  ticker: string,
  matchType: MatchType,
  confidence: number,
  extra: Partial<EntityCandidate>,
): EntityCandidate {
  return {
    entity_text: extra.entity_text ?? company.company_name,
    entity_type: "company",
    ticker,
    company_name: company.company_name,
    sector: company.sector,
    confidence,
    match_type: matchType,
    is_direct_company_mention: extra.is_direct_company_mention ?? false,
    is_ceo_mention: extra.is_ceo_mention ?? false,
    is_sector_mention: false,
    is_primary: extra.is_primary ?? false,
    ...extra,
  };
}

export function hasCompanyCandidate(entities: EntityCandidate[]): boolean {
  return entities.some(
    (e) =>
      e.entity_type === "company" &&
      e.ticker &&
      (e.is_direct_company_mention || e.confidence >= 0.85),
  );
}
