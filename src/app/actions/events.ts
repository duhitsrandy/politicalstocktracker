"use server";

import { runAnalyzePipeline } from "@/lib/analyzers/pipeline";
import type { EventInput } from "@/lib/types/event";
import { sendDiscordAlert } from "@/lib/alerts/discord";

export async function previewEventAction(input: EventInput) {
  const { analysis, marketSnapshot } = await runAnalyzePipeline(input, {
    origin: input.origin ?? "manual",
    save: false,
    alert: false,
  });
  return { analysis, marketSnapshot };
}

export async function saveEventAction(input: EventInput) {
  return runAnalyzePipeline(input, {
    origin: input.origin ?? "manual",
    save: true,
    alert: false,
  });
}

export async function sendTestAlertAction(input: EventInput) {
  const { analysis, eventId } = await runAnalyzePipeline(input, {
    origin: "test",
    save: false,
    alert: false,
  });
  const ok = await sendDiscordAlert(input, analysis, eventId);
  return { ok };
}
