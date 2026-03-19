export interface TourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  ctaLabel: string;
  position: "top" | "bottom" | "left" | "right";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    target: '[data-tour="dashboard"]',
    title: "Your portfolio intelligence briefing",
    body: "Every morning, your six AI agents brief you here \u2014 margin health, client risks, renewal alerts, and market intelligence. This is your command center.",
    ctaLabel: "Next \u2192",
    position: "right",
  },
  {
    id: "tools-costs",
    target: '[data-tour="tools-costs"]',
    title: "Start here \u2014 add your vendor tools",
    body: "Add the security tools you resell. Stackteryx tracks what you pay each vendor so it can calculate your real delivery costs and margins automatically.",
    ctaLabel: "Next \u2192",
    position: "right",
  },
  {
    id: "stack-builder",
    target: '[data-tour="stack-builder"]',
    title: "Design services visually",
    body: "Drag your tools into the Stack Builder and watch Aria calculate your compliance coverage, margin, and outcome statements in real time. Build a complete service in minutes.",
    ctaLabel: "Next \u2192",
    position: "right",
  },
  {
    id: "services",
    target: '[data-tour="services"]',
    title: "Your service catalog",
    body: "Every service you design lives here \u2014 with pricing, margins, outcomes, and sales materials attached. Build once, deploy to any client.",
    ctaLabel: "Next \u2192",
    position: "right",
  },
  {
    id: "sales-studio",
    target: '[data-tour="sales-studio"]',
    title: "Generate proposals in minutes",
    body: "Pitch writes client proposals, prospect pitches, and sales playbooks from your service stack \u2014 in outcome language your clients understand.",
    ctaLabel: "Next \u2192",
    position: "right",
  },
  {
    id: "fractional-cto",
    target: '[data-tour="fractional-cto"]',
    title: "Deliver executive advisory",
    body: "Sage generates Technology Strategy Briefs for your clients \u2014 branded, exportable, client-ready in under 60 seconds. MSPs charge $500\u2013$1,000/month for this service.",
    ctaLabel: "Let's get started \u2192",
    position: "right",
  },
];
