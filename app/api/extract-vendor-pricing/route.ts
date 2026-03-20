import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { incrementUsage } from "@/actions/billing";

export const maxDuration = 60;

const EXTRACTION_PROMPT = `You are a pricing data extraction specialist for MSP security tool procurement. Your job is to read a vendor pricing document and extract structured pricing information.

Analyze the document and return a JSON object with EXACTLY this structure (no extra text, only valid JSON):

{
  "name": "Full product/tier name",
  "vendor": "Company/vendor name",
  "category": one of ["edr","siem","email_security","identity","backup","vulnerability_management","dns_filtering","mfa","security_awareness_training","documentation","rmm","psa","network_monitoring","other"],
  "pricing_model": one of ["per_seat","flat_monthly","tiered"],
  "per_seat_cost": number (cost per seat per month in USD, 0 if not applicable),
  "flat_monthly_cost": number (flat monthly cost in USD, 0 if not applicable),
  "tier_rules": array of {"minSeats": number, "maxSeats": number | null, "costPerSeat": number} (only if tiered pricing, else []),
  "vendor_minimum_monthly": number | null (minimum monthly spend commitment, null if none),
  "labor_cost_per_seat": null,
  "support_complexity": number between 1 and 5 (1=simple/self-managed, 5=very complex/high-touch; infer from product type),
  "renewal_uplift_pct": number between 0 and 1 (expected annual price increase, e.g. 0.05 for 5%; infer if not stated),
  "notes": "Brief description of what you found, any assumptions made, and any important caveats from the document",
  "confidence": one of ["high","medium","low"] (how confident you are in the extracted pricing)
}

Rules:
- If pricing is per-seat/per-endpoint: set pricing_model to "per_seat", set per_seat_cost to the monthly per-seat cost
- If pricing is a flat monthly fee: set pricing_model to "flat_monthly", set flat_monthly_cost to the total monthly cost
- If pricing has tiers (different prices for different seat ranges): set pricing_model to "tiered", populate tier_rules
- Always convert annual prices to monthly (divide by 12)
- All costs in USD. If currency differs, note it and convert to USD if possible
- If multiple tiers/products exist, extract the most representative or standard tier
- Set support_complexity based on: EDR/SIEM/SASE = 3-5, Email Security/DNS = 2-3, Backup/MFA = 1-2
- If renewal uplift not stated, use 0.03 (3%) as default
- Return ONLY the JSON object, no markdown, no explanation`;

export interface ExtractionResult {
  name: string;
  vendor: string;
  category: string;
  pricing_model: "per_seat" | "flat_monthly" | "tiered";
  per_seat_cost: number;
  flat_monthly_cost: number;
  tier_rules: { minSeats: number; maxSeats: number | null; costPerSeat: number }[];
  vendor_minimum_monthly: number | null;
  labor_cost_per_seat: number | null;
  support_complexity: number;
  renewal_uplift_pct: number;
  notes: string;
  confidence: "high" | "medium" | "low";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user belongs to an active org
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.active_org_id) {
    return Response.json({ error: "No active organization" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("org_id", profile.active_org_id)
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

  const fileType = file.type || "application/octet-stream";
  const fileName = file.name.toLowerCase();

  const isPdf =
    fileType === "application/pdf" || fileName.endsWith(".pdf");
  const isCsv =
    fileType.includes("csv") ||
    fileType === "text/plain" ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".txt");

  if (!isPdf && !isCsv) {
    return Response.json(
      {
        error: `Unsupported file type. Please upload a PDF or CSV file. Received: ${fileType}`,
      },
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

  const client = new Anthropic({ apiKey });

  try {
    let messageContent: Anthropic.MessageParam["content"];

    if (isPdf) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      messageContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
        } as Anthropic.DocumentBlockParam,
        {
          type: "text",
          text: EXTRACTION_PROMPT,
        },
      ];
    } else {
      const text = await file.text();
      if (text.length > 100_000) {
        return Response.json(
          { error: "File too large. Please upload a file smaller than 100KB." },
          { status: 400 }
        );
      }

      messageContent = [
        {
          type: "text",
          text: `Here is the vendor pricing document content:\n\n${text}\n\n---\n\n${EXTRACTION_PROMPT}`,
        },
      ];
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown code fences if Claude wrapped the JSON
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let extracted: ExtractionResult;
    try {
      extracted = JSON.parse(jsonText) as ExtractionResult;
    } catch {
      return Response.json(
        {
          error:
            "Could not parse pricing from document. Please check the file contains vendor pricing data.",
          raw: rawText.substring(0, 500),
        },
        { status: 422 }
      );
    }

    // Sanitize numeric fields
    extracted.per_seat_cost = Number(extracted.per_seat_cost) || 0;
    extracted.flat_monthly_cost = Number(extracted.flat_monthly_cost) || 0;
    extracted.support_complexity = Math.min(
      5,
      Math.max(1, Math.round(Number(extracted.support_complexity) || 3))
    );
    extracted.renewal_uplift_pct = Math.min(
      1,
      Math.max(0, Number(extracted.renewal_uplift_pct) || 0.03)
    );
    if (extracted.vendor_minimum_monthly !== null) {
      extracted.vendor_minimum_monthly =
        Number(extracted.vendor_minimum_monthly) || null;
    }
    if (!Array.isArray(extracted.tier_rules)) {
      extracted.tier_rules = [];
    }

    // Track usage (fire-and-forget)
    incrementUsage("ai_generation").catch((err) => {
      console.error("[BILLING] incrementUsage failed:", err);
    });

    return Response.json({ extracted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
