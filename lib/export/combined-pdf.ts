import type { BriefSections } from "@/types/fractional-cto";
import { appendBriefSectionsToPDF, BRAND, formatDate } from "./brief-pdf";

export interface CombinedPdfInput {
  briefJson: BriefSections;
  mspName: string;
  clientDomain: string;
  quarterLabel: string;
  generatedAt: string;
  proposalContent: string;
  proposalTitle: string;
}

export async function generateCombinedPdf(
  input: CombinedPdfInput,
): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
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

    // ── 1. Cover Page ───────────────────────────────────────────────────

    doc.rect(0, 0, pageW, BRAND.headerHeight).fill(BRAND.dark);
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(BRAND.white)
      .text("STACK", 72, 22, { continued: true })
      .fillColor(BRAND.lime)
      .text("TERYX");

    doc.moveDown(8);
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text(input.mspName, { align: "center", width: contentWidth });

    doc.moveDown(1.5);
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text("Strategic Technology Proposal", { align: "center", width: contentWidth });

    doc.moveDown(0.8);
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor(BRAND.muted)
      .text(input.proposalTitle, { align: "center", width: contentWidth });

    doc.moveDown(2);
    doc
      .fontSize(12)
      .fillColor(BRAND.muted)
      .text(formatDate(input.generatedAt), { align: "center", width: contentWidth });

    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#B8860B")
      .text("CONFIDENTIAL", { align: "center", width: contentWidth });

    // ── 2. Proposal Section Divider ─────────────────────────────────────

    doc.addPage();
    doc.moveDown(8);
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor(BRAND.muted)
      .text("SECTION 1", { align: "center", width: contentWidth });
    doc.moveDown(0.5);
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text(input.proposalTitle.toUpperCase(), { align: "center", width: contentWidth });

    const divY = doc.y + 16;
    const midX = 72 + contentWidth / 2;
    doc
      .moveTo(midX - 30, divY)
      .lineTo(midX + 30, divY)
      .strokeColor(BRAND.lime)
      .lineWidth(2)
      .stroke();

    // ── 3. Proposal Content ─────────────────────────────────────────────

    doc.addPage();
    const paragraphs = input.proposalContent.split("\n\n");
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Detect headings (lines starting with # or ALL CAPS short lines)
      if (trimmed.startsWith("# ")) {
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor(BRAND.body)
          .text(trimmed.replace(/^#+\s*/, ""), { width: contentWidth });
        doc.moveDown(0.4);
      } else if (trimmed.startsWith("## ")) {
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor(BRAND.body)
          .text(trimmed.replace(/^#+\s*/, ""), { width: contentWidth });
        doc.moveDown(0.4);
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        // Bullet list
        const lines = trimmed.split("\n");
        for (const line of lines) {
          const bullet = line.replace(/^[-*]\s*/, "").trim();
          if (bullet) {
            doc
              .fontSize(10)
              .font("Helvetica")
              .fillColor(BRAND.body)
              .text(`  \u2022  ${bullet}`, { lineGap: 4, width: contentWidth });
          }
        }
        doc.moveDown(0.4);
      } else {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor(BRAND.body)
          .text(trimmed, { lineGap: 6, width: contentWidth });
        doc.moveDown(0.5);
      }
    }

    // ── 4. Brief Section Divider ────────────────────────────────────────

    doc.addPage();
    doc.moveDown(8);
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor(BRAND.muted)
      .text("SECTION 2", { align: "center", width: contentWidth });
    doc.moveDown(0.5);
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text("TECHNOLOGY STRATEGY BRIEF", { align: "center", width: contentWidth });

    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(BRAND.muted)
      .text(input.quarterLabel, { align: "center", width: contentWidth });

    const div2Y = doc.y + 16;
    doc
      .moveTo(midX - 30, div2Y)
      .lineTo(midX + 30, div2Y)
      .strokeColor(BRAND.lime)
      .lineWidth(2)
      .stroke();

    // ── 5. Brief Sections 1–7 ───────────────────────────────────────────

    appendBriefSectionsToPDF(doc, input.briefJson, input.mspName);

    // ── 6. Footers (skip cover page) ────────────────────────────────────

    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 50;

      if (i === 0) continue; // Skip cover page footer

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(BRAND.muted)
        .text(
          `${input.mspName} | Confidential | Page ${i + 1} of ${totalPages}`,
          72,
          footerY,
          { width: contentWidth, align: "center" },
        );
    }

    doc.end();
  });
}
