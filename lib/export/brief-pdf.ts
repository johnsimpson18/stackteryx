import type { BriefOutput, BriefSections } from "@/types/fractional-cto";

// PDFKit doc instance type — avoids static import of pdfkit (Node.js-only fs module)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDoc = any;

export const BRAND = {
  dark: "#0A0A0A",
  lime: "#A3FF12",
  white: "#FFFFFF",
  muted: "#999999",
  body: "#333333",
  headerHeight: 60,
} as const;

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function severityLabel(severity: string): string {
  return severity.toUpperCase();
}

// ── Shared helper: append all 7 brief sections to an existing PDFKit doc ────

export function appendBriefSectionsToPDF(
  doc: PDFDoc,
  sections: BriefSections,
  mspName: string,
): void {
  const pageW = doc.page.width;
  const contentWidth = pageW - 144;

  function addSectionHeading(title: string) {
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text(title.toUpperCase(), { width: contentWidth });

    doc.moveDown(0.3);
    const uy = doc.y;
    doc
      .moveTo(72, uy)
      .lineTo(112, uy)
      .strokeColor(BRAND.lime)
      .lineWidth(2)
      .stroke();
    doc.moveDown(0.8);
  }

  function addBodyText(text: string) {
    const paragraphs = text.split("\n\n");
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length > 0) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor(BRAND.body)
          .text(trimmed, { lineGap: 6, width: contentWidth });
        doc.moveDown(0.5);
      }
    }
  }

  // Section 1: Executive Perspective
  doc.addPage();
  addSectionHeading("Executive Technology Perspective");
  addBodyText(sections.executivePerspective);

  // Section 2: Business Landscape
  doc.addPage();
  addSectionHeading("Business Technology Landscape");
  addBodyText(sections.businessLandscape);

  // Section 3: Technology Risks
  doc.addPage();
  addSectionHeading("Strategic Technology Risks");

  for (const risk of sections.technologyRisks) {
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text(`${risk.title}  [${severityLabel(risk.severity)}]`, { width: contentWidth });
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(BRAND.body)
      .text(risk.description, { lineGap: 4, width: contentWidth });
    doc.moveDown(0.6);
  }

  // Section 4: Technology Radar
  doc.addPage();
  addSectionHeading("Technology Radar");

  for (const item of sections.technologyRadar) {
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text(item.technology, { width: contentWidth, continued: true })
      .font("Helvetica")
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(`  \u2014 ${item.relevance}`);
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(BRAND.body)
      .text(item.implication, { lineGap: 4, width: contentWidth });
    doc.moveDown(0.6);
  }

  // Section 5: Strategic Priorities
  doc.addPage();
  addSectionHeading("Strategic Technology Priorities");

  sections.strategicPriorities.forEach((priority, i) => {
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(BRAND.body)
      .text(`${String(i + 1).padStart(2, "0")}.  ${priority}`, {
        lineGap: 6,
        width: contentWidth,
      });
    doc.moveDown(0.3);
  });

  // Section 6: Planning Outlook
  doc.addPage();
  addSectionHeading("Technology Planning Outlook");

  const horizons: { label: string; timeframe: string; items: string[] }[] = [
    { label: "Short Term", timeframe: "0\u20136 months", items: sections.planningOutlook.shortTerm },
    { label: "Mid Term", timeframe: "6\u201312 months", items: sections.planningOutlook.midTerm },
    { label: "Long Term", timeframe: "12\u201324 months", items: sections.planningOutlook.longTerm },
  ];

  for (const horizon of horizons) {
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text(`${horizon.label} (${horizon.timeframe})`, { width: contentWidth });
    doc.moveDown(0.3);
    for (const item of horizon.items) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(BRAND.body)
        .text(`  \u2022  ${item}`, { lineGap: 4, width: contentWidth });
    }
    doc.moveDown(0.8);
  }

  // Section 7: Advisory Services
  doc.addPage();
  addSectionHeading("Fractional CTO Advisory Services");
  addBodyText(
    "This Technology Strategy Brief is the first step in a structured advisory engagement. As your Fractional CTO partner, we deliver ongoing quarterly technology advisory that keeps your technology strategy aligned with business objectives.\n\n" +
    "Our advisory program includes quarterly business reviews (QBRs) with executive-level technology assessments, technology roadmap planning and prioritization, risk monitoring and mitigation guidance, and strategic alignment between technology investments and business outcomes.\n\n" +
    `Contact ${mspName} to discuss how Fractional CTO advisory can strengthen your technology posture and support your growth objectives.`,
  );
}

// ── Generate standalone brief PDF ───────────────────────────────────────────

export async function generateBriefPdf(
  brief: BriefOutput,
  options?: { branded?: boolean; whiteLabel?: boolean },
): Promise<Buffer> {
  const PDFDoc = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDoc({
      size: "letter",
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const contentWidth = pageW - 144;

    // ── Cover Page ───────────────────────────────────────────────────────

    doc.rect(0, 0, pageW, BRAND.headerHeight).fill(BRAND.dark);
    if (!options?.whiteLabel) {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor(BRAND.white)
        .text("STACK", 72, 22, { continued: true })
        .fillColor(BRAND.lime)
        .text("TERYX");
    } else {
      // White-label: show MSP name instead
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor(BRAND.white)
        .text(brief.mspName, 72, 22);
    }

    doc.moveDown(10);
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text("Technology Strategy Brief", { align: "center", width: contentWidth });

    doc.moveDown(0.8);
    doc
      .fontSize(16)
      .font("Helvetica")
      .fillColor(BRAND.body)
      .text(`Prepared for: ${brief.clientDomain}`, { align: "center", width: contentWidth });

    doc.moveDown(0.3);
    doc.text(`Prepared by: ${brief.mspName}`, { align: "center", width: contentWidth });

    doc.moveDown(1.5);
    doc
      .fontSize(12)
      .fillColor(BRAND.muted)
      .text(formatDate(brief.generatedAt), { align: "center", width: contentWidth });

    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#B8860B")
      .text("CONFIDENTIAL", { align: "center", width: contentWidth });

    // ── Brief sections 1–7 ───────────────────────────────────────────────

    appendBriefSectionsToPDF(doc, brief.sections, brief.mspName);

    // ── Footers ─────────────────────────────────────────────────────────

    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 50;

      // Left: MSP name
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(BRAND.muted)
        .text(
          `${brief.mspName} \u2014 Technology Strategy Brief`,
          72,
          footerY,
          { width: contentWidth / 2, align: "left" },
        );

      // Right: attribution + page number
      // Enterprise (whiteLabel): no Stackteryx reference
      // Pro (branded): subtle "Powered by Stackteryx" footer
      // Free: full Stackteryx attribution
      const pageStr = `Page ${i + 1} of ${totalPages}`;
      const attribution = options?.whiteLabel
        ? pageStr
        : options?.branded
          ? `Powered by Stackteryx | ${pageStr}`
          : `Generated by Stackteryx Fractional CTO Intelligence \u00B7 stackteryx.com | ${pageStr}`;
      doc
        .fontSize(7)
        .text(
          attribution,
          72 + contentWidth / 2,
          footerY,
          { width: contentWidth / 2, align: "right" },
        );
    }

    doc.end();
  });
}
