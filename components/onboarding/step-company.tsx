"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COMPANY_SIZES = ["1–10", "11–50", "51–200", "200+"];

const GEOGRAPHIES = [
  "North America",
  "EMEA",
  "APAC",
  "LATAM",
  "Global",
];

interface StepCompanyProps {
  companyName: string;
  founderName: string;
  founderTitle: string;
  companySize: string;
  geographies: string[];
  onCompanyNameChange: (v: string) => void;
  onFounderNameChange: (v: string) => void;
  onFounderTitleChange: (v: string) => void;
  onCompanySizeChange: (v: string) => void;
  onGeographiesChange: (v: string[]) => void;
}

export function StepCompany({
  companyName,
  founderName,
  founderTitle,
  companySize,
  geographies,
  onCompanyNameChange,
  onFounderNameChange,
  onFounderTitleChange,
  onCompanySizeChange,
  onGeographiesChange,
}: StepCompanyProps) {
  const toggleGeo = (geo: string) => {
    onGeographiesChange(
      geographies.includes(geo)
        ? geographies.filter((g) => g !== geo)
        : [...geographies, geo]
    );
  };

  return (
    <div className="space-y-8">
      {/* Headline */}
      <div>
        <h1 className="font-display text-white text-4xl font-bold uppercase tracking-tight">
          LET&apos;S BUILD YOUR STACKTERYX
        </h1>
        <p className="mt-2 font-mono text-muted-foreground text-sm">
          First, tell us about your company.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          We use this to tailor your service templates and pricing benchmarks to your market.
        </p>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Company Name
        </Label>
        <Input
          type="text"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          placeholder="Your MSP or company name"
          className="h-auto rounded-lg bg-[#111111] border-border text-white px-4 py-3 text-sm placeholder:text-[#444] focus-visible:border-primary focus-visible:ring-primary/50"
        />
      </div>

      {/* Your Name */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Your Name
        </Label>
        <Input
          type="text"
          value={founderName}
          onChange={(e) => onFounderNameChange(e.target.value)}
          placeholder="Full name"
          className="h-auto rounded-lg bg-[#111111] border-border text-white px-4 py-3 text-sm placeholder:text-[#444] focus-visible:border-primary focus-visible:ring-primary/50"
        />
      </div>

      {/* Your Title */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Your Title
        </Label>
        <Input
          type="text"
          value={founderTitle}
          onChange={(e) => onFounderTitleChange(e.target.value)}
          placeholder="e.g. CEO, CTO, Director of Security"
          className="h-auto rounded-lg bg-[#111111] border-border text-white px-4 py-3 text-sm placeholder:text-[#444] focus-visible:border-primary focus-visible:ring-primary/50"
        />
      </div>

      {/* Company Size */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Company Size
        </Label>
        <div className="grid grid-cols-4 gap-3">
          {COMPANY_SIZES.map((size) => {
            const selected = companySize === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => onCompanySizeChange(selected ? "" : size)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                  selected
                    ? "bg-primary/[0.06] border-primary text-primary"
                    : "bg-[#111111] border-border text-[#CCCCCC]"
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Geography */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Primary Geography
        </Label>
        <div className="flex flex-wrap gap-2">
          {GEOGRAPHIES.map((geo) => {
            const selected = geographies.includes(geo);
            return (
              <button
                key={geo}
                type="button"
                onClick={() => toggleGeo(geo)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-[#111111] text-[#CCCCCC] border-border"
                )}
              >
                {geo}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
