"use client";

import Link from "next/link";
import {
  ArrowRight, Brain, TrendingDown, Table, Target, Wrench,
  Package, DollarSign, FileText, BarChart2, Sparkles,
} from "lucide-react";
import { HeroGraphic } from "./hero-graphic";

/* ─────────────────────────────────────────────────────────────
   STACKTERYX MARKETING LANDING PAGE
   All marketing sections extracted from the monolithic login page.
   ───────────────────────────────────────────────────────────── */

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
              THE SERVICE ECONOMICS PLATFORM FOR MSPS
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
              Most MSPs price services on gut instinct and track margins in Excel.
              Stackteryx replaces the guesswork with real unit economics — so every
              service you sell is profitable by design.
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

            {/* Credibility line */}
            <p
              className="landing-fade-in mt-12 text-[13px]"
              style={{
                color: "#444444",
                animationDelay: "550ms",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              Free forever for one service. No credit card required.
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
          SECTION 2 — THE PAIN
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-24 md:py-32">
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
            <div
              className="rounded-lg p-6 text-left space-y-3"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center"
                style={{ background: "#c8f13510" }}
              >
                <TrendingDown className="h-5 w-5" style={{ color: "#c8f135" }} />
              </div>
              <h3
                className="text-base font-bold"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                &ldquo;Are we actually making money on this client?&rdquo;
              </h3>
              <p
                className="text-[15px] leading-[1.7]"
                style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
              >
                You won the deal, but vendor costs crept up and scope expanded.
                Six months later you&apos;re not sure the service is still profitable.
              </p>
            </div>

            <div
              className="rounded-lg p-6 text-left space-y-3"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center"
                style={{ background: "#c8f13510" }}
              >
                <Table className="h-5 w-5" style={{ color: "#c8f135" }} />
              </div>
              <h3
                className="text-base font-bold"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                &ldquo;Let me find the right spreadsheet...&rdquo;
              </h3>
              <p
                className="text-[15px] leading-[1.7]"
                style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
              >
                Pricing lives in a spreadsheet. Proposals live in another.
                Cost data lives in a third. None of them agree.
              </p>
            </div>

            <div
              className="rounded-lg p-6 text-left space-y-3"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center"
                style={{ background: "#c8f13510" }}
              >
                <Target className="h-5 w-5" style={{ color: "#c8f135" }} />
              </div>
              <h3
                className="text-base font-bold"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                &ldquo;How do we differentiate from the MSP down the road?&rdquo;
              </h3>
              <p
                className="text-[15px] leading-[1.7]"
                style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
              >
                Every competitor sells &ldquo;managed security.&rdquo; Without
                outcome-based positioning, you&apos;re competing on price alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — THE BIG IDEA (interstitial)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-24" style={{ background: "#0A0A0A" }}>
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
            place — then uses AI to help you build, price, and sell services that
            actually make money.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — SPREADSHEET VS STACKTERYX
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-5">
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
            >
              THE COMPARISON
            </p>
            <h2
              className="text-3xl md:text-[42px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Spreadsheet vs. Stackteryx
            </h2>
          </div>

          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid #1E1E1E" }}
          >
            <table className="w-full" style={{ fontFamily: "var(--font-mono-alt)" }}>
              <thead>
                <tr style={{ background: "#0A0A0A" }}>
                  <th
                    className="text-left px-5 py-3 text-xs uppercase tracking-wider font-bold"
                    style={{ color: "#666666" }}
                  >
                    Capability
                  </th>
                  <th
                    className="text-center px-5 py-3 text-xs uppercase tracking-wider font-bold"
                    style={{ color: "#666666" }}
                  >
                    Spreadsheet
                  </th>
                  <th
                    className="text-center px-5 py-3 text-xs uppercase tracking-wider font-bold"
                    style={{ color: "#c8f135" }}
                  >
                    Stackteryx
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Live unit-cost margins", false, true],
                  ["Outcome-based service design", false, true],
                  ["One-click proposal generation", false, true],
                  ["Multi-tier pricing engine", false, true],
                  ["AI technology advisory", false, true],
                  ["Portfolio-wide profitability view", false, true],
                  ["Client compliance scoring", false, true],
                ].map(([label, spreadsheet, stx], i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? "#111111" : "#0A0A0A",
                      borderTop: "1px solid #1E1E1E",
                    }}
                  >
                    <td className="px-5 py-3 text-[15px]" style={{ color: "#CCCCCC" }}>
                      {label as string}
                    </td>
                    <td className="text-center px-5 py-3 text-[14px]" style={{ color: "#EF4444" }}>
                      {spreadsheet ? "\u2713" : "\u2717"}
                    </td>
                    <td className="text-center px-5 py-3 text-[14px]" style={{ color: "#c8f135" }}>
                      {stx ? "\u2713" : "\u2717"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              Four steps to profitable services
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Define the Outcome", desc: "Start with the business problem your service solves \u2014 not the tools in the stack.", Icon: Target },
              { step: "02", title: "Build the Stack", desc: "Add vendor tools, set unit costs, and let the pricing engine calculate margins automatically.", Icon: Wrench },
              { step: "03", title: "Price with Confidence", desc: "Multi-tier pricing (Good / Better / Best) with real-time margin visibility on every tier.", Icon: DollarSign },
              { step: "04", title: "Sell and Deliver", desc: "Generate branded proposals, track contracts, and monitor profitability across your portfolio.", Icon: FileText },
            ].map(({ step, title, desc, Icon }) => (
              <div
                key={step}
                className="rounded-lg p-6 space-y-3"
                style={{ background: "#111111", border: "1px solid #1E1E1E" }}
              >
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
                >
                  STEP {step}
                </span>
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
          SECTION 7 — WHAT'S INSIDE
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
              Everything you need to run profitable services
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { Icon: Package, title: "Service Builder", desc: "Define services around business outcomes, not tools. Structure what you sell and why it matters." },
              { Icon: Wrench, title: "Bundle Configurator", desc: "Assemble vendor tools into service bundles with per-unit cost tracking built in." },
              { Icon: DollarSign, title: "Pricing Engine", desc: "Good / Better / Best tiers with real-time margin calculations. No more guesswork." },
              { Icon: FileText, title: "Sales Studio", desc: "Generate branded, client-ready proposals in seconds \u2014 pre-filled with your pricing and positioning." },
              { Icon: Brain, title: "Fractional CTO", desc: "AI-generated Technology Strategy Briefs that position you as a strategic advisor." },
              { Icon: BarChart2, title: "Portfolio Intelligence", desc: "See profitability across every client and service. Spot margin erosion before it hurts." },
              { Icon: Sparkles, title: "AI Service Architect", desc: "Describe what you want to build \u2014 AI structures the service, suggests tools, and sets pricing." },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-lg p-5 space-y-3 transition-colors"
                style={{ background: "#111111", border: "1px solid #1E1E1E" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c8f13540")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1E1E1E")}
              >
                <div
                  className="h-9 w-9 rounded-md flex items-center justify-center"
                  style={{ background: "#c8f13510" }}
                >
                  <Icon className="h-4.5 w-4.5" style={{ color: "#c8f135" }} />
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
          SECTION 8 — PRICING
          ═══════════════════════════════════════════════════════ */}
      <section id="pricing" style={{ background: "#111111" }} className="py-24 md:py-32">
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
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
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
              style={{ background: "#0A0A0A", border: "2px solid #c8f135" }}
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
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
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
          SECTION 9 — FINAL CTA
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
                The service economics platform for MSPs.
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
