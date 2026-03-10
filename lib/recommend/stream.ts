/**
 * Streaming JSON parser utilities for progressive recommendation rendering.
 * The LLM streams a large JSON object; we parse it incrementally so the UI
 * can render each recommendation as soon as its data arrives.
 */

/** Strip ```json ... ``` code fences that LLMs sometimes add. */
function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
}

/**
 * Attempt to parse a potentially incomplete JSON string.
 * Strategy:
 *   1. Try JSON.parse directly.
 *   2. Try appending increasing numbers of closing braces/brackets to fix
 *      truncated objects.
 *   3. Return null if nothing works.
 */
export function tryParsePartialJSON(
  buffer: string
): Record<string, unknown> | null {
  const clean = stripCodeFences(buffer).trim();
  if (!clean) return null;

  // Fast path: complete JSON
  try {
    const parsed = JSON.parse(clean);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through to repair attempts
  }

  // Attempt repair by counting unbalanced braces/brackets and closing them
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const ch of clean) {
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") openBraces++;
    else if (ch === "}") openBraces--;
    else if (ch === "[") openBrackets++;
    else if (ch === "]") openBrackets--;
  }

  // Build closing suffix — close string/array/object in the right order
  let suffix = "";
  // If we're inside an unterminated string value, close it
  if (inString) suffix += '"';
  // Close arrays before objects (innermost first)
  suffix += "]".repeat(Math.max(0, openBrackets));
  suffix += "}".repeat(Math.max(0, openBraces));

  if (suffix) {
    try {
      const repaired = JSON.parse(clean + suffix);
      if (typeof repaired === "object" && repaired !== null) {
        return repaired as Record<string, unknown>;
      }
    } catch {
      // still malformed — return null
    }
  }

  return null;
}

/**
 * Count how many recommendation objects in the buffer appear to be fully
 * complete (i.e., have all required fields including `sellingPoints`).
 */
export function getCompletedRecommendations(buffer: string): number {
  const parsed = tryParsePartialJSON(buffer);
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
  const parsed = tryParsePartialJSON(buffer);
  if (!parsed) return [];
  const recs = parsed.recommendations;
  if (!Array.isArray(recs)) return [];
  return recs as Array<Record<string, unknown>>;
}
