"use client";

import Link from "next/link";
import {
  ArrowRight, Brain, Layers2, TrendingUp, BarChart2, FileText,
  Telescope,
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
            Free CTO Brief &#10022;
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
              e.currentTarget.style.background = "#c8f13510";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1E1E1E";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Log in
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-0">
            <p
              className="landing-fade-in text-[11px] uppercase tracking-[0.3em] font-semibold mb-6"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              THE SYSTEM OF RECORD FOR MSP SERVICE ECONOMICS
            </p>
            <h1
              className="landing-fade-in text-4xl md:text-6xl font-extrabold leading-[1.08] tracking-tight"
              style={{
                color: "#FFFFFF",
                animationDelay: "150ms",
                fontFamily: "var(--font-display)",
              }}
            >
              Your MSP deserves better than a spreadsheet.
            </h1>
            <p
              className="landing-fade-in text-base md:text-lg mt-6 max-w-xl leading-[1.75]"
              style={{
                color: "#999999",
                animationDelay: "300ms",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              Stackteryx is the first platform built specifically for MSP service
              economics &mdash; connecting your vendor tools to delivery costs, service
              margins, client outcomes, and proposals in one structured system.
            </p>

            {/* CTA buttons */}
            <div
              className="landing-fade-in mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              style={{ animationDelay: "450ms" }}
            >
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, "how-it-works")}
                className="h-11 px-7 flex items-center gap-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all"
                style={{
                  background: "#c8f135",
                  color: "#0A0A0A",
                  fontFamily: "var(--font-display)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f74d")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
              >
                See how it works
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/fractional-cto"
                className="h-11 px-7 flex items-center gap-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all"
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
                Generate a Free CTO Brief
              </Link>
            </div>
          </div>

          <div className="landing-fade-in flex-1 w-full max-w-lg lg:max-w-none" style={{ animationDelay: "600ms" }}>
            <HeroGraphic />
          </div>
        </div>

        {/* Credibility line */}
        <div className="max-w-4xl mx-auto px-6 mt-20">
          <p
            className="text-center text-sm leading-relaxed"
            style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
          >
            The only system where MSPs design, price, and sell profitable
            services &mdash; without a spreadsheet in sight.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — THE GAP
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#111111" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              THE MISSING SYSTEM
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Every business system exists. Except this one.
            </h2>
          </div>

          {/* Three systems */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "CRMs track customers.", tools: "Salesforce, HubSpot", what: "Who you sold to." },
              { title: "PSAs track tickets.", tools: "ConnectWise, Autotask", what: "What broke and when." },
              { title: "RMMs track devices.", tools: "NinjaOne, Automate", what: "What\u2019s running." },
            ].map(({ title, tools, what }) => (
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
                  className="text-xs"
                  style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
                >
                  {tools}
                </p>
                <div style={{ height: 1, background: "#1E1E1E" }} />
                <p
                  className="text-sm"
                  style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
                >
                  {what}
                </p>
              </div>
            ))}
          </div>

          {/* The gap */}
          <div style={{ height: 1, background: "#1E1E1E" }} />

          <div className="text-center space-y-6">
            <p
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}
            >
              Nothing tracks:
            </p>
            <p
              className="text-[15px] md:text-base leading-[1.75] max-w-2xl mx-auto"
              style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
            >
              How services are designed. What they cost to deliver.
              Whether they&apos;re profitable. How to sell them.
            </p>
            <p
              className="text-xl md:text-2xl font-extrabold"
              style={{ color: "#c8f135", fontFamily: "var(--font-display)" }}
            >
              That&apos;s the gap Stackteryx fills.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — THE SYSTEM (How It Works)
          ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 md:py-32" style={{ background: "#0A0A0A" }}>
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              THE SYSTEM
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              One structured workflow. From outcome to invoice.
            </h2>
          </div>

          {/* Flow labels */}
          <div className="hidden md:flex items-center justify-center gap-2 text-sm font-bold" style={{ fontFamily: "var(--font-mono-alt)" }}>
            {["OUTCOME", "SERVICE", "STACK", "COST", "PRICE"].map((label, i) => (
              <span key={label} className="flex items-center gap-2">
                <span style={{ color: "#c8f135" }}>{label}</span>
                {i < 4 && <ArrowRight className="h-3.5 w-3.5" style={{ color: "#333333" }} />}
              </span>
            ))}
          </div>

          {/* Five step cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                step: "01",
                label: "Outcome",
                desc: "Define the business result your client is paying for \u2014 not the tools. Reduced ransomware risk. Regulatory compliance. Operational resilience.",
              },
              {
                step: "02",
                label: "Service",
                desc: "Design the service around that outcome. Select capabilities, set deliverables, establish what you actually provide.",
              },
              {
                step: "03",
                label: "Stack",
                desc: "Map the vendor tools that power the service. Stackteryx calculates real delivery cost from your actual vendor contracts.",
              },
              {
                step: "04",
                label: "Cost",
                desc: "Model labor, overhead, and vendor costs together \u2014 for the first time. See what this service actually costs to deliver.",
              },
              {
                step: "05",
                label: "Price",
                desc: "Set a price with full margin visibility. Know what you make before you quote. Every time.",
              },
            ].map(({ step, label, desc }) => (
              <div
                key={step}
                className="rounded-lg p-5 space-y-3"
                style={{ background: "#111111", border: "1px solid #1E1E1E" }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
                >
                  STEP {step}
                </span>
                <h3
                  className="text-base font-bold"
                  style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                >
                  {label}
                </h3>
                <p
                  className="text-[14px] leading-[1.7]"
                  style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <p
            className="text-center text-sm"
            style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
          >
            The system runs continuously &mdash; monitoring, alerting, and generating
            insights without you needing to initiate it.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — THE INTELLIGENCE LAYER (Agents)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#111111" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              INSIDE THE SYSTEM
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Six agents run the work you&apos;ve always done manually.
            </h2>
            <p
              className="text-[15px] leading-[1.75] max-w-2xl mx-auto"
              style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
            >
              Built into Stackteryx is a team of six AI workers &mdash; each with a
              specific job inside the system. They don&apos;t require prompting.
              They run continuously, acting on your data, so the system is
              always working even when you&apos;re not.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {AGENTS.map((agent) => (
              <div
                key={agent.name}
                className="rounded-lg p-5 space-y-3"
                style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-md flex items-center justify-center"
                    style={{ background: `${agent.color}15` }}
                  >
                    <agent.Icon className="h-4.5 w-4.5" style={{ color: agent.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#FFFFFF" }}>{agent.name}</p>
                    <p className="text-xs" style={{ color: agent.color, fontFamily: "var(--font-mono-alt)" }}>{agent.title}</p>
                  </div>
                </div>
                <p
                  className="text-[14px] leading-[1.65]"
                  style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
                >
                  {agent.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center space-y-1">
            <p
              className="text-sm font-semibold"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-mono-alt)" }}
            >
              This is what separates a system from a tool.
            </p>
            <p
              className="text-sm"
              style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
            >
              Tools wait to be used. Systems run continuously.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — ECONOMIC PROOF
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#0A0A0A" }}>
        <div className="max-w-4xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              THE ECONOMICS
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              One use case. The math speaks for itself.
            </h2>
          </div>

          <div
            className="rounded-xl p-8 md:p-10 space-y-6"
            style={{ background: "#111111", border: "1px solid #1E1E1E" }}
          >
            <h3
              className="text-lg font-bold"
              style={{ color: "#c8f135", fontFamily: "var(--font-display)" }}
            >
              Fractional CTO Advisory
            </h3>
            <div className="space-y-4">
              <p
                className="text-[15px] leading-[1.75]"
                style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
              >
                An MSP charges $1,000/month per client for strategic technology
                advisory. Ten clients. $120,000 in new annual recurring revenue.
              </p>
              <p
                className="text-[15px] leading-[1.75]"
                style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
              >
                Sage &mdash; Stackteryx&apos;s advisory agent &mdash; generates the quarterly
                Technology Strategy Brief in under 60 seconds. Branded.
                Exportable. Client-ready.
              </p>
              <p
                className="text-[15px] leading-[1.75]"
                style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
              >
                The service that used to require a $200,000/year vCIO hire is
                now delivered by a $399/month platform.
              </p>
            </div>

            {/* Value stats */}
            <div className="grid grid-cols-3 gap-6 pt-6" style={{ borderTop: "1px solid #1E1E1E" }}>
              {[
                { value: "< 60 seconds", label: "Brief generation" },
                { value: "$120K/year", label: "10-client ARR" },
                { value: "$0", label: "Additional headcount" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p
                    className="text-xl md:text-2xl font-extrabold"
                    style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
                  >
                    {value}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/fractional-cto"
              className="inline-flex items-center gap-2 h-11 px-7 rounded-md text-sm font-bold uppercase tracking-wider transition-all"
              style={{
                background: "#c8f135",
                color: "#0A0A0A",
                fontFamily: "var(--font-display)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f74d")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
            >
              Generate a free brief &mdash; no account required
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — THE MOAT
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#111111" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              WHY THIS BECOMES INFRASTRUCTURE
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              The Bloomberg Terminal for managed services.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "System of Record",
                body: "Stackteryx stores how every service is designed, costed, and priced. Over time, this becomes the institutional memory of your practice \u2014 the one place where your service economics live.",
              },
              {
                title: "Data Network",
                body: "Every service configuration, vendor cost, and margin calculation builds a dataset. As the platform scales, individual MSP data aggregates into industry benchmarks \u2014 cost benchmarks, margin benchmarks, compliance coverage by vertical. The system gets smarter with every user.",
              },
              {
                title: "Intelligence Layer",
                body: "Scout monitors your entire client portfolio. Horizon watches the market. Aria updates compliance scores when your stack changes. The system surfaces insights you didn\u2019t know to look for \u2014 before they become problems.",
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
          SECTION 7 — PRICING
          ═══════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 md:py-32" style={{ background: "#0A0A0A" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              SIMPLE PRICING
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Start free. The system pays for itself.
            </h2>
            <p
              className="text-sm max-w-xl mx-auto"
              style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
            >
              One advisory client covers years of Stackteryx cost.
              Built for MSPs scaling from $1M to $20M ARR.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div
              className="rounded-lg p-6 space-y-5 flex flex-col"
              style={{ background: "#111111", border: "1px solid #1E1E1E" }}
            >
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>Free</h3>
                <p className="text-sm mt-1" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>Get started with the basics</p>
              </div>
              <div>
                <span className="text-4xl font-extrabold" style={{ color: "#FFFFFF", fontFamily: "var(--font-mono-alt)" }}>$0</span>
                <span className="text-sm ml-1" style={{ color: "#666666" }}>/forever</span>
              </div>
              <ul className="space-y-2 flex-1">
                {["2 services", "3 clients", "5 AI generations/month", "CTO brief generator", "Compliance scoring"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}>
                    <span style={{ color: "#c8f135" }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?tab=signup"
                className="h-10 flex items-center justify-center rounded-md text-sm font-bold uppercase tracking-wider transition-all"
                style={{ color: "#FFFFFF", border: "1px solid #333333", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c8f135")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333333")}
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div
              className="rounded-lg p-6 space-y-5 flex flex-col relative"
              style={{ background: "#111111", border: "2px solid #c8f135" }}
            >
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "#c8f135", color: "#0A0A0A", fontFamily: "var(--font-display)" }}
              >
                Most Popular
              </span>
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>Pro</h3>
                <p className="text-sm mt-1" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>For growing MSP practices</p>
              </div>
              <div>
                <span className="text-4xl font-extrabold" style={{ color: "#FFFFFF", fontFamily: "var(--font-mono-alt)" }}>$149</span>
                <span className="text-sm ml-1" style={{ color: "#666666" }}>/month</span>
              </div>
              <ul className="space-y-2 flex-1">
                {["10 services", "15 clients", "40 AI generations/month", "Full proposal engine", "3 team members", "Everything in Free"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}>
                    <span style={{ color: "#c8f135" }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?tab=signup"
                className="h-10 flex items-center justify-center rounded-md text-sm font-bold uppercase tracking-wider transition-all"
                style={{ background: "#c8f135", color: "#0A0A0A", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f74d")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
              >
                Start with Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div
              className="rounded-lg p-6 space-y-5 flex flex-col"
              style={{ background: "#111111", border: "1px solid #1E1E1E" }}
            >
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>Enterprise</h3>
                <p className="text-sm mt-1" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>Full platform, unlimited scale</p>
              </div>
              <div>
                <span className="text-4xl font-extrabold" style={{ color: "#FFFFFF", fontFamily: "var(--font-mono-alt)" }}>$399</span>
                <span className="text-sm ml-1" style={{ color: "#666666" }}>/month</span>
              </div>
              <ul className="space-y-2 flex-1">
                {["Unlimited services", "Unlimited clients", "150 AI generations/month", "QBR generator", "White-label exports", "Unlimited team members", "Everything in Pro"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}>
                    <span style={{ color: "#c8f135" }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?tab=signup"
                className="h-10 flex items-center justify-center rounded-md text-sm font-bold uppercase tracking-wider transition-all"
                style={{ color: "#FFFFFF", border: "1px solid #333333", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c8f135")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333333")}
              >
                Start with Enterprise
              </Link>
            </div>
          </div>

          <p
            className="text-center text-xs"
            style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
          >
            No contracts. Cancel anytime. The free CTO brief generator
            is available to every MSP &mdash; no account required.
          </p>
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
              Three forces are making this the only move.
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
          SECTION 9 — FINAL CTA
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#0A0A0A" }}>
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <h2
            className="text-3xl md:text-[42px] font-extrabold leading-tight"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            The system MSPs should have had all along.
          </h2>
          <p
            className="text-base leading-[1.75] max-w-xl mx-auto"
            style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
          >
            Design a service. Model the margin. Generate the proposal.
            Deliver the advisory. All in one place. All connected.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?tab=signup"
              className="h-11 px-7 flex items-center gap-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all"
              style={{
                background: "#c8f135",
                color: "#0A0A0A",
                fontFamily: "var(--font-display)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f74d")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/fractional-cto"
              className="h-11 px-7 flex items-center gap-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all"
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
              Generate a free CTO brief
            </Link>
          </div>
          <p
            className="text-xs"
            style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
          >
            No credit card required to start. No account required for the CTO brief.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: "1px solid #1E1E1E", background: "#0A0A0A" }} className="py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/stackteryx-logo.svg" alt="Stackteryx" height={20} style={{ height: 20, width: "auto", opacity: 0.6 }} />
            <div className="flex items-center gap-6">
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
                { label: "Free CTO Brief", href: "/fractional-cto" },
                { label: "Log In", href: "/login" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-xs transition-colors"
                  style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#555555")}
                >
                  {label}
                </a>
              ))}
            </div>
            <p className="text-xs" style={{ color: "#333333", fontFamily: "var(--font-mono-alt)" }}>
              &copy; {new Date().getFullYear()} Stackteryx
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
