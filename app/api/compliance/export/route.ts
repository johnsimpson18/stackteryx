import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { getClientById } from "@/lib/db/clients";
import { getClientComplianceScore } from "@/lib/db/compliance";
import { getFrameworkById } from "@/lib/data/compliance-frameworks";
import {
  generateCompliancePdf,
  type ComplianceExportData,
} from "@/lib/compliance/export-pdf";

export async function GET(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrgId();
  if (!orgId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getOrgMembership(orgId);
  if (!membership)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  // ── Parse params ─────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const frameworkId = searchParams.get("frameworkId");

  if (!clientId || !frameworkId) {
    return Response.json(
      { error: "clientId and frameworkId are required" },
      { status: 400 }
    );
  }

  // ── Fetch data ───────────────────────────────────────────────────────
  const [client, scoreRow, framework] = await Promise.all([
    getClientById(clientId),
    getClientComplianceScore(orgId, clientId, frameworkId),
    Promise.resolve(getFrameworkById(frameworkId)),
  ]);

  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }
  if (!scoreRow) {
    return Response.json(
      { error: "No compliance score found. Run an assessment first." },
      { status: 404 }
    );
  }
  if (!framework) {
    return Response.json({ error: "Unknown framework" }, { status: 404 });
  }

  // ── Get org name ─────────────────────────────────────────────────────
  const { data: org } = await supabase
    .from("orgs")
    .select("name")
    .eq("id", orgId)
    .single();

  // ── Build export data ────────────────────────────────────────────────
  const exportData: ComplianceExportData = {
    orgName: org?.name ?? "Your Organization",
    clientName: client.name,
    frameworkName: framework.name,
    frameworkVersion: framework.version,
    score: {
      frameworkId: scoreRow.framework_id,
      frameworkName: framework.name,
      controlsTotal: scoreRow.controls_total,
      controlsSatisfied: scoreRow.controls_satisfied,
      controlsPartial: scoreRow.controls_partial,
      controlsGap: scoreRow.controls_gap,
      controlsManual: scoreRow.controls_manual,
      scorePct: Number(scoreRow.score_pct),
      scoreUnweightedPct: Number(scoreRow.score_unweighted_pct ?? 0),
      domainScores: scoreRow.domain_scores ?? [],
      gaps: scoreRow.gap_details ?? [],
      suggestedServices: scoreRow.suggested_services ?? [],
    },
  };

  // ── Generate PDF ─────────────────────────────────────────────────────
  const pdfBuffer = await generateCompliancePdf(exportData);

  const filename = `${client.name.replace(/[^a-zA-Z0-9]/g, "_")}_${framework.shortName}_Compliance_Report.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
