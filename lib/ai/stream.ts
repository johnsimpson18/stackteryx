/**
 * Streaming utilities for progressive JSON parsing during SSE consumption.
 */

/**
 * Attempts to parse incomplete JSON by closing unclosed braces/brackets.
 * Returns parsed object on success, null on failure.
 */
export function tryParsePartialJSON(text: string): Record<string, unknown> | null {
  let trimmed = text.trim();
  if (!trimmed) return null;

  // Try parsing as-is first
  try {
    const result = JSON.parse(trimmed);
    if (result && typeof result === "object" && !Array.isArray(result)) {
      return result as Record<string, unknown>;
    }
    return null;
  } catch {
    // Continue to attempt repair
  }

  // Count unclosed braces and brackets
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }

  // If we're inside a string, close it
  if (inString) {
    trimmed += '"';
  }

  // Remove trailing comma before closing
  trimmed = trimmed.replace(/,\s*$/, "");

  // Close unclosed brackets then braces
  for (let i = 0; i < brackets; i++) trimmed += "]";
  for (let i = 0; i < braces; i++) trimmed += "}";

  try {
    const result = JSON.parse(trimmed);
    if (result && typeof result === "object" && !Array.isArray(result)) {
      return result as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the top-level keys from `schema` that are fully present in the parsed object.
 * A key is "complete" when the next key in the schema has started appearing.
 * The last key in the schema is considered complete only when the full JSON is valid.
 */
export function getCompletedSections(
  parsed: Record<string, unknown>,
  schema: string[]
): string[] {
  const completed: string[] = [];

  for (let i = 0; i < schema.length; i++) {
    const key = schema[i];
    if (!(key in parsed)) break;

    // A section is complete if the next section's key exists
    if (i < schema.length - 1) {
      const nextKey = schema[i + 1];
      if (nextKey in parsed) {
        completed.push(key);
      }
    }
    // Last section — we can't tell from keys alone, caller marks it on [DONE]
  }

  return completed;
}
