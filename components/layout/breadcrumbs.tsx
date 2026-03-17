"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  services: "Services",
  tools: "Tool Catalog",
  new: "New",
  edit: "Edit",
  settings: "Settings",
  members: "Members",
  admin: "Admin",
  bundles: "Services",
  versions: "Pricing Configs",
  approvals: "Approvals",
  scenarios: "Scenarios",
  "stack-catalog": "Tools & Costs",
  "sales-studio": "Sales Studio",
  vendors: "Vendors",
  clients: "Clients",
  "additional-services": "Add-On Services",
  packages: "Packages",
  pricing: "Pricing",
  compliance: "Compliance",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items
  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    // Skip UUID segments but show them as part of a parent resource
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment
      );
    const label = isUuid ? "..." : (ROUTE_LABELS[segment] ?? segment);

    return { href, label, isLast: index === segments.length - 1 };
  });

  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <Fragment key={item.href}>
          {index > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {item.isLast ? (
            <span className="font-medium">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
