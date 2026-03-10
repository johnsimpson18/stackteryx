import { getAnthropicClient } from "./client";
import { SYSTEM_PROMPT } from "./prompts";

/**
 * Remove markdown code fences from AI response text.
 */
export function stripCodeFences(raw: string): string {
  let text = raw.trim();
  // Remove ```json ... ``` or ``` ... ```
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return text.trim();
}

/**
 * Parse JSON from AI response and validate required fields are present.
 */
export function parseAIResponse<T>(
  raw: string,
  requiredFields: string[]
): T {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);

  for (const field of requiredFields) {
    if (!(field in parsed) || parsed[field] === undefined) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return parsed as T;
}

/**
 * Full AI call cycle: call Anthropic, parse response, retry once on failure.
 */
export async function callAI<T>(params: {
  userPrompt: string;
  requiredFields: string[];
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const client = getAnthropicClient();
  const { userPrompt, requiredFields, temperature = 0.4, maxTokens = 4096 } = params;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: userPrompt },
  ];

  // First attempt
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    temperature,
    system: SYSTEM_PROMPT,
    messages,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return parseAIResponse<T>(text, requiredFields);
  } catch (firstError) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[AI] First parse failed, retrying:", firstError);
      console.warn("[AI] Raw response:", text.slice(0, 500));
    }

    // Retry once with correction prompt
    messages.push({ role: "assistant", content: text });
    messages.push({
      role: "user",
      content:
        "Your previous response was not valid JSON or was missing required fields. Please return ONLY valid JSON with all required fields. No markdown, no code fences, no commentary.",
    });

    const retryResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      system: SYSTEM_PROMPT,
      messages,
    });

    const retryText =
      retryResponse.content[0].type === "text"
        ? retryResponse.content[0].text
        : "";

    try {
      return parseAIResponse<T>(retryText, requiredFields);
    } catch (retryError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[AI] Retry also failed:", retryError);
        console.error("[AI] Retry response:", retryText.slice(0, 500));
      }
      throw new Error(
        `AI response parsing failed after retry: ${retryError instanceof Error ? retryError.message : "Unknown error"}`
      );
    }
  }
}
