export interface Agent {
  id: string;
  name: string;
  title: string;
  description: string;
  color: string;
  icon: string;
}

export const AGENTS: Record<string, Agent> = {
  aria: {
    id: "aria",
    name: "Aria",
    title: "Service Architect",
    description:
      "Designs service stacks, maps tools to outcomes, and scores compliance coverage in real time.",
    color: "#c8f135",
    icon: "Layers2",
  },
  margin: {
    id: "margin",
    name: "Margin",
    title: "Pricing Analyst",
    description:
      "Models service economics, calculates real delivery costs, and flags pricing health issues.",
    color: "#378ADD",
    icon: "TrendingUp",
  },
  scout: {
    id: "scout",
    name: "Scout",
    title: "Portfolio Analyst",
    description:
      "Monitors your portfolio for opportunities, risks, and revenue signals across all clients.",
    color: "#5DCAA5",
    icon: "BarChart2",
  },
  sage: {
    id: "sage",
    name: "Sage",
    title: "Advisory Agent",
    description:
      "Generates executive technology strategy briefs, risk summaries, and QBR content for clients.",
    color: "#AFA9EC",
    icon: "Brain",
  },
  pitch: {
    id: "pitch",
    name: "Pitch",
    title: "Pre-Sales Agent",
    description:
      "Writes client proposals, prospect pitches, talk tracks, and objection handlers from your service stack.",
    color: "#F0997B",
    icon: "FileText",
  },
  horizon: {
    id: "horizon",
    name: "Horizon",
    title: "Market Intelligence",
    description:
      "Monitors MSP industry trends, technology shifts, and market movements to keep your practice ahead of the curve.",
    color: "#EF9F27",
    icon: "Telescope",
  },
};

export type AgentId = keyof typeof AGENTS;
