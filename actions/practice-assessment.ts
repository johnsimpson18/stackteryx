"use server";

import { getAnthropicClient } from "@/lib/ai/client";
import { getActiveOrgId } from "@/lib/org-context";
import { incrementUsage } from "@/actions/billing";
import { assembleChatContext } from "@/lib/intelligence/chat-context";
import { buildAssessmentSystemPrompt } from "@/lib/intelligence/assessment-system-prompt";
import { createServiceClient } from "@/lib/supabase/service";

// ── Types ────────────────────────────────────────────────────────────────────

export interface StoredAssessment {
  id: string;
  content: string;
  chips: string[];
  generatedAt: string;
  serviceModel: string | null;
  toolCount: number;
  serviceCount: number;
  blendedMargin: number | null;
}

// ── Get current assessment ──────────────────────────────────────────────────

export async function getCurrentAssessment(): Promise<StoredAssessment | null> {
  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("practice_assessments")
    .select("id, content, chips, generated_at, service_model, tool_count, service_count, blended_margin")
    .eq("org_id", orgId)
    .eq("is_current", true)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    content: data.content,
    chips: (data.chips as string[]) ?? [],
    generatedAt: data.generated_at,
    serviceModel: data.service_model,
    toolCount: data.tool_count ?? 0,
    serviceCount: data.service_count ?? 0,
    blendedMargin: data.blended_margin != null ? Number(data.blended_margin) : null,
  };
}

// ── Check if practice changed since last assessment ─────────────────────────

export async function checkPracticeChanged(): Promise<boolean> {
  const orgId = await getActiveOrgId();
  if (!orgId) return false;

  const service = createServiceClient();

  const [assessmentRes, toolCountRes, serviceCountRes] = await Promise.allSettled([
    service
      .from("practice_assessments")
      .select("tool_count, service_count, service_model")
      .eq("org_id", orgId)
      .eq("is_current", true)
      .maybeSingle(),
    service
      .from("tools")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "active"),
    service
      .from("bundles")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  const assessment = assessmentRes.status === "fulfilled" ? assessmentRes.value.data : null;
  if (!assessment) return false; // No assessment yet — nothing to compare

  const currentToolCount = toolCountRes.status === "fulfilled" ? (toolCountRes.value.count ?? 0) : 0;
  const currentServiceCount = serviceCountRes.status === "fulfilled" ? (serviceCountRes.value.count ?? 0) : 0;

  return (
    currentToolCount !== (assessment.tool_count ?? 0) ||
    currentServiceCount !== (assessment.service_count ?? 0)
  );
}

// ── Generate new assessment ─────────────────────────────────────────────────

export async function generatePracticeAssessment(): Promise<{
  success: boolean;
  assessment?: StoredAssessment;
  error?: string;
}> {
  const orgId = await getActiveOrgId();
  if (!orgId) return { success: false, error: "Not authenticated" };

  try {
    const context = await assembleChatContext(orgId);
    const systemPrompt = buildAssessmentSystemPrompt(context);

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      temperature: 0.4,
      system: systemPrompt,
      messages: [
        {
          role: "user" as const,
          content: "Generate my practice assessment based on my current tools, services, and business profile.",
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse chips from the end of the response
    let content = text;
    let chips: string[] = [];
    const chipsMatch = text.match(/CHIPS:\s*\[([^\]]*)\]/);
    if (chipsMatch) {
      content = text.slice(0, chipsMatch.index).trim();
      try {
        chips = JSON.parse(`[${chipsMatch[1]}]`);
      } catch {
        chips = ["What should I do first?"];
      }
    }
    if (chips.length === 0) {
      chips = ["What should I do first?", "Help me build a bundle"];
    }

    // Current practice state for change detection
    const toolCount = context.toolCatalog.tools.length ||
      Object.values(context.toolCatalog.categoryBreakdown).reduce((s, n) => s + n, 0);
    const serviceCount = context.practice.serviceCount;
    const serviceModel = context.wizardProfile?.serviceModel ?? context.profile.serviceModel;
    const blendedMargin = context.toolCatalog.blendedMargin;

    // Upsert: mark previous as not current, insert new
    const service = createServiceClient();
    await service
      .from("practice_assessments")
      .update({ is_current: false })
      .eq("org_id", orgId)
      .eq("is_current", true);

    const { data: inserted, error: insertErr } = await service
      .from("practice_assessments")
      .insert({
        org_id: orgId,
        content,
        chips,
        service_model: serviceModel,
        tool_count: toolCount,
        service_count: serviceCount,
        blended_margin: blendedMargin,
        target_verticals: context.wizardProfile?.targetVerticals ?? context.profile.targetVerticals,
        is_current: true,
      })
      .select("id, content, chips, generated_at, service_model, tool_count, service_count, blended_margin")
      .single();

    if (insertErr) {
      console.error("[ASSESSMENT] Insert failed:", insertErr);
      return { success: false, error: "Failed to save assessment" };
    }

    // Increment AI usage
    incrementUsage("ai_generation").catch((err) => {
      console.error("[BILLING] incrementUsage failed:", err);
    });

    return {
      success: true,
      assessment: {
        id: inserted.id,
        content: inserted.content,
        chips: (inserted.chips as string[]) ?? [],
        generatedAt: inserted.generated_at,
        serviceModel: inserted.service_model,
        toolCount: inserted.tool_count ?? 0,
        serviceCount: inserted.service_count ?? 0,
        blendedMargin: inserted.blended_margin != null ? Number(inserted.blended_margin) : null,
      },
    };
  } catch (err) {
    console.error("[ASSESSMENT] Generation failed:", err);
    return { success: false, error: "Assessment generation failed. Please try again." };
  }
}
