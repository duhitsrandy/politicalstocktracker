import "server-only";

import type { AnalyzeResult, EventInput, Origin } from "@/lib/types/event";

export function shouldAutoAlert(
  analysis: AnalyzeResult,
  origin: Origin,
): boolean {
  if (process.env.ENABLE_DISCORD_ALERTS !== "true") return false;
  if (origin !== "live") return false;
  if (analysis.classification.freshness_class === "duplicate") return false;
  if (analysis.classification.freshness_class === "echo") return false;
  if (analysis.score.score < 70) return false;

  const primary = analysis.entities.find((e) => e.is_primary && e.ticker);
  if (!primary || primary.confidence < 0.8) return false;

  return true;
}

export async function sendDiscordAlert(
  input: EventInput,
  analysis: AnalyzeResult,
  eventId?: string,
): Promise<boolean> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return false;

  const primary = analysis.entities.find((e) => e.is_primary && e.ticker);
  const ticker = primary?.ticker ?? "N/A";
  const price = analysis.score.score_breakdown.market
    ? "(see dashboard)"
    : "n/a";

  const body = {
    content: [
      "**Political Catalyst Alert**",
      `**Ticker:** ${ticker}`,
      `**Score:** ${analysis.score.score}/100`,
      `**Direction:** ${analysis.score.direction}`,
      `**Alert Level:** ${analysis.score.alert_level}`,
      `**Source:** ${input.source_type}`,
      `**Speaker:** ${input.speaker ?? "unknown"}`,
      `**Event:** ${analysis.classification.summary}`,
      `**Classification:** ${analysis.classification.event_type}`,
      `**Reasons:** ${analysis.score.reason_codes.slice(0, 6).join(", ")}`,
      `**Market:** ${price}`,
      eventId ? `**Event ID:** ${eventId}` : "",
    ].join("\n"),
  };

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}
