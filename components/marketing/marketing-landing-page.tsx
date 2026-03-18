"use client";

import Link from "next/link";
import {
  ArrowRight, Brain, Layers2, TrendingUp, BarChart2, FileText,
  Package, DollarSign, Sparkles, Telescope,
} from "lucide-react";
import { HeroGraphic } from "./hero-graphic";

/* ─────────────────────────────────────────────────────────────
   STACKTERYX MARKETING LANDING PAGE
   ───────────────────────────────────────────────────────────── */

const AGENTS = [
  {
    name: "Aria",
    title: "Service Architect",
    color: "#c8f135",
    Icon: Layers2,
    desc: "Designs your service stack and maps tools to outcomes.",
  },
  {
    name: "Margin",
    title: "Pricing Analyst",
    color: "#378ADD",
    Icon: TrendingUp,
    desc: "Models real delivery costs and suggests profitable pricing.",
  },
  {
    name: "Scout",
    title: "Portfolio Analyst",
    color: "#5DCAA5",
    Icon: BarChart2,
    desc: "Monitors every client for risk and opportunity 24/7.",
  },
  {
    name: "Sage",
    title: "Advisory Agent",
    color: "#AFA9EC",
    Icon: Brain,
    desc: "Generates executive CTO briefs and advisory reports.",
  },
  {
    name: "Pitch",
    title: "Pre-Sales Agent",
    color: "#F0997B",
    Icon: FileText,
    desc: "Writes proposals, playbooks, and talk tracks from your service stack.",
  },
  {
    name: "Horizon",
    title: "Market Intelligence",
    color: "#EF9F27",
    Icon: Telescope,
    desc: "Watches MSP industry trends, technology shifts, and competitive movements \u2014 delivers a weekly briefing every Monday morning.",
  },
];

