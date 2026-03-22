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
    desc: "Turns your tools into structured, sellable services.",
  },
  {
    name: "Margin",
    title: "Pricing Analyst",
    color: "#378ADD",
    Icon: TrendingUp,
    desc: "Makes sure every service you sell actually makes money.",
  },
  {
    name: "Scout",
    title: "Portfolio Analyst",
    color: "#5DCAA5",
    Icon: BarChart2,
    desc: "Shows you where clients are at risk \u2014 or ready to grow.",
  },
  {
    name: "Sage",
    title: "Advisory Agent",
    color: "#AFA9EC",
    Icon: Brain,
    desc: "Turns your expertise into a structured advisory offering.",
  },
  {
    name: "Pitch",
    title: "Pre-Sales Agent",
    color: "#F0997B",
    Icon: FileText,
    desc: "Turns your services into clear, outcome-driven proposals.",
  },
  {
    name: "Horizon",
    title: "Market Intelligence",
    color: "#EF9F27",
    Icon: Telescope,
    desc: "Keeps you ahead of what\u2019s changing \u2014 before clients ask.",
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
              BUILT FOR MSPs BUILDING A REAL SECURITY BUSINESS
            </p>
            <h1
              className="landing-fade-in text-4xl md:text-6xl font-extrabold leading-[1.08] tracking-tight"
              style={{
                color: "#FFFFFF",
                animationDelay: "150ms",
                fontFamily: "var(--font-display)",
              }}
            >
              You didn&apos;t mean to build a security practice.
              <br className="hidden md:block" />
              But now you&apos;re running one.
            </h1>
            <p
              className="landing-fade-in text-base md:text-lg mt-6 max-w-xl leading-[1.75]"
              style={{
                color: "#AAAAAA",
                animationDelay: "300ms",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              It started with a few tools. A few client requests.
              Now you&apos;ve got a stack, some recurring revenue &mdash;
              and no clear system behind any of it.
            </p>
            <p
              className="landing-fade-in text-base md:text-lg mt-4 max-w-xl leading-[1.75]"
              style={{
                color: "#AAAAAA",
                animationDelay: "350ms",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              Stackteryx gives you one.
            </p>
            <p
              className="landing-fade-in text-[15px] mt-4 max-w-xl leading-[1.75]"
              style={{
                color: "#AAAAAA",
                animationDelay: "380ms",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              Design your services. Understand your costs.
              Price with confidence. Deliver like a real security business.
            </p>
            <p
              className="landing-fade-in text-[15px] mt-4 font-semibold"
              style={{
                color: "#AAAAAA",
                animationDelay: "400ms",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              This is how you operate a security practice on purpose.
            </p>

            {/* CTA buttons */}
            <div
              className="landing-fade-in mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              style={{ animationDelay: "450ms" }}
            >
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
                Start free &mdash; no card required
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, "how-it-works")}
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
                See how it works
              </a>
            </div>
          </div>

          <div className="landing-fade-in flex-1 w-full max-w-lg lg:max-w-none" style={{ animationDelay: "600ms" }}>
            <HeroGraphic />
          </div>
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
            <p
              className="text-[15px] md:text-[17px] leading-[1.75] max-w-2xl mx-auto"
              style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
            >
              None of these were built to run a security business.
              They track activity. They don&apos;t define what you actually sell,
              what it costs to deliver, or whether it&apos;s built to scale.
            </p>
          </div>

          {/* Three systems */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Your PSA", tools: "ConnectWise, Autotask", what: "Tracks tickets. Not services. Shows what happened \u2014 not what it costs to deliver or how it performs as a business." },
              { title: "Your RMM", tools: "NinjaOne, Automate", what: "Tracks devices. Not outcomes. Doesn\u2019t tell you if your stack actually covers risk \u2014 or leaves gaps." },
              { title: "Your spreadsheet", tools: "Excel, Google Sheets", what: "Tracks assumptions. Breaks the moment vendor pricing shifts, labor changes, or clients scale." },
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

          {/* The gap — Category moment */}
          <div style={{ height: 1, background: "#1E1E1E" }} />

          <div className="text-center space-y-6">
            <p
              className="text-[15px] font-semibold uppercase tracking-wider"
              style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
            >
              What&apos;s missing:
            </p>
            <p
              className="text-xl md:text-2xl font-extrabold"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              A system for running your security business.
            </p>
            <p
              className="text-[15px] md:text-[17px] leading-[1.75] max-w-lg mx-auto"
              style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
            >
              One that connects:
              <br />what you sell &rarr; what it costs &rarr; what it&apos;s actually worth
            </p>
            <p
              className="text-[15px] leading-[1.75] max-w-md mx-auto"
              style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
            >
              Not a spreadsheet. Not a PSA report. Not a vendor dashboard.
              <br />
              A system designed for service economics.
            </p>
            <p
              className="text-[15px] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              For building, pricing, and scaling a security practice &mdash; on purpose.
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
              Build a security business you can actually operate.
              <br className="hidden md:block" />
              Not just a stack you hope is profitable.
            </h2>
            <p
              className="text-[15px] md:text-[17px] leading-[1.75] max-w-2xl mx-auto"
              style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
            >
              This is the system behind every service you sell:
            </p>
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
                desc: "Start with what the client actually buys: risk reduction, compliance, resilience.\n\nNot the tools. The outcome.",
              },
              {
                step: "02",
                label: "Service",
                desc: "Define how you deliver that outcome. Standardize it. Package it. Make it repeatable across clients.",
              },
              {
                step: "03",
                label: "Stack",
                desc: "Map tools to what actually matters. Remove overlap. Find gaps. Build a stack that supports the business \u2014 not the other way around.",
              },
              {
                step: "04",
                label: "Cost",
                desc: "See the real cost of delivery: tools, labor, overhead \u2014 all in one place.\n\nNo guessing. No surprises.",
              },
              {
                step: "05",
                label: "Price",
                desc: "Set pricing that actually works. Margin-aware. Defensible. Scalable.\n\nEvery service. Every client. Every time.",
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
                  className="text-[14px] leading-[1.7] whitespace-pre-line"
                  style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <p
            className="text-center text-[15px] font-semibold"
            style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
          >
            This isn&apos;t pricing. It&apos;s operating your service business with real economics.
          </p>
        </div>
      </section>

      {/* ── Service economics model line ──────────────────────── */}
      <div className="py-12" style={{ background: "#0A0A0A" }}>
        <p
          className="text-center text-[15px] tracking-[0.15em]"
          style={{ color: "#777777", fontFamily: "var(--font-mono-alt)" }}
        >
          Outcome &rarr; Service &rarr; Stack &rarr; Cost &rarr; Price
        </p>
      </div>

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
              Six agents. Running the business behind your services.
            </h2>
            <p
              className="text-[15px] md:text-[17px] leading-[1.75] max-w-2xl mx-auto"
              style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
            >
              Designing. Pricing. Monitoring. Advising.
              <br /><br />
              Not as tools you use &mdash;
              but as a system that runs continuously behind your practice.
              So you can operate like a security business, not react like a service provider.
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
                style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
              >
                MSPs using Stackteryx charge $500&ndash;$1,000 per month per
                client for quarterly technology strategy briefings &mdash;
                executive-ready reports covering industry risk, technology
                radar, and a 12-month planning outlook.
              </p>
              <p
                className="text-[15px] leading-[1.75]"
                style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
              >
                Sage generates each brief automatically. Enter the client&apos;s
                domain. Hit generate. Branded PDF ready in under 60 seconds.
              </p>
              <p
                className="text-[15px] leading-[1.75]"
                style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
              >
                Ten clients. $120,000 in new annual recurring revenue.
                No new hires. No new tools. Just a service you were
                never set up to deliver before.
              </p>
              <p
                className="text-[15px] leading-[1.75]"
                style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
              >
                Now it&apos;s structured. Repeatable. Productized inside a system.
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
          SECTION 6 — THE SHIFT
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#111111" }}>
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <p
            className="text-[11px] uppercase tracking-[0.3em] font-semibold"
            style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
          >
            THE SHIFT
          </p>
          <h2
            className="text-3xl md:text-[42px] font-extrabold leading-tight"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            You&apos;re already doing the work.
          </h2>
          <p
            className="text-[15px] md:text-[17px] leading-[1.85] max-w-xl mx-auto"
            style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
          >
            You have the tools. You have the clients. You have the expertise.
            <br /><br />
            What you don&apos;t have &mdash; is a system connecting it all.
            <br /><br />
            Stackteryx turns what you&apos;ve built into something intentional.
            A security business that&apos;s designed, priced, and operated on purpose.
          </p>
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
              PRICING
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Start building your security business &mdash; today.
            </h2>
            <p
              className="text-[15px] md:text-[17px] leading-[1.75] max-w-xl mx-auto"
              style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
            >
              Not in theory. In real services, real pricing, real numbers.
              <br /><br />
              See your stack. Model your cost. Build something you can actually scale.
              <br />
              No setup. No rebuilding. Just clarity &mdash; immediately.
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
                <p className="text-xs mt-1" style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}>7-day free trial &middot; no card required</p>
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
                <p className="text-xs mt-1" style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}>7-day free trial &middot; no card required</p>
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
                {[
                  { label: "QBR Generator", soon: true },
                  { label: "Client Scorecards", soon: true },
                  { label: "Portfolio Intelligence", soon: false },
                  { label: "White-label exports", soon: false },
                  { label: "Team workflows", soon: true },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm" style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}>
                    <span>&#10003;</span> {f.label}
                    {f.soon && (
                      <span style={{ fontSize: 10, background: "#1a1a1a", border: "1px solid #333", color: "#888", padding: "2px 6px", borderRadius: 4 }}>
                        Soon
                      </span>
                    )}
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
          SECTION 8 — WHY NOW (no changes)
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
            The business you&apos;re already running
            deserves to be designed on purpose.
          </h2>
          <p
            className="text-base md:text-[17px] leading-[1.75] max-w-xl mx-auto"
            style={{ color: "#AAAAAA", fontFamily: "var(--font-mono-alt)" }}
          >
            You don&apos;t need more tools.
            <br /><br />
            You need a system.
          </p>
          <div>
            <Link
              href="/login?tab=signup"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-md text-sm font-bold uppercase tracking-wider transition-all"
              style={{
                background: "#c8f135",
                color: "#0A0A0A",
                fontFamily: "var(--font-display)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f74d")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
            >
              Start free &mdash; no card required
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p
            className="text-xs"
            style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
          >
            No contracts. Cancel anytime. Your data is yours.
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
            <div className="flex items-center gap-6">
              {[
                { label: "Terms of Service", href: "/terms" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Contact", href: "mailto:support@stackteryx.com" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-xs transition-colors"
                  style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#999999")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
                >
                  {label}
                </a>
              ))}
              <p className="text-xs" style={{ color: "#333333", fontFamily: "var(--font-mono-alt)" }}>
                &copy; {new Date().getFullYear()} Stackteryx. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
