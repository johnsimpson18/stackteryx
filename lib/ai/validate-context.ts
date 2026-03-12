import type { AIContext } from "./context";

export interface ContextValidation {
  valid: boolean;
  missing: string[];
  quality: "rich" | "partial" | "minimal";
}

export function validateEnablementContext(
  ctx: AIContext
): ContextValidation {
  const missing: string[] = [];

  if (!ctx.service_context?.bundle_name) {
    missing.push("Service name");
  }

  const hasOutcome = !!ctx.service_context?.outcome_statement;
  const hasTools =
    (ctx.service_context?.versions ?? []).some(
      (v) => (v.tools?.length ?? 0) > 0
    );

  if (!hasOutcome && !hasTools) {
    missing.push("Outcome statement or tools");
  }

  const valid = missing.length === 0;

  let quality: ContextValidation["quality"] = "minimal";
  if (valid) {
    const hasCapabilities =
      (ctx.service_context?.service_capabilities?.length ?? 0) > 0;
    quality =
      hasOutcome && hasTools && hasCapabilities
        ? "rich"
        : "partial";
  }

  return { valid, missing, quality };
}

export function validateProposalContext(
  ctx: AIContext,
  serviceCount: number
): ContextValidation {
  const missing: string[] = [];

  if (!ctx.org_context?.org_name) {
    missing.push("Organization name");
  }

  if (serviceCount === 0) {
    missing.push("At least one service");
  }

  const valid = missing.length === 0;

  const hasClient = !!ctx.client_context?.client_name;
  const quality: ContextValidation["quality"] =
    valid && hasClient ? "rich" : valid ? "partial" : "minimal";

  return { valid, missing, quality };
}

export function validatePlaybookContext(params: {
  serviceName: string;
  outcomeStatement: string;
  toolCount: number;
}): ContextValidation {
  const missing: string[] = [];

  if (!params.serviceName) {
    missing.push("Service name");
  }

  if (!params.outcomeStatement && params.toolCount === 0) {
    missing.push("Outcome statement or tools");
  }

  const valid = missing.length === 0;

  let quality: ContextValidation["quality"] = "minimal";
  if (valid) {
    quality =
      params.outcomeStatement && params.toolCount > 0
        ? "rich"
        : "partial";
  }

  return { valid, missing, quality };
}
