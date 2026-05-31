"use server";

import { analyzeEvent } from "@/lib/analyzers/analyze-event";
import { runAnalyzePipeline } from "@/lib/analyzers/pipeline";
import type { EventInput } from "@/lib/types/event";
import { loadCompanyDictionary } from "@/lib/db/queries";
import { sendDiscordAlert } from "@/lib/alerts/discord";
import { isAiClassifierEnabled } from "@/lib/analyzers/ai-classify";

export async function previewEventAction(input: EventInput) {
  const dictionary = await loadCompanyDictionary();
  return analyzeEvent(input, {
    dictionary,
    useAi: isAiClassifierEnabled(),
  });
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
