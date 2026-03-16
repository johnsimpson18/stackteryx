// ── Fractional CTO Service Template ─────────────────────────────────────────
// Pre-built service definition that MSPs can add to their catalog in one click.

export const FRACTIONAL_CTO_TEMPLATE = {
  name: "Fractional CTO Advisory",
  category: "Advisory Services",
  description:
    "Executive-level technology advisory delivered as a managed service. Includes quarterly technology strategy briefs, risk monitoring, and roadmap guidance — positioning your practice as a strategic partner, not just a support vendor.",

  outcomes: [
    {
      title: "Technology strategy aligned to business goals",
      description:
        "Client leadership has a clear, documented technology direction that supports their business objectives and growth plans.",
    },
    {
      title: "Proactive risk visibility",
      description:
        "Technology risks are identified and communicated before they become operational problems.",
    },
    {
      title: "Executive-ready reporting",
      description:
        "Client receives board-level technology reporting without the cost of a full-time CTO.",
    },
    {
      title: "Confident technology decision-making",
      description:
        "Client makes informed technology investments guided by structured advisory, not vendor sales pitches.",
    },
  ],

  deliverables: [
    {
      name: "Quarterly Technology Strategy Brief",
      description:
        "AI-generated executive advisory report covering industry landscape, technology risks, emerging technology radar, and strategic priorities.",
      cadence: "Quarterly",
    },
    {
      name: "Technology Risk Summary",
      description:
        "Structured summary of active technology risks with severity ratings and recommended actions.",
      cadence: "Monthly",
    },
    {
      name: "Advisory Session",
      description:
        "Structured advisory meeting to review brief findings, update priorities, and address client technology questions.",
      cadence: "Quarterly",
    },
    {
      name: "QBR Support",
      description:
        "Brief-backed quarterly business review materials ready for client presentation.",
      cadence: "Quarterly",
    },
  ],

  pricingTiers: [
    {
      name: "Advisory Essentials",
      monthlyPrice: 500,
      description:
        "Quarterly brief + annual roadmap review. Ideal as an add-on to existing managed services.",
    },
    {
      name: "Advisory Standard",
      monthlyPrice: 1000,
      description:
        "Quarterly briefs, monthly risk summaries, advisory session, and QBR support.",
    },
    {
      name: "Advisory Premium",
      monthlyPrice: 2000,
      description:
        "Full advisory program with monthly reporting, unlimited advisory hours, and board-ready deliverables.",
    },
  ],

  suggestedMonthlyPrice: 1000,
  estimatedDeliveryHours: 3,
} as const;
