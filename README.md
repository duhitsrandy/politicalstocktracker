# Political Catalyst Radar

Personal political catalyst radar: detect high-authority political/government/company events, map to tickers, classify, score market relevance (not bullishness), alert on live events, and track forward returns.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → Dashboard / Paste Event.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run fixtures` | Golden fixture tests (analyzer offline) |
| `npm run backtest` | Pre-registered backtest gate |
| `npm run seed` | Seed `company_dictionary` to Supabase |

## Finnhub (market quotes)

1. Add your key to `.env.local`:
   ```bash
   FINNHUB_API_KEY=your_key_here
   ```
2. Verify the connection:
   ```bash
   npm run market:check
   ```
3. Restart the dev server (`npm run dev`).
4. On **Paste Event**, **Analyze** or **Save** shows a market snapshot and uses `text_plus_market` scoring when a primary ticker is detected.

Free tier rate limits apply; the app fetches one quote per analyze/save for the primary ticker.

## Environment

Copy `.env.local.example` to `.env.local`.

Without Supabase, events persist to `.data/` locally.

## Architecture

1. **Pure analyzer** (`src/lib/analyzers/`, `src/lib/scoring/`) — rules prefilter + deterministic score; optional LLM for classification only.
2. **Backtest gate** (`tests/backtest/`, `npm run backtest`) — run before trusting ingestion.
3. **Persistence** — Supabase or local JSON store.
4. **Market / alerts / cron** — Finnhub + Discord; Vercel crons when deployed.

## Deploy on Vercel (Hobby)

**Built-in crons:** Hobby allows each cron expression to run **at most once per day**. `vercel.json` uses daily schedules so deploy succeeds:

| Route | Vercel schedule (UTC) |
|-------|------------------------|
| `/api/cron/poll-whitehouse` | 08:00 daily |
| `/api/cron/poll-defense` | 22:05 Mon–Fri |
| `/api/cron/update-forward-returns` | 09:30 daily |

**Frequent polling (free):** For White House every ~15 minutes and forward returns hourly, enable GitHub Actions (see `.github/workflows/`). In the repo, add secrets:

- `CRON_SECRET` — same value as on Vercel
- `VERCEL_APP_URL` — production URL, e.g. `https://your-app.vercel.app`

Set on Vercel: `ENABLE_SOURCE_POLLING=true`, Supabase keys, `FINNHUB_API_KEY`, `CRON_SECRET`.

Pro plan: you can switch `vercel.json` back to `*/15 * * * *` and `0 * * * *` if you prefer Vercel-native crons only.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. `npm run seed`

## Score vs direction

- **Score** = market relevance / alert importance (0–100).
- **Direction** = bullish | bearish | mixed | neutral (separate field).

## License

Private / personal use.
