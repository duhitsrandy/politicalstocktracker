import type { AlertLevel } from "@/lib/types/event";

export function getAlertLevel(score: number): AlertLevel {
  if (score >= 86) return "urgent";
  if (score >= 71) return "high";
  if (score >= 51) return "medium";
  if (score >= 31) return "watch";
  return "log";
}
