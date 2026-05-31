import { readFile } from "fs/promises";
import { join } from "path";
import { analyzeEvent } from "../src/lib/analyzers/analyze-event";
import type { Direction } from "../src/lib/types/event";

interface BacktestEvent {
  id: string;
  label_primary_ticker: string | null;
  dictionary_asof: string;
  event_date: string;
  input: import("../src/lib/types/event").EventInput;
  realized_direction: Direction;
  returns: {
    next_close: number;
    "5_td": number;
    sector_5_td: number;
  };
}

function bucket(score: number): string {
  if (score >= 86) return "86-100";
  if (score >= 71) return "71-85";
  if (score >= 51) return "51-70";
  if (score >= 31) return "31-50";
  return "0-30";
}

function directionMatch(predicted: Direction, realized: Direction): boolean {
  if (predicted === "unknown" || realized === "neutral") return predicted === realized;
  if (predicted === "mixed" || realized === "mixed") return true;
  return predicted === realized;
}

async function main() {
  const raw = await readFile(
    join(process.cwd(), "tests/backtest/events.json"),
    "utf-8",
  );
  const events = JSON.parse(raw) as BacktestEvent[];

  console.log("=== Political Catalyst Radar — Pre-registered Backtest ===\n");
  console.log(
    "CAVEATS: Hindsight dictionary bias possible. Beta confounding partially addressed via sector-relative excess.\n",
  );

  const results: {
    id: string;
    score: number;
    bucket: string;
    predicted_direction: Direction;
    realized_direction: Direction;
    dir_ok: boolean;
    ticker_ok: boolean;
    excess_5td: number;
  }[] = [];

  let tickerCorrect = 0;
  let tickerTotal = 0;
  let dirCorrect = 0;

  for (const ev of events) {
    const analysis = await analyzeEvent(ev.input);
    const primary =
      analysis.entities.find((e) => e.is_primary)?.ticker ??
      analysis.primary_ticker;

    const ticker_ok =
      ev.label_primary_ticker === null
        ? !primary || primary === null
        : primary === ev.label_primary_ticker;

    if (ev.label_primary_ticker !== null) {
      tickerTotal++;
      if (ticker_ok) tickerCorrect++;
    } else if (!primary) {
      tickerCorrect++;
      tickerTotal++;
    }

    const dir_ok = directionMatch(
      analysis.classification.direction,
      ev.realized_direction,
    );
    if (dir_ok) dirCorrect++;

    const excess_5td = ev.returns["5_td"] - ev.returns.sector_5_td;

    results.push({
      id: ev.id,
      score: analysis.score.score,
      bucket: bucket(analysis.score.score),
      predicted_direction: analysis.classification.direction,
      realized_direction: ev.realized_direction,
      dir_ok,
      ticker_ok,
      excess_5td,
    });
  }

  const buckets = ["0-30", "31-50", "51-70", "71-85", "86-100"];
  console.log("Score bucket vs avg 5d sector-relative excess:\n");
  console.log("Bucket      | N  | Avg excess (5td vs sector)");
  console.log("------------|----|-----------------------------");

  let monotonic = true;
  let prevAvg = -999;

  for (const b of buckets) {
    const inBucket = results.filter((r) => r.bucket === b);
    const avg =
      inBucket.length > 0
        ? inBucket.reduce((s, r) => s + r.excess_5td, 0) / inBucket.length
        : NaN;
    console.log(
      `${b.padEnd(11)} | ${String(inBucket.length).padEnd(2)} | ${Number.isNaN(avg) ? "n/a" : avg.toFixed(4)}`,
    );
    if (!Number.isNaN(avg) && inBucket.length > 0) {
      if (avg < prevAvg && prevAvg > -999) monotonic = false;
      prevAvg = avg;
    }
  }

  const tickerAcc =
    tickerTotal > 0 ? (tickerCorrect / tickerTotal) * 100 : 0;
  const dirAcc = (dirCorrect / events.length) * 100;

  const highBucket = results.filter((r) =>
    ["71-85", "86-100"].includes(r.bucket),
  );
  const lowBucket = results.filter((r) => ["0-30", "31-50"].includes(r.bucket));
  const highAvg =
    highBucket.length > 0
      ? highBucket.reduce((s, r) => s + r.excess_5td, 0) / highBucket.length
      : 0;
  const lowAvg =
    lowBucket.length > 0
      ? lowBucket.reduce((s, r) => s + r.excess_5td, 0) / lowBucket.length
      : 0;

  console.log("\nDirection correctness:", dirAcc.toFixed(1) + "%");
  console.log("Ticker resolution accuracy:", tickerAcc.toFixed(1) + "%");
  console.log("High bucket avg excess:", highAvg.toFixed(4));
  console.log("Low bucket avg excess:", lowAvg.toFixed(4));

  const gate1 = highAvg > lowAvg;
  const gate2 = dirAcc >= 45;
  const gate3 = tickerAcc >= 85;

  console.log("\n=== GO/NO-GO (frozen criteria) ===");
  console.log(`1. High buckets beat low on sector excess (5td): ${gate1 ? "PASS" : "FAIL"}`);
  console.log(`2. Direction better than chance (>=45%): ${gate2 ? "PASS" : "FAIL"}`);
  console.log(`3. Ticker accuracy (>=85%): ${gate3 ? "PASS" : "FAIL"}`);

  const pass = gate1 && gate2 && gate3;
  console.log(`\nOverall: ${pass ? "GO — proceed to Phase D" : "NO-GO — retune score-config / dictionary"}`);
  process.exit(pass ? 0 : 1);
}

main();
