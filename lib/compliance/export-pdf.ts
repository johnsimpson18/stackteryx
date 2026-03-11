import type { ComplianceScore, DomainScore, ComplianceGap } from "./scoring";

export interface ComplianceExportData {
  orgName: string;
  clientName: string;
  frameworkName: string;
  frameworkVersion: string;
  score: ComplianceScore;
  aiSummary?: string;
}

// ── Brand constants ─────────────────────────────────────────────────────────

const BRAND = {
  dark: "#0A0A0A",
  lime: "#A3FF12",
  white: "#FFFFFF",
  muted: "#999999",
  body: "#333333",
  red: "#F87171",
  yellow: "#FBBF24",
  green: "#A3FF12",
  headerHeight: 60,
} as const;

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function scoreColor(pct: number): string {
  if (pct >= 80) return BRAND.green;
  if (pct >= 50) return BRAND.yellow;
  return BRAND.red;
}

// ── PDF Generation ──────────────────────────────────────────────────────────

export async function generateCompliancePdf(
  data: ComplianceExportData
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

    // ── Page 1: Executive Summary ──────────────────────────────────────

    // Dark header band
    doc.rect(0, 0, pageW, BRAND.headerHeight).fill(BRAND.dark);
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(BRAND.white)
      .text("STACK", 72, 22, { continued: true })
      .fillColor(BRAND.lime)
      .text("TERYX");

    doc.moveDown(6);
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text("Compliance Assessment Report", { align: "center", width: contentWidth });

    doc.moveDown(0.3);
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor(BRAND.body)
      .text(`${data.clientName} — ${data.frameworkName}`, {
        align: "center",
        width: contentWidth,
      });

    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor(BRAND.muted)
      .text(formatDate(), { align: "center", width: contentWidth });

    doc.moveDown(3);

    // Score display
    const scorePct = data.score.scorePct;
    doc
      .fontSize(48)
      .font("Helvetica-Bold")
      .fillColor(scoreColor(scorePct))
      .text(`${scorePct}%`, { align: "center", width: contentWidth });

    doc.moveDown(0.2);
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor(BRAND.body)
      .text("Weighted Compliance Score", { align: "center", width: contentWidth });

    doc.moveDown(2);

    // Control summary
    const stats = [
      `${data.score.controlsSatisfied} Satisfied`,
      `${data.score.controlsPartial} Partial`,
      `${data.score.controlsGap} Gaps`,
      `${data.score.controlsManual} Manual`,
    ];
    doc
      .fontSize(10)
      .fillColor(BRAND.body)
      .text(stats.join("   |   "), { align: "center", width: contentWidth });

    // AI Summary (if provided)
    if (data.aiSummary) {
      doc.moveDown(2);
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(BRAND.body)
        .text("EXECUTIVE SUMMARY", { width: contentWidth });

      doc.moveDown(0.3);
      const uy = doc.y;
      doc
        .moveTo(72, uy)
        .lineTo(112, uy)
        .strokeColor(BRAND.lime)
        .lineWidth(2)
        .stroke();

      doc.moveDown(0.8);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(BRAND.body)
        .text(data.aiSummary, { lineGap: 6, width: contentWidth });
    }

    // ── Page 2: Domain Breakdown ────────────────────────────────────────

    doc.addPage();

    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(BRAND.body)
      .text("DOMAIN BREAKDOWN", { width: contentWidth });

    doc.moveDown(0.3);
    const uy2 = doc.y;
    doc
      .moveTo(72, uy2)
      .lineTo(112, uy2)
      .strokeColor(BRAND.lime)
      .lineWidth(2)
      .stroke();

    doc.moveDown(1);

    for (const ds of data.score.domainScores) {
      const barY = doc.y;

      // Domain name and score
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(BRAND.body)
        .text(ds.domain, 72, barY, { width: contentWidth * 0.6 });

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(scoreColor(ds.scorePct))
        .text(`${ds.scorePct}%`, 72 + contentWidth * 0.85, barY, {
          width: contentWidth * 0.15,
          align: "right",
        });

      doc.moveDown(0.3);

      // Bar background
      const barStartY = doc.y;
      doc
        .rect(72, barStartY, contentWidth, 8)
        .fillColor("#E5E5E5")
        .fill();

      // Bar fill
      const fillWidth = (ds.scorePct / 100) * contentWidth;
      if (fillWidth > 0) {
        doc
          .rect(72, barStartY, fillWidth, 8)
          .fillColor(scoreColor(ds.scorePct))
          .fill();
      }

      doc.y = barStartY + 16;

      // Stats
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(BRAND.muted)
        .text(
          `${ds.controlsSatisfied} satisfied  ·  ${ds.controlsPartial} partial  ·  ${ds.controlsGap} gaps`,
          72,
          doc.y,
          { width: contentWidth }
        );

      doc.moveDown(1);

      // Check if we need a new page
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }
    }

    // ── Page 3: Remediation Roadmap ─────────────────────────────────────

    const gapsAndPartials = data.score.gaps.filter(
      (g: ComplianceGap) => g.status === "gap" || g.status === "partial"
    );

    if (gapsAndPartials.length > 0 || data.score.suggestedServices.length > 0) {
      doc.addPage();

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor(BRAND.body)
        .text("REMEDIATION ROADMAP", { width: contentWidth });

      doc.moveDown(0.3);
      const uy3 = doc.y;
      doc
        .moveTo(72, uy3)
        .lineTo(112, uy3)
        .strokeColor(BRAND.lime)
        .lineWidth(2)
        .stroke();

      doc.moveDown(1);

      // Gap list
      if (gapsAndPartials.length > 0) {
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor(BRAND.body)
          .text("Identified Gaps", { width: contentWidth });

        doc.moveDown(0.5);

        for (const g of gapsAndPartials) {
          const statusLabel =
            g.status === "gap" ? "[GAP]" : "[PARTIAL]";
          const statusClr = g.status === "gap" ? BRAND.red : BRAND.yellow;

          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor(statusClr)
            .text(statusLabel, 72, doc.y, {
              continued: true,
              width: contentWidth,
            })
            .font("Helvetica")
            .fillColor(BRAND.body)
            .text(` ${g.control.id} — ${g.control.name}`);

          if (g.missingDomains.length > 0) {
            doc
              .fontSize(8)
              .fillColor(BRAND.muted)
              .text(
                `   Missing: ${g.missingDomains.join(", ")}`,
                { width: contentWidth }
              );
          }

          doc.moveDown(0.3);

          if (doc.y > doc.page.height - 100) {
            doc.addPage();
          }
        }
      }

      // Suggested services
      if (data.score.suggestedServices.length > 0) {
        doc.moveDown(1);
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor(BRAND.body)
          .text("Recommended Services", { width: contentWidth });

        doc.moveDown(0.5);

        for (const svc of data.score.suggestedServices) {
          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor(BRAND.body)
            .text(`• ${svc.bundleName}`, { width: contentWidth });

          if (svc.outcomeStatement) {
            doc
              .fontSize(8)
              .font("Helvetica")
              .fillColor(BRAND.muted)
              .text(`  ${svc.outcomeStatement}`, { width: contentWidth });
          }

          doc
            .fontSize(8)
            .fillColor(BRAND.muted)
            .text(
              `  Closes ${svc.gapCount} gap${svc.gapCount !== 1 ? "s" : ""} · Covers: ${svc.missingDomainsCovered.join(", ")}`,
              { width: contentWidth }
            );

          doc.moveDown(0.4);

          if (doc.y > doc.page.height - 100) {
            doc.addPage();
          }
        }
      }
    }

    // ── Disclaimer on last page ─────────────────────────────────────────
    doc.moveDown(2);
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(BRAND.muted)
      .text(
        "This assessment estimates control coverage based on delivered services and mapped security tooling. Administrative, procedural, and physical safeguards require manual validation and are excluded from the automated score. This report does not constitute a formal compliance audit. Engage a certified assessor for official certification.",
        72,
        doc.y,
        { width: contentWidth, lineGap: 4 }
      );

    // ── Footer on every page ────────────────────────────────────────────
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
          `Confidential — Prepared for ${data.clientName}`,
          72,
          footerY,
          { width: contentWidth / 3, align: "left" }
        );
      doc
        .fontSize(7)
        .text("Stackteryx", 72 + contentWidth / 3, footerY, {
          width: contentWidth / 3,
          align: "center",
        });
      doc
        .fontSize(7)
        .text(
          `${i + 1} / ${totalPages}`,
          72 + (contentWidth / 3) * 2,
          footerY,
          { width: contentWidth / 3, align: "right" }
        );
    }

    doc.end();
  });
}
