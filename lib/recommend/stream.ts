/**
 * Streaming JSON parser utilities for progressive recommendation rendering.
 * The LLM streams a large JSON object; we parse it incrementally so the UI
 * can render each recommendation as soon as its data arrives.
 */

import { tryParsePartialJSON } from "@/lib/ai/stream";
import { stripCodeFences } from "@/lib/ai/validate";

/** Parse a streaming buffer that may contain code fences and incomplete JSON. */
function parseBuffer(buffer: string): Record<string, unknown> | null {
  const clean = stripCodeFences(buffer);
  return tryParsePartialJSON(clean);
}

/**
 * Count how many recommendation objects in the buffer appear to be fully
 * complete (i.e., have all required fields including `sellingPoints`).
 */
export function getCompletedRecommendations(buffer: string): number {
  const parsed = parseBuffer(buffer);
  if (!parsed) return 0;

  const recs = parsed.recommendations;
  if (!Array.isArray(recs)) return 0;

  return recs.filter((r) => {
    if (typeof r !== "object" || r === null) return false;
    const rec = r as Record<string, unknown>;
    return (
      rec.tier &&
      rec.name &&
      rec.description &&
      Array.isArray(rec.toolIds) &&
      rec.reasoning &&
      Array.isArray((rec.reasoning as Record<string, unknown>).sellingPoints) &&
      rec.suggestedSettings
    );
  }).length;
}

/** Extract individual recommendation objects from a parsed partial response. */
export function extractRecommendations(
  buffer: string
): Array<Record<string, unknown>> {
  const parsed = parseBuffer(buffer);
  if (!parsed) return [];
  const recs = parsed.recommendations;
  if (!Array.isArray(recs)) return [];
  return recs as Array<Record<string, unknown>>;
}
