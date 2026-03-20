"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface OpenModuleData {
  href: string;
  label: string;
  reason: string;
}

export function OpenModuleCard({ data }: { data: OpenModuleData }) {
  return (
    <Link
      href={data.href}
      className="flex items-center justify-between rounded-lg p-3 mt-2 transition-colors hover:border-primary/40"
      style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
    >
      <div>
        <p className="text-sm font-medium text-foreground">&rarr; {data.label}</p>
        <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
          {data.reason}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
    </Link>
  );
}
