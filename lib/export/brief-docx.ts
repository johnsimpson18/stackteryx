import type { BriefOutput } from "@/types/fractional-cto";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateBriefDocx(
  brief: BriefOutput,
  options?: { branded?: boolean },
): Promise<Buffer> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    Footer,
    PageBreak,
    BorderStyle,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType,
  } = await import("docx");

  const footerText = options?.branded
    ? brief.mspName
    : `${brief.mspName} | Prepared by Stackteryx Fractional CTO Intelligence`;

  // ── Helpers ────────────────────────────────────────────────────────────

  type ParagraphType = InstanceType<typeof Paragraph>;

  function sectionHeading(title: string): ParagraphType {
    return new Paragraph({
      spacing: { after: 120 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "E5E5E5",
          space: 8,
        },
      },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 36,
          font: "Calibri",
          color: "1A1A1A",
        }),
      ],
    });
  }

  function bodyParagraph(text: string): ParagraphType {
    return new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text,
          size: 22,
          font: "Calibri",
          color: "333333",
        }),
      ],
    });
  }

  function bulletItem(text: string): ParagraphType {
    return new Paragraph({
      bullet: { level: 0 },
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text,
          size: 22,
          font: "Calibri",
          color: "333333",
        }),
      ],
    });
  }

  function spacer(before = 200): ParagraphType {
    return new Paragraph({ spacing: { before } });
  }

  function pageBreakPara(): ParagraphType {
    return new Paragraph({ children: [new PageBreak()] });
  }

  function proseToDocx(text: string): ParagraphType[] {
    return text
      .split("\n\n")
      .filter((p) => p.trim().length > 0)
      .map((p) => bodyParagraph(p.trim()));
  }

  // ── Cover page ─────────────────────────────────────────────────────────

  const coverParagraphs: ParagraphType[] = [
    new Paragraph({ spacing: { before: 4000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Technology Strategy Brief",
          bold: true,
          size: 56,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: `Prepared for: ${brief.clientDomain}`,
          size: 32,
          font: "Calibri",
          color: "333333",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `Prepared by: ${brief.mspName}`,
          size: 32,
          font: "Calibri",
          color: "333333",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800 },
      children: [
        new TextRun({
          text: formatDate(brief.generatedAt),
          size: 24,
          font: "Calibri",
          color: "999999",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: "CONFIDENTIAL",
          bold: true,
          size: 20,
          font: "Calibri",
          color: "B8860B",
        }),
      ],
    }),
  ];

  // ── Section paragraphs ─────────────────────────────────────────────────

  const content: ParagraphType[] = [];

  // Section 1: Executive Perspective
  content.push(pageBreakPara(), sectionHeading("Executive Technology Perspective"), spacer());
  content.push(...proseToDocx(brief.sections.executivePerspective));

  // Section 2: Business Landscape
  content.push(pageBreakPara(), sectionHeading("Business Technology Landscape"), spacer());
  content.push(...proseToDocx(brief.sections.businessLandscape));

  // Section 3: Technology Risks (as table)
  content.push(pageBreakPara(), sectionHeading("Strategic Technology Risks"), spacer());

  const riskHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "F5F5F5" },
        children: [new Paragraph({ children: [new TextRun({ text: "Risk", bold: true, size: 20, font: "Calibri" })] })],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "F5F5F5" },
        children: [new Paragraph({ children: [new TextRun({ text: "Severity", bold: true, size: 20, font: "Calibri" })] })],
      }),
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "F5F5F5" },
        children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, size: 20, font: "Calibri" })] })],
      }),
    ],
  });

  const riskRows = brief.sections.technologyRisks.map(
    (risk) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: risk.title, size: 20, font: "Calibri" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: risk.severity, bold: true, size: 20, font: "Calibri" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: risk.description, size: 20, font: "Calibri", color: "333333" })] })],
          }),
        ],
      }),
  );

  content.push(
    new Paragraph({
      children: [],
      spacing: { before: 100 },
    }),
  );

  const riskTable = new Table({
    rows: [riskHeaderRow, ...riskRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
  content.push(riskTable as unknown as ParagraphType);

  // Section 4: Technology Radar (as table)
  content.push(pageBreakPara(), sectionHeading("Technology Radar"), spacer());

  const radarHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "F5F5F5" },
        children: [new Paragraph({ children: [new TextRun({ text: "Technology", bold: true, size: 20, font: "Calibri" })] })],
      }),
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "F5F5F5" },
        children: [new Paragraph({ children: [new TextRun({ text: "Relevance", bold: true, size: 20, font: "Calibri" })] })],
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "F5F5F5" },
        children: [new Paragraph({ children: [new TextRun({ text: "Implication", bold: true, size: 20, font: "Calibri" })] })],
      }),
    ],
  });

  const radarRows = brief.sections.technologyRadar.map(
    (item) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.technology, bold: true, size: 20, font: "Calibri" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.relevance, size: 20, font: "Calibri", color: "333333" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.implication, size: 20, font: "Calibri", color: "333333" })] })],
          }),
        ],
      }),
  );

  const radarTable = new Table({
    rows: [radarHeaderRow, ...radarRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
  content.push(radarTable as unknown as ParagraphType);

  // Section 5: Strategic Priorities
  content.push(pageBreakPara(), sectionHeading("Strategic Technology Priorities"), spacer());
  brief.sections.strategicPriorities.forEach((priority, i) => {
    content.push(
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: `${String(i + 1).padStart(2, "0")}. `,
            bold: true,
            size: 22,
            font: "Calibri",
            color: "1A1A1A",
          }),
          new TextRun({
            text: priority,
            size: 22,
            font: "Calibri",
            color: "333333",
          }),
        ],
      }),
    );
  });

  // Section 6: Planning Outlook (as 3-column table)
  content.push(pageBreakPara(), sectionHeading("Technology Planning Outlook"), spacer());

  const maxRows = Math.max(
    brief.sections.planningOutlook.shortTerm.length,
    brief.sections.planningOutlook.midTerm.length,
    brief.sections.planningOutlook.longTerm.length,
  );

  const outlookHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 33, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "F5F5F5" },
        children: [new Paragraph({ children: [new TextRun({ text: "Short Term (0\u20136 mo)", bold: true, size: 20, font: "Calibri" })] })],
      }),
      new TableCell({
        width: { size: 34, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "F5F5F5" },
        children: [new Paragraph({ children: [new TextRun({ text: "Mid Term (6\u201312 mo)", bold: true, size: 20, font: "Calibri" })] })],
      }),
      new TableCell({
        width: { size: 33, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "F5F5F5" },
        children: [new Paragraph({ children: [new TextRun({ text: "Long Term (12\u201324 mo)", bold: true, size: 20, font: "Calibri" })] })],
      }),
    ],
  });

  const outlookRows: InstanceType<typeof TableRow>[] = [];
  for (let i = 0; i < maxRows; i++) {
    outlookRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: brief.sections.planningOutlook.shortTerm[i] ?? "",
                    size: 20,
                    font: "Calibri",
                    color: "333333",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: brief.sections.planningOutlook.midTerm[i] ?? "",
                    size: 20,
                    font: "Calibri",
                    color: "333333",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: brief.sections.planningOutlook.longTerm[i] ?? "",
                    size: 20,
                    font: "Calibri",
                    color: "333333",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  }

  const outlookTable = new Table({
    rows: [outlookHeaderRow, ...outlookRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
  content.push(outlookTable as unknown as ParagraphType);

  // Section 7: Advisory Services
  content.push(pageBreakPara(), sectionHeading("Fractional CTO Advisory Services"), spacer());
  content.push(
    bodyParagraph(
      "This Technology Strategy Brief is the first step in a structured advisory engagement. As your Fractional CTO partner, we deliver ongoing quarterly technology advisory that keeps your technology strategy aligned with business objectives.",
    ),
    bodyParagraph(
      "Our advisory program includes quarterly business reviews (QBRs) with executive-level technology assessments, technology roadmap planning and prioritization, risk monitoring and mitigation guidance, and strategic alignment between technology investments and business outcomes.",
    ),
    bodyParagraph(
      `Contact ${brief.mspName} to discuss how Fractional CTO advisory can strengthen your technology posture and support your growth objectives.`,
    ),
  );

  // ── Build document ─────────────────────────────────────────────────────

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: footerText,
                    size: 16,
                    font: "Calibri",
                    color: "999999",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [...coverParagraphs, ...content],
      },
    ],
  });

  return (await Packer.toBuffer(doc)) as Buffer;
}
