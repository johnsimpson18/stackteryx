import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { incrementUsage } from "@/actions/billing";
import type { ExtractedVendor } from "@/lib/types";

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const EXTRACTION_PROMPT = `You are a pricing data extraction specialist for MSP (Managed Service Provider) security tool procurement. You are given the text content of a vendor pricing spreadsheet.

Your job is to identify every distinct vendor/product and extract structured pricing data for each one.

Return a JSON array where each element has this exact shape:

{
  "vendor_name": "Display name for this vendor/product",
  "category": one of ["edr","siem","email_security","identity","backup","vulnerability_management","dns_filtering","mfa","security_awareness_training","documentation","rmm","psa","network_monitoring","other"] or null if unclear,
  "cost_models": [
    {
      "name": "Name/description for this pricing tier or plan",
      "billing_basis": one of ["per_user","per_device","per_domain","per_location","per_org","flat_monthly","usage","tiered"],
      "cadence": one of ["monthly","annual"],
      "tiers": [
        { "min_value": 0, "max_value": 50, "unit_price": 3.50 },
        { "min_value": 51, "max_value": null, "unit_price": 3.00 }
      ]
    }
  ]
}

Rules:
- Each row or section that represents a different vendor/product should be a separate entry
- If a vendor has multiple pricing tiers (e.g. different price at different seat counts), model them as tiers within a single cost_model
- If a vendor has multiple products/plans, create separate cost_models for each
- Convert annual prices to monthly (divide by 12) so unit_price is always monthly
- All prices in USD
- For flat-rate pricing with no seat/device basis, use billing_basis "flat_monthly" with a single tier: min_value=0, max_value=null, unit_price=the monthly cost
- For simple per-seat pricing with one price point, use a single tier: min_value=0, max_value=null, unit_price=the per-seat monthly cost
- Return ONLY the JSON array, no markdown fences, no explanation`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve org_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_org_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.active_org_id;
  if (!orgId) {
    return Response.json({ error: "No active organization" }, { status: 400 });
  }

  // Verify user is a member of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  const fileName = file.name.toLowerCase();
  const isExcel =
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls") ||
    file.type.includes("spreadsheet") ||
    file.type.includes("excel");
  const isCsv =
    fileName.endsWith(".csv") ||
    file.type.includes("csv") ||
    file.type === "text/plain";

  if (!isExcel && !isCsv) {
    return Response.json(
      { error: "Unsupported file type. Please upload an Excel (.xlsx, .xls) or CSV file." },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  // Create import record with pending status
  const { data: importRecord, error: insertError } = await supabase
    .from("vendor_imports")
    .insert({
      org_id: orgId,
      filename: file.name,
      status: "processing",
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: "Failed to create import record" }, { status: 500 });
  }

  try {
    // Parse file to text
    let textContent: string;

    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheets: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
          sheets.push(`--- Sheet: ${sheetName} ---\n${csv}`);
        }
      }
      textContent = sheets.join("\n\n");
    } else {
      textContent = await file.text();
    }

    if (textContent.length > 200_000) {
      textContent = textContent.substring(0, 200_000);
    }

    // Send to Claude for extraction
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Here is the pricing spreadsheet content:\n\n${textContent}\n\n---\n\n${EXTRACTION_PROMPT}`,
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown code fences if present
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let extracted: ExtractedVendor[];
    try {
      const parsed = JSON.parse(jsonText);
      extracted = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Update import as failed
      await supabase
        .from("vendor_imports")
        .update({ status: "failed", error_message: "Could not parse AI response" })
        .eq("id", importRecord.id);

      return Response.json(
        {
          error: "Could not parse pricing from spreadsheet. Please check the file contains vendor pricing data.",
          importId: importRecord.id,
        },
        { status: 422 }
      );
    }

    // Sanitize extracted data
    extracted = extracted.map((v) => ({
      vendor_name: String(v.vendor_name || "Unknown Vendor"),
      category: v.category || null,
      cost_models: (v.cost_models || []).map((cm) => ({
        name: String(cm.name || "Default"),
        billing_basis: cm.billing_basis || "per_user",
        cadence: cm.cadence || "monthly",
        tiers: (cm.tiers || []).map((t) => ({
          min_value: Number(t.min_value) || 0,
          max_value: t.max_value !== null && t.max_value !== undefined ? Number(t.max_value) : null,
          unit_price: Number(t.unit_price) || 0,
        })),
      })),
    }));

    // Update import record with extraction
    await supabase
      .from("vendor_imports")
      .update({
        status: "pending",
        raw_extraction: extracted,
      })
      .eq("id", importRecord.id);

    // Track usage (fire-and-forget)
    incrementUsage("ai_generation").catch(() => {});

    return Response.json({
      importId: importRecord.id,
      extracted,
      vendorCount: extracted.length,
      costModelCount: extracted.reduce((sum, v) => sum + v.cost_models.length, 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";

    await supabase
      .from("vendor_imports")
      .update({ status: "failed", error_message: message })
      .eq("id", importRecord.id);

    return Response.json({ error: message, importId: importRecord.id }, { status: 500 });
  }
}
