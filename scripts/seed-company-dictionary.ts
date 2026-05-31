import { SEED_COMPANIES } from "../src/lib/data/seed-companies";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log(
      "Supabase not configured. Seed data lives in src/lib/data/seed-companies.ts",
    );
    console.log(`Companies in seed: ${SEED_COMPANIES.length}`);
    process.exit(0);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key);

  const rows = SEED_COMPANIES.map((c) => ({
    ticker: c.ticker,
    company_name: c.company_name,
    cik: c.cik ?? null,
    exchange: c.exchange ?? null,
    sector: c.sector ?? null,
    industry: c.industry ?? null,
    sector_etf: c.sector_etf ?? null,
    aliases: c.aliases,
    people: c.people,
    themes: c.themes,
    is_common_word_ticker: c.is_common_word_ticker,
    requires_context: c.requires_context,
    is_active: true,
  }));

  const { error } = await db.from("company_dictionary").upsert(rows, {
    onConflict: "ticker",
  });

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} companies`);
}

main();
