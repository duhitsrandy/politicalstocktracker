import { SEED_COMPANIES } from "@/lib/data/seed-companies";
import { isSupabaseConfigured } from "@/lib/db/supabase";

export default function CompanyDictionaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Company Dictionary</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Curated allowlist matcher ({SEED_COMPANIES.length} companies in seed).
          {isSupabaseConfigured()
            ? " Run npm run seed to sync to Supabase."
            : " Using in-memory seed until Supabase is configured."}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Ticker</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Sector ETF</th>
              <th className="px-3 py-2">Common word</th>
              <th className="px-3 py-2">Aliases</th>
            </tr>
          </thead>
          <tbody>
            {SEED_COMPANIES.map((c) => (
              <tr
                key={c.ticker}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="px-3 py-2 font-mono">{c.ticker}</td>
                <td className="px-3 py-2">{c.company_name}</td>
                <td className="px-3 py-2">{c.sector_etf ?? "—"}</td>
                <td className="px-3 py-2">
                  {c.is_common_word_ticker ? "yes" : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {c.aliases.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
