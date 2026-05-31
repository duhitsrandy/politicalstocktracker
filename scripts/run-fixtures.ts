import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { analyzeEvent } from "../src/lib/analyzers/analyze-event";
import type { FixtureExpectation, MarketRelevance } from "../src/lib/types/event";

const RELEVANCE_ORDER: MarketRelevance[] = ["low", "medium", "high", "unknown"];

async function main() {
  const dir = join(process.cwd(), "tests/fixtures");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const raw = await readFile(join(dir, file), "utf-8");
    const fixture = JSON.parse(raw) as FixtureExpectation;
    const result = await analyzeEvent(fixture.input);
    const errors: string[] = [];
    const tickers = result.entities
      .filter((e) => e.ticker)
      .map((e) => e.ticker!);

    const exp = fixture.expect;

    if (exp.must_include_tickers) {
      for (const t of exp.must_include_tickers) {
        if (!tickers.includes(t)) errors.push(`missing ticker ${t}`);
      }
    }
    if (exp.must_not_include_tickers) {
      for (const t of exp.must_not_include_tickers) {
        if (tickers.includes(t)) errors.push(`unexpected ticker ${t}`);
      }
    }
    if (exp.primary_ticker !== undefined) {
      const primary = result.entities.find((e) => e.is_primary)?.ticker ?? null;
      if (primary !== exp.primary_ticker) {
        errors.push(`primary expected ${exp.primary_ticker}, got ${primary}`);
      }
    }
    if (exp.event_type && result.classification.event_type !== exp.event_type) {
      errors.push(
        `event_type expected ${exp.event_type}, got ${result.classification.event_type}`,
      );
    }
    if (exp.direction && result.classification.direction !== exp.direction) {
      errors.push(
        `direction expected ${exp.direction}, got ${result.classification.direction}`,
      );
    }
    if (exp.score_min !== undefined && result.score.score < exp.score_min) {
      errors.push(`score ${result.score.score} < min ${exp.score_min}`);
    }
    if (exp.score_max !== undefined && result.score.score > exp.score_max) {
      errors.push(`score ${result.score.score} > max ${exp.score_max}`);
    }
    if (exp.market_relevance_min) {
      const minIdx = RELEVANCE_ORDER.indexOf(exp.market_relevance_min);
      const gotIdx = RELEVANCE_ORDER.indexOf(result.classification.market_relevance);
      if (gotIdx < minIdx) {
        errors.push(
          `market_relevance ${result.classification.market_relevance} below ${exp.market_relevance_min}`,
        );
      }
    }

    if (errors.length === 0) {
      console.log(`✓ ${fixture.id}`);
      passed++;
    } else {
      console.log(`✗ ${fixture.id}`);
      for (const e of errors) console.log(`  - ${e}`);
      console.log(`  tickers: ${tickers.join(", ") || "(none)"}`);
      console.log(`  score: ${result.score.score} (${result.score.alert_level})`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
