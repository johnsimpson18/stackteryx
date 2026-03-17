export type AddonCategory = "advisory" | "response" | "compliance" | "support";

export interface AddonServiceOption {
  id: string;
  name: string;
  description: string;
  category: AddonCategory;
  typicalMonthlyPrice: number;
  outcomeIds: string[];
}

export const ADDON_SERVICE_OPTIONS: AddonServiceOption[] = [
  {
    id: "fractional-cto",
    name: "Fractional CTO Advisory",
    description:
      "Quarterly technology strategy briefs and executive advisory",
    category: "advisory",
    typicalMonthlyPrice: 1000,
    outcomeIds: ["adv-01", "adv-02", "adv-03"],
  },
  {
    id: "ir-retainer",
    name: "Incident Response Retainer",
    description:
      "Guaranteed expert response if a security incident occurs",
    category: "response",
    typicalMonthlyPrice: 500,
    outcomeIds: ["sec-05"],
  },
  {
    id: "compliance-advisory",
    name: "Compliance Advisory",
    description:
      "Ongoing compliance guidance and audit preparation support",
    category: "compliance",
    typicalMonthlyPrice: 750,
    outcomeIds: ["cmp-01", "cmp-02"],
  },
  {
    id: "help-desk",
    name: "Help Desk Support",
    description:
      "Direct access to technical support with defined response times",
    category: "support",
    typicalMonthlyPrice: 300,
    outcomeIds: ["pro-01", "pro-03"],
  },
  {
    id: "security-awareness",
    name: "Security Awareness Training",
    description:
      "Ongoing phishing simulation and employee security training",
    category: "advisory",
    typicalMonthlyPrice: 200,
    outcomeIds: ["sec-01"],
  },
  {
    id: "vciso",
    name: "vCISO Services",
    description:
      "Virtual CISO for security program leadership and governance",
    category: "advisory",
    typicalMonthlyPrice: 2000,
    outcomeIds: ["adv-01", "adv-02", "cmp-01"],
  },
];

export const ADDON_CATEGORY_LABELS: Record<AddonCategory, string> = {
  advisory: "Advisory",
  response: "Response",
  compliance: "Compliance",
  support: "Support",
};
