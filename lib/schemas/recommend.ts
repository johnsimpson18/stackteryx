import { z } from "zod";

export const recommendRequestSchema = z.object({
  clientName: z.string().min(1).max(100),
  industry: z.enum([
    "legal",
    "healthcare",
    "finance",
    "manufacturing",
    "technology",
    "nonprofit",
    "education",
    "professional_services",
    "retail",
    "construction",
    "other",
  ]),
  seatCount: z.number().int().min(1).max(10000),
  riskTolerance: z.enum(["low", "moderate", "high"]),
  budgetPerSeatMax: z.number().min(0).optional(),
  complianceRequirements: z
    .array(z.enum(["hipaa", "pci_dss", "cmmc", "sox", "gdpr", "none"]))
    .default([]),
  currentPainPoints: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;

export const INDUSTRY_LABELS: Record<string, string> = {
  legal: "Legal",
  healthcare: "Healthcare",
  finance: "Finance & Banking",
  manufacturing: "Manufacturing",
  technology: "Technology",
  nonprofit: "Non-Profit",
  education: "Education",
  professional_services: "Professional Services",
  retail: "Retail",
  construction: "Construction",
  other: "Other",
};

export const COMPLIANCE_LABELS: Record<string, string> = {
  hipaa: "HIPAA",
  pci_dss: "PCI-DSS",
  cmmc: "CMMC",
  sox: "SOX",
  gdpr: "GDPR",
  none: "None / Not applicable",
};
