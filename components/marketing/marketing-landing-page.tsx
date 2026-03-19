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
              BUILT FOR MSP AND MSSP SERVICE BUSINESSES
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
              Finally know what your services actually cost to deliver.
              Price them profitably. Walk into every client meeting with
              materials that make you look like the most strategic MSP
              in the room.
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
            Used by MSPs who are done guessing at margins and ready
            to build a practice that actually scales.
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
              SOUND FAMILIAR?
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Your PSA tracks tickets. Your RMM tracks devices.
              Neither one tells you if you&apos;re making money.
            </h2>
          </div>

          {/* Three systems */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Your PSA", tools: "ConnectWise, Autotask", what: "Tells you what broke and when it was fixed. Doesn\u2019t tell you what that service costs to deliver or whether the contract is profitable." },
              { title: "Your RMM", tools: "NinjaOne, Automate", what: "Tells you what\u2019s running across your client base. Doesn\u2019t tell you whether your stack is covering your compliance obligations or leaving gaps." },
              { title: "Your spreadsheet", tools: "Excel, Google Sheets", what: "Tells you what you think you\u2019re charging. Doesn\u2019t account for vendor price changes, seat overages, or what you actually spend on labor." },
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
              What&apos;s missing:
            </p>
            <p
              className="text-[15px] md:text-base leading-[1.75] max-w-2xl mx-auto"
              style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
            >
              A single place where your services are designed,
              your costs are modeled, and your margins are real.
            </p>
            <p
              className="text-xl md:text-2xl font-extrabold"
              style={{ color: "#c8f135", fontFamily: "var(--font-display)" }}
            >
              That&apos;s what Stackteryx is.
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
              HOW IT WORKS
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Design a service in minutes.
              Know your margin before you quote.
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
                desc: "Start with the business result your client is actually buying \u2014 reduced risk, regulatory compliance, operational resilience. Not the tools. The outcome.",
              },
              {
                step: "02",
                label: "Service",
                desc: "Define what you deliver. What\u2019s included. What the client gets. Build it once, deploy it to every client who fits the profile.",
              },
              {
                step: "03",
                label: "Stack",
                desc: "Add the vendor tools that power the service. Stackteryx pulls in your real costs \u2014 no estimates, no guesses.",
              },
              {
                step: "04",
                label: "Cost",
                desc: "See exactly what this service costs to deliver \u2014 tools, labor, overhead, all together for the first time. This is the number most MSPs have never seen.",
              },
              {
                step: "05",
                label: "Price",
                desc: "Set a price that hits your target margin. Know what you make before the proposal goes out. Every time, on every deal.",
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
            Once your services are built, the platform keeps working &mdash;
            monitoring your clients, flagging risks, and surfacing
            opportunities you&apos;d otherwise miss.
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
              YOUR AI TEAM
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Six agents handling the work that used to eat your week.
            </h2>
            <p
              className="text-[15px] leading-[1.75] max-w-2xl mx-auto"
              style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
            >
              Every part of Stackteryx is powered by a named AI agent
              with a specific job. They don&apos;t need to be asked. They run
              in the background &mdash; designing, pricing, writing, monitoring,
              and advising &mdash; so you can spend your time on clients,
              not admin.
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

          <p
            className="text-center text-sm font-semibold"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-mono-alt)" }}
          >
            Your competitors are still doing this manually.
          </p>
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
              THE MATH
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              One new service line. Real numbers.
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
                MSPs using Stackteryx charge $500&ndash;$1,000 per month per
                client for quarterly technology strategy briefings &mdash;
                executive-ready reports covering industry risk, technology
                radar, and a 12-month planning outlook.
              </p>
              <p
                className="text-[15px] leading-[1.75]"
                style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
              >
                Sage generates each brief automatically. Enter the client&apos;s
                domain. Hit generate. Branded PDF ready in under 60 seconds.
              </p>
              <p
                className="text-[15px] leading-[1.75]"
                style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
              >
                Ten clients. $120,000 in new annual recurring revenue.
                No new hires. No new tools. Just a service you were
                never set up to deliver before.
              </p>
            </div>

            {/* Value stats */}
            <div className="grid grid-cols-3 gap-6 pt-6" style={{ borderTop: "1px solid #1E1E1E" }}>
              {[
                { value: "< 60 seconds", label: "Per brief" },
                { value: "$500\u2013$1,000/mo", label: "Per client" },
                { value: "$0", label: "Extra headcount" },
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
              Generate a free brief for one of your clients
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
              WHY MSPS DON&apos;T LEAVE
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              After 90 days, this becomes how you run your practice.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Your services live here",
                body: "Every service you\u2019ve designed, every margin you\u2019ve modeled, every proposal you\u2019ve generated \u2014 it\u2019s all here. Your institutional knowledge, structured and searchable. Not in someone\u2019s head or a shared drive no one updates.",
              },
              {
                title: "Your clients are monitored",
                body: "Scout watches every client in your portfolio. Renewal coming up? Scout flags it. Client missing a compliance framework? Scout flags it. Upsell opportunity sitting in plain sight? Scout surfaces it. You stop reacting and start anticipating.",
              },
              {
                title: "Your practice keeps learning",
                body: "The more you use Stackteryx, the smarter it gets about your practice. Which tool combinations you build most. Which margins perform best. Which client profiles match your highest-value services. The system builds on itself.",
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
        <div className="max-w-4xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              7-DAY FREE TRIAL
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Start free. Scale when you&apos;re ready.
            </h2>
            <p
              className="text-sm max-w-xl mx-auto"
              style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
            >
              Every plan starts with a 7-day free trial &mdash; full Pro access, no card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pro */}
            <div
              className="rounded-lg p-6 space-y-5 flex flex-col"
              style={{ background: "#111111", border: "1px solid #1E1E1E" }}
            >
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>Pro</h3>
                <p className="text-sm mt-1" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>
                  For solo MSPs running a real services practice.
                </p>
              </div>
              <div>
                <span className="text-4xl font-extrabold" style={{ color: "#FFFFFF", fontFamily: "var(--font-mono-alt)" }}>$149</span>
                <span className="text-sm ml-1" style={{ color: "#666666" }}>/month</span>
                <p className="text-xs mt-1" style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}>after your free trial</p>
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}>
                  Usage limits
                </p>
                {[
                  ["Services", "10"],
                  ["Clients", "15"],
                  ["AI / month", "40"],
                  ["Exports / month", "20"],
                  ["CTO briefs", "10 / month"],
                  ["Team members", "3"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm" style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}>
                    <span>{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/login?tab=signup"
                className="h-10 flex items-center justify-center rounded-md text-sm font-bold uppercase tracking-wider transition-all"
                style={{ color: "#FFFFFF", border: "1px solid #333333", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c8f135")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333333")}
              >
                Start free trial
              </Link>
            </div>

            {/* Enterprise */}
            <div
              className="rounded-lg p-6 space-y-5 flex flex-col relative"
              style={{ background: "#111111", border: "2px solid #c8f135" }}
            >
              <span
                className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "#c8f135", color: "#0A0A0A", fontFamily: "var(--font-display)" }}
              >
                Best Value
              </span>
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}>Enterprise</h3>
                <p className="text-sm mt-1" style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}>
                  For growing teams delivering advisory at scale.
                </p>
              </div>
              <div>
                <span className="text-4xl font-extrabold" style={{ color: "#FFFFFF", fontFamily: "var(--font-mono-alt)" }}>$399</span>
                <span className="text-sm ml-1" style={{ color: "#666666" }}>/month</span>
                <p className="text-xs mt-1" style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}>after your free trial</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}>
                  Usage limits
                </p>
                {[
                  ["Services", "Unlimited"],
                  ["Clients", "Unlimited"],
                  ["AI / month", "150"],
                  ["Exports / month", "75"],
                  ["CTO briefs", "Unlimited"],
                  ["Team members", "Unlimited"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm" style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}>
                    <span>{label}</span>
                    <span className="font-medium" style={{ color: value === "Unlimited" ? "#c8f135" : "#FFFFFF" }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 space-y-2 flex-1" style={{ borderTop: "1px solid #1e1e1e" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}>
                  Premium features
                </p>
                {["QBR Generator", "Client Scorecards", "Portfolio Intelligence", "White-label exports", "Team workflows"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm" style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}>
                    <span>&#10003;</span> {f}
                  </div>
                ))}
              </div>
              <Link
                href="/login?tab=signup"
                className="h-10 flex items-center justify-center rounded-md text-sm font-bold uppercase tracking-wider transition-all"
                style={{ background: "#c8f135", color: "#0A0A0A", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f74d")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
              >
                Start free trial
              </Link>
            </div>
          </div>

          <p
            className="text-center text-xs"
            style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
          >
            Both plans start with a 7-day free trial. No card required. Cancel anytime.
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
              The MSPs growing right now are making this shift.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "AI is changing what clients expect",
                body: "Your clients are reading about AI every week. They\u2019re going to ask their MSP what it means for their business. The MSPs who can answer that question \u2014 with a strategy brief, a roadmap, a quarterly review \u2014 are the ones who retain those clients.",
              },
              {
                title: "Tool-based selling is a race to the bottom",
                body: "When your proposal leads with CrowdStrike and Datto, you\u2019re selling tools. Your competitor sells the same tools. The MSPs winning are the ones who sell outcomes \u2014 risk reduction, compliance, resilience \u2014 and use tools to deliver them.",
              },
              {
                title: "Compliance is creating new revenue",
                body: "CMMC, HIPAA updates, PCI DSS v4.0 \u2014 every new compliance requirement is a service opportunity for MSPs who can credibly deliver against it. Stackteryx maps your stack to these frameworks automatically so you always know where you stand and what to sell.",
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
            Stop guessing. Start building services that actually pay.
          </h2>
          <p
            className="text-base leading-[1.75] max-w-xl mx-auto"
            style={{ color: "#999999", fontFamily: "var(--font-mono-alt)" }}
          >
            Design your first service with real cost modeling.
            Generate a proposal your client will actually read.
            Deliver advisory that makes you look like a strategic partner,
            not a support desk.
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
              Try the free CTO brief
            </Link>
          </div>
          <p
            className="text-xs"
            style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
          >
            Free to start. No credit card. The CTO brief works
            with no account at all &mdash; just your client&apos;s domain.
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
