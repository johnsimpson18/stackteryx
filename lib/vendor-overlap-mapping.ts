import type { ToolCategory } from "@/lib/types";

export interface OverlapGroup {
  groupName: string;
  categories: ToolCategory[];
  description: string;
}

export const OVERLAP_GROUPS: OverlapGroup[] = [
  {
    groupName: "Endpoint Detection & Response",
    categories: ["edr"],
    description:
      "Running multiple EDR agents on the same endpoint causes conflicts and performance issues. Pick one.",
  },
  {
    groupName: "Managed Detection & Response",
    categories: ["mdr"],
    description:
      "Multiple MDR providers monitoring the same environment creates alert duplication and unclear escalation paths.",
  },
  {
    groupName: "Dark Web Monitoring",
    categories: ["dark_web"],
    description:
      "These tools serve the same dark web monitoring function. Having multiple may be redundant unless you need different coverage types.",
  },
  {
    groupName: "SIEM & Log Management",
    categories: ["siem"],
    description:
      "Multiple SIEMs create duplicate data pipelines. Consider whether you need both or if one covers all use cases.",
  },
  {
    groupName: "Email Security",
    categories: ["email_security"],
    description:
      "Layered email security can work, but check for duplicate filtering that may block legitimate email.",
  },
  {
    groupName: "Backup & Recovery",
    categories: ["backup"],
    description:
      "Multiple backup tools for the same workload adds cost without coverage benefit. Confirm each covers different workloads.",
  },
  {
    groupName: "Identity & Access",
    categories: ["identity"],
    description:
      "Multiple identity platforms can cause authentication conflicts. Ensure each serves a distinct use case.",
  },
  {
    groupName: "DNS Filtering",
    categories: ["dns_filtering"],
    description:
      "Multiple DNS filtering layers typically only add cost — one well-configured solution is sufficient.",
  },
  {
    groupName: "Vulnerability Management",
    categories: ["vulnerability_management"],
    description:
      "Multiple vulnerability scanners create redundant scan cycles. One comprehensive scanner is usually sufficient.",
  },
  {
    groupName: "Network Monitoring",
    categories: ["network_monitoring"],
    description:
      "Multiple network monitoring tools can compete for the same traffic analysis. Verify each monitors different layers.",
  },
];

/**
 * Returns overlap info if the incoming tool's category overlaps
 * with existing stack tools. Returns null if no overlap found.
 */
export function detectOverlap(
  incomingCategory: ToolCategory,
  existingCategories: ToolCategory[]
): {
  hasOverlap: boolean;
  groupName: string;
  description: string;
  overlappingCategories: ToolCategory[];
} | null {
  const group = OVERLAP_GROUPS.find((g) =>
    g.categories.includes(incomingCategory)
  );
  if (!group) return null;

  const overlapping = existingCategories.filter((c) =>
    group.categories.includes(c)
  );
  if (overlapping.length === 0) return null;

  return {
    hasOverlap: true,
    groupName: group.groupName,
    description: group.description,
    overlappingCategories: overlapping,
  };
}

/**
 * Returns the overlap group name for a category, or null if none.
 */
export function getOverlapGroupForCategory(
  category: ToolCategory
): string | null {
  const group = OVERLAP_GROUPS.find((g) => g.categories.includes(category));
  return group?.groupName ?? null;
}
