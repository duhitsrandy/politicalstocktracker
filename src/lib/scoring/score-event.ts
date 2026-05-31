import type {
  Classification,
  Direction,
  EntityCandidate,
  EventInput,
  MarketContext,
  ScoreBreakdown,
  ScoreResult,
  ScoreMode,
} from "@/lib/types/event";
import {
  EVENT_TYPE_LANGUAGE_SCORES,
  FRESHNESS_SCORES,
  SCORING_VERSION,
  SOURCE_TYPE_SCORES,
  SPEAKER_SCORES,
} from "@/lib/scoring/score-config";
import { getAlertLevel } from "@/lib/scoring/alert-level";
import { inferSpeakerLevel } from "@/lib/analyzers/classify-event";

export function scoreEvent(
  input: EventInput,
  classification: Classification,
  entities: EntityCandidate[],
  market?: MarketContext,
  scoreMode: ScoreMode = "text_only",
): ScoreResult {
  const reasons: string[] = [];
  let source = 0;
  let entity = 0;
  let language = 0;
  let freshness = 0;
  let marketScore = 0;

  const speakerLevel = inferSpeakerLevel(input.speaker, input.source_type);
  const speakerPts = SPEAKER_SCORES[speakerLevel] ?? 0;
  if (speakerPts > 0) {
    source += speakerPts;
    reasons.push("high_authority_speaker");
  }

  const sourcePts = SOURCE_TYPE_SCORES[input.source_type] ?? SOURCE_TYPE_SCORES.unknown ?? 0;
  if (sourcePts > 0) {
    source += sourcePts;
    reasons.push(`source_${input.source_type}`);
  }

  const primary =
    entities.find((e) => e.is_primary && e.ticker) ??
    entities.find((e) => e.ticker && e.confidence >= 0.85);

  if (primary?.ticker) {
    if (primary.confidence >= 0.95 && primary.is_direct_company_mention) {
      entity += 20;
      reasons.push("direct_public_company_mention");
    } else if (primary.confidence >= 0.9) {
      entity += 16;
      reasons.push("alias_match");
    } else if (primary.is_ceo_mention) {
      entity += 12;
      reasons.push("ceo_mapped_to_company");
    } else if (primary.is_sector_mention) {
      entity += 6;
      reasons.push("sector_theme_only");
    } else if (primary.confidence < 0.8) {
      entity -= 20;
      reasons.push("ambiguous_entity");
    }
  } else if (entities.length === 0) {
    entity -= 10;
    reasons.push("no_public_ticker");
  }

  const langPts = EVENT_TYPE_LANGUAGE_SCORES[classification.event_type] ?? 0;
  if (langPts > 0) {
    language += langPts;
    reasons.push(`event_type_${classification.event_type}`);
  }
  for (const feat of classification.language_features) {
    if (feat === "buy_like_language" && !reasons.includes("buy_like_language")) {
      language += 5;
      reasons.push("buy_like_language");
    }
    if (feat === "national_security" && !reasons.includes("national_security_framing")) {
      language += 5;
      reasons.push("national_security_framing");
    }
  }

  const freshPts = FRESHNESS_SCORES[classification.freshness_class] ?? 0;
  freshness += freshPts;
  if (freshPts < 0) reasons.push(`freshness_${classification.freshness_class}`);

  if (market) {
    if ((market.volume_zscore ?? 0) > 3) {
      marketScore += 15;
      reasons.push("abnormal_volume");
    }
    if ((market.day_return ?? 0) > 0.02) {
      marketScore += 10;
      reasons.push("price_move_after_event");
    }
    const moved = market.already_moved_pct ?? 0;
    if (moved > 15) {
      marketScore -= 20;
      reasons.push("stock_already_moved_substantially");
    } else if (moved > 8) {
      marketScore -= 10;
      reasons.push("stock_already_moved");
    }
  }

  const total = Math.max(
    0,
    Math.min(100, source + entity + language + freshness + marketScore),
  );

  const score_breakdown: ScoreBreakdown = {
    source,
    entity,
    language,
    freshness,
    market: marketScore,
    total,
  };

  const direction: Direction = classification.direction;

  return {
    score: total,
    alert_level: getAlertLevel(total),
    direction,
    reason_codes: reasons,
    score_breakdown,
    scoring_version: SCORING_VERSION,
    score_mode: scoreMode,
  };
}
