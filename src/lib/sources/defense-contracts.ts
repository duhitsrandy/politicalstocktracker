import "server-only";

import * as cheerio from "cheerio";
import { SEED_COMPANIES } from "@/lib/data/seed-companies";

export const DEFENSE_CONTRACTS_URL =
  "https://www.war.gov/News/Contracts/";

export interface ParsedContract {
  contract_recipient_name: string;
  matched_public_parent: string | null;
  ticker: string | null;
  match_confidence: number;
  contract_amount: string | null;
  is_modification: boolean;
  is_new_award: boolean;
  agency: string;
  raw_snippet: string;
}

export function parseDefenseContractText(text: string): ParsedContract[] {
  const results: ParsedContract[] = [];
  const blocks = text.split(/\n{2,}/).filter((b) => b.length > 40);

  for (const block of blocks) {
    const is_modification = /\b(modification|option exercised|ceiling)\b/i.test(block);
    const is_new_award = /\b(awarded|award|contract)\b/i.test(block) && !is_modification;
    const amountMatch = block.match(/\$[\d,.]+ (million|billion)?/i);
    const contract_amount = amountMatch?.[0] ?? null;

    let matched: ParsedContract | null = null;
    for (const company of SEED_COMPANIES) {
      for (const alias of [company.company_name, ...company.aliases]) {
        if (alias.length < 4) continue;
        if (!new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(block)) {
          continue;
        }
        matched = {
          contract_recipient_name: alias,
          matched_public_parent: company.company_name,
          ticker: company.ticker,
          match_confidence: 0.88,
          contract_amount,
          is_modification,
          is_new_award,
          agency: "Department of Defense",
          raw_snippet: block.slice(0, 500),
        };
        break;
      }
      if (matched) break;
    }

    if (matched) results.push(matched);
  }

  return results;
}

export async function fetchDefenseContractsPage(): Promise<string> {
  try {
    const res = await fetch(DEFENSE_CONTRACTS_URL, {
      headers: { "User-Agent": "PoliticalCatalystRadar/0.1" },
    });
    if (!res.ok) return "";
    const html = await res.text();
    const $ = cheerio.load(html);
    return $("main").text() || $("article").text() || $.text();
  } catch {
    return "";
  }
}
