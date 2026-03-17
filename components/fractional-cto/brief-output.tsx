import { cn } from "@/lib/utils";
import { AgentBadge } from "@/components/agents/agent-badge";
import type { BriefOutput, TechnologyRisk, RadarItem } from "@/types/fractional-cto";

interface BriefOutputDisplayProps {
  brief: BriefOutput;
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBriefDate(iso: string): string {
  const d = new Date(iso);
  const quarter = `Q${Math.ceil((d.getMonth() + 1) / 3)}`;
  const year = d.getFullYear();
  const full = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `${quarter} ${year} \u00B7 ${full}`;
}

function severityColor(severity: TechnologyRisk["severity"]): string {
  switch (severity) {
    case "High":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "Medium":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Low":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
}

// ── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2
          className="text-lg font-bold tracking-tight text-foreground uppercase"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
        <div className="mt-1 h-0.5 w-10 bg-primary rounded-full" />
      </div>
      {children}
    </div>
  );
}

// ── Prose block ─────────────────────────────────────────────────────────────

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className="text-sm text-muted-foreground leading-relaxed">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

// ── Risk card ───────────────────────────────────────────────────────────────

function RiskCard({ risk }: { risk: TechnologyRisk }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{risk.title}</h3>
        <span
          className={cn(
            "shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-full border",
            severityColor(risk.severity),
          )}
        >
          {risk.severity}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {risk.description}
      </p>
    </div>
  );
}

// ── Radar item ──────────────────────────────────────────────────────────────

function RadarItemCard({ item }: { item: RadarItem }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-2 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <h3 className="text-sm font-semibold text-foreground min-w-0">
          {item.technology}
        </h3>
        <span className="inline-block max-w-full break-words whitespace-normal px-2 py-0.5 text-[11px] font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
          {item.relevance}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {item.implication}
      </p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function BriefOutputDisplay({
  brief,
  className,
}: BriefOutputDisplayProps) {
  const { sections } = brief;

  return (
    <div className={cn("space-y-10", className)}>
      {/* Report Header */}
      <div className="space-y-4 pb-6 border-b border-border/50">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
              <AgentBadge agentId="sage" size="md" />
              <span className="text-[10px] text-muted-foreground/60">
                {formatBriefDate(brief.generatedAt)}
              </span>
            </div>
            <h1
              className="text-2xl font-bold tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Technology Strategy Brief
            </h1>
            <p className="text-sm text-muted-foreground">
              Prepared for:{" "}
              <span className="text-foreground font-medium">
                {brief.clientDomain}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Prepared by:{" "}
              <span className="text-foreground font-medium">
                {brief.mspName}
              </span>
            </p>
            <p className="text-xs text-muted-foreground/60">
              {formatBriefDate(brief.generatedAt)}
            </p>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded border border-amber-500/30 bg-amber-500/5 text-amber-400">
            Confidential
          </span>
        </div>
      </div>

      {/* Executive Technology Perspective */}
      <Section title="Executive Technology Perspective">
        <Prose text={sections.executivePerspective} />
      </Section>

      {/* Business Technology Landscape */}
      <Section title="Business Technology Landscape">
        <Prose text={sections.businessLandscape} />
      </Section>

      {/* Strategic Technology Risks */}
      <Section title="Strategic Technology Risks">
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.technologyRisks.map((risk, i) => (
            <RiskCard key={i} risk={risk} />
          ))}
        </div>
      </Section>

      {/* Technology Radar */}
      <Section title="Technology Radar">
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.technologyRadar.map((item, i) => (
            <RadarItemCard key={i} item={item} />
          ))}
        </div>
      </Section>

      {/* Strategic Technology Priorities */}
      <Section title="Strategic Technology Priorities">
        <ol className="space-y-2 pl-1">
          {sections.strategicPriorities.map((priority, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground">
              <span className="shrink-0 text-primary font-mono font-bold text-xs mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-relaxed">{priority}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* Technology Planning Outlook */}
      <Section title="Technology Planning Outlook">
        <div className="grid gap-4 sm:grid-cols-3">
          <OutlookColumn
            label="Short Term"
            timeframe="0–6 months"
            items={sections.planningOutlook.shortTerm}
          />
          <OutlookColumn
            label="Mid Term"
            timeframe="6–12 months"
            items={sections.planningOutlook.midTerm}
          />
          <OutlookColumn
            label="Long Term"
            timeframe="12–24 months"
            items={sections.planningOutlook.longTerm}
          />
        </div>
      </Section>

      {/* Advisory Services */}
      <Section title="Fractional CTO Advisory Services">
        <div className="rounded-lg border border-border/50 bg-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            This Technology Strategy Brief is the first step in a structured advisory
            engagement. As your Fractional CTO partner, we deliver ongoing quarterly
            technology advisory that keeps your technology strategy aligned with
            business objectives.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our advisory program includes quarterly business reviews (QBRs) with
            executive-level technology assessments, technology roadmap planning and
            prioritization, risk monitoring and mitigation guidance, and strategic
            alignment between technology investments and business outcomes.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Contact{" "}
            <span className="text-foreground font-medium">{brief.mspName}</span>{" "}
            to discuss how Fractional CTO advisory can strengthen your technology
            posture and support your growth objectives.
          </p>
        </div>
      </Section>
    </div>
  );
}

// ── Outlook column ──────────────────────────────────────────────────────────

function OutlookColumn({
  label,
  timeframe,
  items,
}: {
  label: string;
  timeframe: string;
  items: string[];
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <p className="text-[11px] text-muted-foreground/60">{timeframe}</p>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-xs text-muted-foreground leading-relaxed"
          >
            <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