export function MarketingLandingPage() {
  function scrollToSection(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A", scrollPaddingTop: "80px" }}>

      {/* ═══════════════════════════════════════════════════════
          NAVIGATION BAR
          ═══════════════════════════════════════════════════════ */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between h-16 px-6"
        style={{
          background: "#0A0A0AEE",
          borderBottom: "1px solid #1E1E1E",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/stackteryx-logo.svg" alt="Stackteryx" height={24} style={{ height: 24, width: "auto" }} />

        <div className="flex items-center gap-3">
          <a
            href="/fractional-cto"
            className="h-8 px-4 flex items-center gap-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: "#c8f135",
              border: "1px solid #c8f13540",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#c8f135";
              e.currentTarget.style.background = "#c8f13510";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#c8f13540";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Free CTO Brief
          </a>
          <Link
            href="/login"
            className="h-8 px-4 flex items-center rounded text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: "#FFFFFF",
              border: "1px solid #1E1E1E",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#c8f135";
              e.currentTarget.style.color = "#c8f135";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1E1E1E";
              e.currentTarget.style.color = "#FFFFFF";
            }}
          >
            Log In
          </Link>
          <Link
            href="/login?tab=signup"
            className="h-8 px-4 flex items-center rounded text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              background: "#c8f135",
              color: "#0A0A0A",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f55c")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════════════════════ */}
      <section
        className="relative"
        style={{
          paddingTop: 80,
          paddingBottom: 100,
          backgroundImage:
            "linear-gradient(#c8f13508 1px, transparent 1px), linear-gradient(90deg, #c8f13508 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div
          className="mx-auto px-6"
          style={{
            maxWidth: 1200,
            display: "grid",
            gridTemplateColumns: "55fr 45fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          {/* ── Left column — Copy ──────────────────────────────── */}
          <div>
            {/* Eyebrow */}
            <p
              className="landing-fade-in text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)", animationDelay: "0ms" }}
            >
              MSP SERVICE INTELLIGENCE PLATFORM
            </p>

            <h1
              className="mt-6 text-[44px] md:text-[clamp(56px,7vw,88px)] font-extrabold leading-[1.0] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span className="landing-word block" style={{ color: "#FFFFFF", animationDelay: "0ms" }}>
                Your MSP deserves
              </span>
              <span className="landing-word block" style={{ color: "#FFFFFF", animationDelay: "60ms" }}>
                better than
              </span>
              <span
                className="landing-word landing-glow-text block"
                style={{ color: "#c8f135", animationDelay: "120ms" }}
              >
                a spreadsheet.
              </span>
            </h1>

            <p
              className="landing-fade-in mt-6 max-w-[620px] text-[16px] leading-[1.75]"
              style={{
                color: "#999999",
                animationDelay: "300ms",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              Stackteryx gives MSPs a team of six AI agents that design profitable
              services, model real delivery costs, generate client proposals, deliver
              executive advisory, and brief you every Monday on where the MSP market
              is heading &mdash; so every engagement is strategic, not reactive.
            </p>

            {/* CTA buttons */}
            <div
              className="landing-fade-in mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              style={{ animationDelay: "450ms" }}
            >
              <Link
                href="/login?tab=signup"
                className="h-11 px-6 flex items-center gap-2 rounded text-sm font-bold uppercase tracking-wider transition-all"
                style={{
                  background: "#c8f135",
                  color: "#0A0A0A",
                  fontFamily: "var(--font-display)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f55c")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
              >
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, "how-it-works")}
                className="h-11 px-6 flex items-center gap-2 rounded text-sm font-bold uppercase tracking-wider transition-all"
                style={{
                  color: "#FFFFFF",
                  border: "1px solid #1E1E1E",
                  fontFamily: "var(--font-display)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c8f135";
                  e.currentTarget.style.color = "#c8f135";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1E1E1E";
                  e.currentTarget.style.color = "#FFFFFF";
                }}
              >
                See How It Works
              </a>
            </div>

            {/* Social proof */}
            <p
              className="landing-fade-in mt-12 text-[13px]"
              style={{
                color: "#444444",
                animationDelay: "550ms",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              Trusted by MSPs delivering managed security services across North America.
              <br />
              Six AI agents. One intelligence platform.
            </p>
          </div>

          {/* ── Right column — Graphic ──────────────────────────── */}
          <div className="hidden md:block">
            <HeroGraphic />
          </div>
        </div>

        {/* Mobile graphic — below copy, left panel only */}
        <div className="md:hidden mt-10 px-6" style={{ maxHeight: 320, overflow: "hidden" }}>
          <HeroGraphic />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — AGENT SHOWCASE
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              YOUR AI TEAM
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Five agents. Every role in your service business covered.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {AGENTS.map((agent) => (
              <div
                key={agent.name}
                className="rounded-lg p-5 space-y-3"
                style={{
                  background: "#0A0A0A",
                  borderLeft: `3px solid ${agent.color}`,
                  border: `1px solid #1E1E1E`,
                  borderLeftColor: agent.color,
                  borderLeftWidth: 3,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: agent.color }}
                  />
                  <span
                    className="text-lg font-bold"
                    style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                  >
                    {agent.name}
                  </span>
                </div>
                <p
                  className="text-xs uppercase tracking-wider font-semibold"
                  style={{ color: agent.color, fontFamily: "var(--font-mono-alt)" }}
                >
                  {agent.title}
                </p>
                <p
                  className="text-[14px] leading-[1.65]"
                  style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
                >
                  {agent.desc}
                </p>
              </div>
            ))}
          </div>

          <p
            className="text-center text-[14px]"
            style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
          >
            All six work continuously &mdash; no prompting required.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — THE PAIN
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#0A0A0A" }}>
        <div className="max-w-5xl mx-auto px-6 text-center space-y-14">
          <div className="space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              THE PROBLEM
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Sound familiar?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                heading: "MSPs are flying blind on service economics.",
                body: "Most providers can\u2019t tell you their real margin on a service. Tool costs, labor, and overhead aren\u2019t modeled together \u2014 so every quote is a guess.",
                Icon: DollarSign,
              },
              {
                heading: "Advisory services don\u2019t scale without infrastructure.",
                body: "Every new client needs a strategy brief, a QBR, a technology roadmap. Done manually, this work doesn\u2019t scale. Done with AI, it becomes a recurring revenue line.",
                Icon: Brain,
              },
              {
                heading: "Clients don\u2019t pay for tools. They pay for outcomes.",
                body: "When services are defined by vendor tools instead of business results, MSPs compete on price. When they\u2019re defined by outcomes, MSPs compete on value.",
                Icon: Package,
              },
            ].map(({ heading, body, Icon }) => (
              <div
                key={heading}
                className="rounded-lg p-6 text-left space-y-3"
                style={{ background: "#111111", border: "1px solid #1E1E1E" }}
              >
                <div
                  className="h-10 w-10 rounded-md flex items-center justify-center"
                  style={{ background: "#c8f13510" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "#c8f135" }} />
                </div>
                <h3
                  className="text-base font-bold"
                  style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                >
                  {heading}
                </h3>
                <p
                  className="text-[15px] leading-[1.7]"
                  style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — THE BIG IDEA (interstitial)
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <p
            className="text-[11px] uppercase tracking-[0.3em] font-semibold"
            style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
          >
            A BETTER WAY
          </p>
          <h2
            className="text-3xl md:text-5xl font-extrabold leading-tight"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            What if every service you sold was{" "}
            <span style={{ color: "#c8f135" }}>profitable by design?</span>
          </h2>
          <p
            className="text-[16px] leading-[1.75] max-w-2xl mx-auto"
            style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
          >
            Stackteryx connects your service catalog, vendor costs, and pricing in one
            place &mdash; then deploys five AI agents to help you build, price, and sell services that
            actually make money.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — HOW IT WORKS
          ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 md:py-32" style={{ background: "#0A0A0A" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              HOW IT WORKS
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Your agents run the workflow. You run the business.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                agent: "Aria",
                agentColor: "#c8f135",
                title: "Aria designs your services",
                desc: "Add your vendor tools and Aria maps them to client outcomes, scores compliance coverage, detects stack gaps, and suggests service configurations in real time.",
                Icon: Layers2,
              },
              {
                step: "02",
                agent: "Margin",
                agentColor: "#378ADD",
                title: "Margin prices them profitably",
                desc: "Margin models your real delivery cost \u2014 tools, labor, overhead \u2014 and calculates the price point that hits your target margin before you ever send a quote.",
                Icon: TrendingUp,
              },
              {
                step: "03",
                agent: "Pitch",
                agentColor: "#F0997B",
                title: "Pitch writes your sales materials",
                desc: "Pitch transforms your service stack into client-ready proposals, talk tracks, and objection handlers \u2014 written in outcome language your clients understand.",
                Icon: FileText,
              },
              {
                step: "04",
                agent: "Sage & Scout",
                agentColor: "#AFA9EC",
                title: "Sage and Scout run the advisory layer",
                desc: "Sage generates quarterly technology strategy briefs for every client. Scout monitors your portfolio and flags opportunities, risks, and renewals before they surface on their own.",
                Icon: Brain,
              },
              {
                step: "05",
                agent: "Horizon",
                agentColor: "#EF9F27",
                title: "Horizon keeps you ahead of the market",
                desc: "Every Monday morning, Horizon delivers a market intelligence digest \u2014 technology shifts, MSP business trends, and competitive movements \u2014 so you walk into every client conversation knowing where the industry is heading.",
                Icon: Telescope,
              },
            ].map(({ step, agent, agentColor, title, desc, Icon }) => (
              <div
                key={step}
                className="rounded-lg p-6 space-y-3"
                style={{ background: "#111111", border: "1px solid #1E1E1E" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
                  >
                    STEP {step}
                  </span>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: agentColor, fontFamily: "var(--font-mono-alt)" }}
                  >
                    &middot; {agent}
                  </span>
                </div>
                <div
                  className="h-10 w-10 rounded-md flex items-center justify-center"
                  style={{ background: `${agentColor}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: agentColor }} />
                </div>
                <h3
                  className="text-base font-bold"
                  style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h3>
                <p
                  className="text-[15px] leading-[1.75]"
                  style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — FRACTIONAL CTO
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <p
                className="text-[11px] uppercase tracking-[0.3em] font-semibold"
                style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
              >
                FRACTIONAL CTO
              </p>
              <h2
                className="text-3xl md:text-[42px] font-extrabold leading-tight"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                Give every client a CTO &mdash;{" "}
                <span style={{ color: "#c8f135" }}>without hiring one.</span>
              </h2>
              <p
                className="text-[16px] leading-[1.75]"
                style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
              >
                Generate executive-grade Technology Strategy Briefs that surface
                risks, recommend actions, and position your MSP as a strategic
                advisor &mdash; not just a vendor.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  { title: "AI-Generated Briefs", desc: "Quarterly technology strategy reports tailored to each client\u2019s industry and stack." },
                  { title: "Risk Intelligence", desc: "Surface technology risks before they become incidents. Clients see you as proactive, not reactive." },
                  { title: "Revenue Expansion", desc: "Every brief is a conversation starter for new services. Advisory becomes a billable offering." },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 h-6 w-6 rounded flex items-center justify-center mt-0.5"
                      style={{ background: "#c8f13515" }}
                    >
                      <Brain className="h-3.5 w-3.5" style={{ color: "#c8f135" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>
                        {title}
                      </p>
                      <p className="text-[15px] leading-[1.7]" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="/fractional-cto"
                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors"
                style={{ color: "#c8f135", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#d4f55c")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#c8f135")}
              >
                Try a Free CTO Brief
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div
              className="rounded-lg p-8 space-y-4"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-md flex items-center justify-center"
                  style={{ background: "#c8f13515" }}
                >
                  <Brain className="h-5 w-5" style={{ color: "#c8f135" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>
                    Technology Strategy Brief
                  </p>
                  <p className="text-[13px]" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>
                    Q1 2026 &middot; Healthcare
                  </p>
                </div>
              </div>
              <div className="h-px w-full" style={{ background: "#1E1E1E" }} />
              {[
                { label: "Technology Risks", value: "3 identified", color: "#EF4444" },
                { label: "Strategic Recommendations", value: "5 actions", color: "#c8f135" },
                { label: "Budget Guidance", value: "$24k\u2013$36k/yr", color: "#3B82F6" },
                { label: "Compliance Gaps", value: "2 critical", color: "#F59E0B" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[15px]" style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}>{label}</span>
                  <span className="text-[15px] font-bold" style={{ color, fontFamily: "var(--font-mono-alt)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — FEATURE GRID (agent-organized)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#0A0A0A" }}>
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              PLATFORM
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              One platform. Six agents. The full service intelligence stack.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                agent: "Aria",
                agentColor: "#c8f135",
                Icon: Layers2,
                title: "Stack Builder",
                desc: "Design service stacks visually with live compliance scoring and outcome mapping.",
              },
              {
                agent: "Margin",
                agentColor: "#378ADD",
                Icon: DollarSign,
                title: "Pricing Engine",
                desc: "Know your exact margin before you quote \u2014 every time.",
              },
              {
                agent: "Scout",
                agentColor: "#5DCAA5",
                Icon: BarChart2,
                title: "Portfolio Intelligence",
                desc: "24/7 monitoring across every client for risks, renewals, and revenue signals.",
              },
              {
                agent: "Pitch",
                agentColor: "#F0997B",
                Icon: FileText,
                title: "Sales Studio",
                desc: "Proposals, playbooks, and talk tracks written from your service stack in minutes.",
              },
              {
                agent: "Sage",
                agentColor: "#AFA9EC",
                Icon: Brain,
                title: "Fractional CTO",
                desc: "Executive technology advisory briefs and client strategy reports, on demand.",
              },
              {
                agent: "Horizon",
                agentColor: "#EF9F27",
                Icon: Telescope,
                title: "Market Intelligence",
                desc: "Horizon monitors MSP industry trends, technology shifts, and competitive movements \u2014 delivering a weekly briefing so you always know where the market is heading.",
              },
              {
                agent: "All Agents",
                agentColor: "#c8f135",
                Icon: Sparkles,
                title: "Service Intelligence",
                desc: "The unified operating layer that connects your tools, clients, margins, and advisory.",
              },
            ].map(({ agent, agentColor, Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-lg p-5 space-y-3 transition-colors"
                style={{ background: "#111111", border: "1px solid #1E1E1E" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c8f13540")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1E1E1E")}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="h-9 w-9 rounded-md flex items-center justify-center"
                    style={{ background: `${agentColor}15` }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: agentColor }} />
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: agentColor, fontFamily: "var(--font-mono-alt)" }}
                  >
                    {agent}
                  </span>
                </div>
                <h3 className="text-sm font-bold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>
                  {title}
                </h3>
                <p className="text-[15px] leading-[1.65]" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — WHY NOW
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              WHY THIS MATTERS NOW
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              AI is reshaping how managed services get bought and sold.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "MSPs are getting squeezed",
                body: "Clients expect strategic guidance. Margins are compressed by vendor pricing complexity. The providers who survive will deliver advisory at scale \u2014 not just reactive support.",
              },
              {
                title: "The tools exist. The infrastructure doesn\u2019t.",
                body: "AI can write a technology strategy brief. AI can model service margins. But no platform has assembled these capabilities into an operating system for MSP service delivery. Until now. And now, for the first time, an MSP platform watches the market for you \u2014 so you\u2019re never caught off guard by an industry shift your clients are already asking about.",
              },
              {
                title: "The window is open",
                body: "MSPs that build an AI-powered advisory layer in the next 24 months will own the high-margin segment of their market. Those that don\u2019t will compete on price against offshore providers and automation.",
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                className="rounded-lg p-6 space-y-3"
                style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
              >
                <h3
                  className="text-base font-bold"
                  style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h3>
                <p
                  className="text-[15px] leading-[1.7]"
                  style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9 — PRICING
          ═══════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 md:py-32" style={{ background: "#0A0A0A" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              PRICING
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Start free. Scale when you&apos;re ready.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div
              className="rounded-lg p-6 space-y-5"
              style={{ background: "#111111", border: "1px solid #1E1E1E" }}
            >
              <div>
                <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>Free</p>
                <p className="mt-2">
                  <span className="text-4xl font-extrabold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>$0</span>
                  <span className="text-sm ml-1" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>/month</span>
                </p>
              </div>
              <ul className="space-y-2">
                {["1 service bundle", "2 proposals / month", "1 CTO brief / month", "Community support"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[15px]" style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}>
                    <span style={{ color: "#c8f135" }}>{"\u2713"}</span>{item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?tab=signup"
                className="block w-full h-10 flex items-center justify-center rounded text-sm font-bold uppercase tracking-wider transition-all"
                style={{ color: "#FFFFFF", border: "1px solid #1E1E1E", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c8f135"; e.currentTarget.style.color = "#c8f135"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#FFFFFF"; }}
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div
              className="rounded-lg p-6 space-y-5 relative"
              style={{ background: "#111111", border: "2px solid #c8f135" }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ background: "#c8f135", color: "#0A0A0A", fontFamily: "var(--font-display)" }}
              >
                Most Popular
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}>Pro</p>
                <p className="mt-2">
                  <span className="text-4xl font-extrabold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>$149</span>
                  <span className="text-sm ml-1" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>/month</span>
                </p>
              </div>
              <ul className="space-y-2">
                {["10 service bundles", "25 proposals / month", "10 CTO briefs / month", "Custom branding", "Priority support"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[15px]" style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}>
                    <span style={{ color: "#c8f135" }}>{"\u2713"}</span>{item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?tab=signup"
                className="block w-full h-10 flex items-center justify-center rounded text-sm font-bold uppercase tracking-wider transition-all"
                style={{ background: "#c8f135", color: "#0A0A0A", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f55c")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
              >
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div
              className="rounded-lg p-6 space-y-5"
              style={{ background: "#111111", border: "1px solid #1E1E1E" }}
            >
              <div>
                <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>Enterprise</p>
                <p className="mt-2">
                  <span className="text-4xl font-extrabold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>$399</span>
                  <span className="text-sm ml-1" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>/month</span>
                </p>
              </div>
              <ul className="space-y-2">
                {["Unlimited bundles", "Unlimited proposals", "Unlimited CTO briefs", "White-label exports", "Team seats", "Dedicated support"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[15px]" style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}>
                    <span style={{ color: "#c8f135" }}>{"\u2713"}</span>{item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?tab=signup"
                className="block w-full h-10 flex items-center justify-center rounded text-sm font-bold uppercase tracking-wider transition-all"
                style={{ color: "#FFFFFF", border: "1px solid #1E1E1E", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c8f135"; e.currentTarget.style.color = "#c8f135"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#FFFFFF"; }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 10 — FINAL CTA
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#0A0A0A" }}>
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <h2
            className="text-3xl md:text-5xl font-extrabold leading-tight"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            Stop guessing. Start building{" "}
            <span style={{ color: "#c8f135" }}>profitable services.</span>
          </h2>
          <p
            className="text-[16px] leading-[1.75] max-w-xl mx-auto"
            style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
          >
            Join MSPs who use Stackteryx to design, price, and sell services
            with confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/login?tab=signup"
              className="h-12 px-8 flex items-center gap-2 rounded text-sm font-bold uppercase tracking-wider transition-all"
              style={{ background: "#c8f135", color: "#0A0A0A", fontFamily: "var(--font-display)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f55c")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pricing"
              onClick={(e) => scrollToSection(e, "pricing")}
              className="h-12 px-8 flex items-center gap-2 rounded text-sm font-bold uppercase tracking-wider transition-all"
              style={{ color: "#FFFFFF", border: "1px solid #1E1E1E", fontFamily: "var(--font-display)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c8f135"; e.currentTarget.style.color = "#c8f135"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E1E1E"; e.currentTarget.style.color = "#FFFFFF"; }}
            >
              View Pricing
            </a>
          </div>
          <p className="text-[13px]" style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}>
            No credit card required. Free to start.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <footer
        className="py-16"
        style={{ background: "#0A0A0A", borderTop: "1px solid #1E1E1E" }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/stackteryx-logo.svg" alt="Stackteryx" height={24} style={{ height: 24, width: "auto" }} />
              <p className="text-[13px] leading-relaxed" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>
                The MSP Service Intelligence Platform &mdash; five AI agents that design, price, and sell managed services.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>Product</p>
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
                { label: "Free CTO Brief", href: "/fractional-cto" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={href.startsWith("#") ? (e) => scrollToSection(e, href.slice(1)) : undefined}
                  className="block text-[14px] transition-colors"
                  style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>Platform</p>
              {["Service Builder", "Sales Studio", "Portfolio Intelligence"].map((label) => (
                <Link
                  key={label}
                  href="/login"
                  className="block text-[14px] transition-colors"
                  style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>Legal</p>
              {["Terms", "Privacy", "Contact"].map((label) => (
                <span
                  key={label}
                  className="block text-[14px] cursor-pointer transition-colors"
                  style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 text-center" style={{ borderTop: "1px solid #1E1E1E" }}>
            <span className="text-[13px]" style={{ color: "#333333", fontFamily: "var(--font-mono-alt)" }}>
              &copy; 2026 Stackteryx. Built for MSPs.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
