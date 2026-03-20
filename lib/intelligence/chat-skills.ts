export interface ChatSkill {
  id: string;
  name: string;
  triggerKeywords: string[];
  systemAddendum: string;
  firstMessage: string;
  suggestedFollowUps: string[];
}

export const CHAT_SKILLS: ChatSkill[] = [
  {
    id: "bundle_builder",
    name: "Bundle Builder",
    triggerKeywords: [
      "bundle", "package", "build a service", "a la carte", "bundling", "first service",
      "create a service", "new service", "design a service", "tier",
      "service offering", "what services", "my services",
    ],
    systemAddendum: `
ACTIVE SKILL: Bundle Builder
You are in bundle building mode. Help the MSP design and save a complete service bundle.
Step 1: Confirm they have tools in their catalog (or collect vendor names)
Step 2: Build a service preview using their ACTUAL tools
Step 3: Confirm name, price, and outcomes
Step 4: Save it via build_service_preview action
Do not skip steps. Show progress: "Step 1 of 4: Confirming your tools..."
If they have no tools, direct them to Tools & Costs first.`,
    firstMessage:
      "Let\u2019s design your first service package.\n\nDo you have tools added in Tools & Costs yet, or should I help you find them?",
    suggestedFollowUps: [
      "Yes, I have tools added",
      "Let me tell you what I use",
      "Open Tools & Costs",
    ],
  },
  {
    id: "margin_doctor",
    name: "Margin Doctor",
    triggerKeywords: [
      "margin", "profitable", "losing money", "pricing", "too low", "reprice",
      "how much should i charge", "price this", "what should i charge",
      "making money", "profit", "revenue", "cost", "undercharging",
      "reduce costs", "increase margin",
    ],
    systemAddendum: `
ACTIVE SKILL: Margin Doctor
Analyze this MSP's service margins using their actual data. Reference specific service names
and their actual margins. Produce specific repricing suggestions with numbers.
Do not give general advice \u2014 be specific to their actual portfolio.`,
    firstMessage: "Let me pull your service economics and find what\u2019s dragging your margins down.",
    suggestedFollowUps: [
      "Show me my worst services",
      "How do I reprice safely?",
      "What margin should I target?",
    ],
  },
  {
    id: "renewal_prep",
    name: "Renewal Prep",
    triggerKeywords: [
      "renewal", "renew", "contract ending", "expires",
      "up for renewal", "contract renewal", "renewing next", "contract up",
    ],
    systemAddendum: `
ACTIVE SKILL: Renewal Prep
Coordinate renewal preparation. Identify the client, then produce a brief + proposal.
Package outputs as a renewal kit. Use orchestration if multiple deliverables needed.`,
    firstMessage: "Which client are we preparing a renewal for?",
    suggestedFollowUps: [
      "Show my upcoming renewals",
      "Help me prepare a renewal kit",
      "Which clients are at risk?",
    ],
  },
  {
    id: "advisory_launcher",
    name: "Advisory Launcher",
    triggerKeywords: [
      "cto brief", "advisory", "fractional cto", "strategy brief",
      "quarterly review", "qbr", "client brief", "tech strategy",
      "technology advisory",
    ],
    systemAddendum: `
ACTIVE SKILL: Advisory Launcher
Help the MSP identify which clients would most benefit from a Technology Strategy Brief
and offer to generate one for the highest-priority client.
Use Scout's advisory gap data from context.`,
    firstMessage: "Advisory Launcher ready. Let me check which clients are overdue for a strategy brief.",
    suggestedFollowUps: [
      "Show me clients without briefs",
      "Generate a brief now",
      "What should a brief include?",
    ],
  },
];

export function detectSkill(message: string): ChatSkill | null {
  const lower = message.toLowerCase();
  return (
    CHAT_SKILLS.find((skill) =>
      skill.triggerKeywords.some((keyword) => lower.includes(keyword)),
    ) ?? null
  );
}
