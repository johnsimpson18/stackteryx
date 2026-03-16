import { BRAND, formatDate } from "@/lib/export/brief-pdf";
import type { TechnologyRisk } from "@/types/fractional-cto";

// PDFKit doc instance type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDoc = any;

// ── Severity helpers ────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

function severityPdfColor(severity: string): string {
  switch (severity) {
    case "High":
      return "#C0392B";
    case "Medium":
      return "#D4A017";
    case "Low":
      return "#2980B9";
    default:
      return BRAND.muted;
  }
}

// ── Generate Risk Summary PDF ───────────────────────────────────────────────

export async function generateRiskSummaryPdf(
  risks: TechnologyRisk[],
  options: {
    mspName: string;
    clientDomain: string;
    quarterLabel: string;
    branded?: boolean;
    whiteLabel?: boolean;
  },
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

    // ── Cover Page ────────────────────────────────────────────────────

    doc.rect(0, 0, pageW, BRAND.headerHeight).fill(BRAND.dark);
    if (!options.whiteLabel) {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor(BRAND.white)
        .text("STACK", 72, 22, { continued: true })
        .fillColor(BRAND.lime)
        .text("TERYX");
    } else {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor(BRAND.white)
        .text(options.mspName, 72, 22);
    }

    doc.moveDown(10);
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text("Technology Risk Summary", { align: "center", width: contentWidth });

    doc.moveDown(0.8);
    doc
      .fontSize(16)
      .font("Helvetica")
      .fillColor(BRAND.body)
      .text(`Prepared for: ${options.clientDomain}`, {
        align: "center",
        width: contentWidth,
      });

    doc.moveDown(0.3);
    doc.text(`Prepared by: ${options.mspName}`, {
      align: "center",
      width: contentWidth,
    });

    doc.moveDown(0.3);
    doc.text(options.quarterLabel, {
      align: "center",
      width: contentWidth,
    });

    doc.moveDown(1.5);
    doc
      .fontSize(12)
      .fillColor(BRAND.muted)
      .text(formatDate(new Date().toISOString()), {
        align: "center",
        width: contentWidth,
      });

    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#B8860B")
      .text("CONFIDENTIAL", { align: "center", width: contentWidth });

    // ── Risk List ───────────────────────────────────────────────────

    const sorted = [...risks].sort(
      (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3),
    );

    doc.addPage();

    // Section heading
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text("IDENTIFIED TECHNOLOGY RISKS", { width: contentWidth });
    doc.moveDown(0.3);
    const uy = doc.y;
    doc
      .moveTo(72, uy)
      .lineTo(112, uy)
      .strokeColor(BRAND.lime)
      .lineWidth(2)
      .stroke();
    doc.moveDown(0.8);

    for (const risk of sorted) {
      // Check if we need a new page (leave room for at least one risk block)
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }

      // Severity + Title
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(severityPdfColor(risk.severity))
        .text(`[${risk.severity.toUpperCase()}]`, { continued: true, width: contentWidth })
        .fillColor(BRAND.body)
        .text(`  ${risk.title}`);

      doc.moveDown(0.2);

      // Description
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(BRAND.body)
        .text(risk.description, { lineGap: 4, width: contentWidth });

      doc.moveDown(0.6);
    }

    // ── Footers ──────────────────────────────────────────────────────

    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 50;

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(BRAND.muted)
        .text(
          `${options.mspName} \u2014 Technology Risk Summary`,
          72,
          footerY,
          { width: contentWidth / 2, align: "left" },
        );

      const pageStr = `Page ${i + 1} of ${totalPages}`;
      const attribution = options.whiteLabel
        ? pageStr
        : options.branded
          ? `Powered by Stackteryx | ${pageStr}`
          : `Generated by Stackteryx \u00B7 stackteryx.com | ${pageStr}`;
      doc
        .fontSize(7)
        .text(attribution, 72 + contentWidth / 2, footerY, {
          width: contentWidth / 2,
          align: "right",
        });
    }

    doc.end();
  });
}
