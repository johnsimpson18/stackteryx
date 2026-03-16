"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Loader2, Download, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BriefOutputDisplay } from "@/components/fractional-cto/brief-output";
import {
  generateCTOBrief,
  exportBriefPdfAction,
  exportBriefDocxAction,
} from "@/actions/fractional-cto";
import { captureFreeLead } from "@/actions/free-tool";
import type { BriefOutput } from "@/actions/fractional-cto";

// ── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Healthcare",
  "Financial Services",
  "Legal",
  "Manufacturing",
  "Professional Services",
  "Retail",
  "Education",
  "Government",
  "Technology",
  "Other",
] as const;

const COMPANY_SIZES = [
  "1\u201350 employees",
  "51\u2013200 employees",
  "201\u2013500 employees",
  "500+ employees",
] as const;

const CONCERNS = [
  "Cybersecurity Risk",
  "AI & Automation",
  "Compliance & Governance",
  "Operational Resilience",
  "Digital Transformation",
] as const;

const PROGRESS_MESSAGES = [
  "Analyzing technology signals for {domain}...",
  "Assessing industry risk landscape...",
  "Building technology radar...",
  "Preparing your executive brief...",
] as const;

type Step = "capture" | "intake" | "generating" | "output";

// ── Component ────────────────────────────────────────────────────────────────

export function FractionalCTOClient() {
  // Step state
  const [step, setStep] = useState<Step>("capture");

  // Lead capture state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Form state
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [concern, setConcern] = useState("");
  const [mspName, setMspName] = useState("");

  // Generation state
  const [isPending, startTransition] = useTransition();
  const [brief, setBrief] = useState<BriefOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);

  // Export state
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // Refs
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Progress rotation during generation
  useEffect(() => {
    if (!isPending) return;
    setProgressIdx(0);
    const interval = setInterval(() => {
      setProgressIdx((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPending]);

  // Scroll to result after generation
  useEffect(() => {
    if (brief && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [brief]);

  // Sync step with generation state
  useEffect(() => {
    if (brief) setStep("output");
  }, [brief]);

  useEffect(() => {
    if (isPending) setStep("generating");
  }, [isPending]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function handleCaptureSubmit() {
    if (!isValidEmail) return;

    // Fire and forget — don't block on lead capture
    captureFreeLead({
      email,
      firstName: firstName || undefined,
      companyName: companyName || undefined,
      clientDomain: "",
    });

    // Pre-fill MSP name from company name
    if (companyName && !mspName) {
      setMspName(companyName);
    }

    setStep("intake");
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  const canSubmit =
    domain.trim().length > 0 &&
    industry.length > 0 &&
    companySize.length > 0 &&
    mspName.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;

    setError(null);
    setBrief(null);

    // Update the lead with the domain they entered (fire and forget)
    if (email) {
      captureFreeLead({
        email,
        firstName: firstName || undefined,
        companyName: companyName || undefined,
        clientDomain: domain.trim(),
      });
    }

    startTransition(async () => {
      try {
        const result = await generateCTOBrief({
          domain: domain.trim(),
          industry,
          companySize,
          primaryConcern: concern || undefined,
          mspName: mspName.trim(),
        });
        setBrief(result);
      } catch (err) {
        setStep("intake");
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate brief. Please try again.",
        );
      }
    });
  }

  async function handleExportPdf() {
    if (!brief) return;
    setExportingPdf(true);
    try {
      const { base64, filename } = await exportBriefPdfAction(brief);
      downloadBase64(base64, filename, "application/pdf");
    } catch {
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportDocx() {
    if (!brief) return;
    setExportingDocx(true);
    try {
      const { base64, filename } = await exportBriefDocxAction(brief);
      downloadBase64(
        base64,
        filename,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    } catch {
      setError("Failed to generate document. Please try again.");
    } finally {
      setExportingDocx(false);
    }
  }

  return (
    <div className="app-grid-bg">
      {/* ── Section 1: Hero ──────────────────────────────────────────────── */}
      <section className="px-6 pt-20 pb-16 text-center max-w-3xl mx-auto">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Generate a Free Technology Strategy Brief
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Deliver executive-level technology advisory to your clients — powered
          by AI, ready in seconds.
        </p>
        <button
          type="button"
          onClick={() =>
            formRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Get Started
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      {/* ── Step 1: Lead Capture ─────────────────────────────────────────── */}
      {step === "capture" && (
        <section
          ref={formRef}
          className="px-6 pb-20 max-w-xl mx-auto scroll-mt-20"
        >
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Generate Your Free Technology Strategy Brief
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your details to generate a client-ready executive advisory
                report. Powered by AI. Ready in seconds. No credit card required.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capture-email">Your email address *</Label>
              <Input
                id="capture-email"
                type="email"
                placeholder="you@yourmsp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capture-name">Your first name</Label>
              <Input
                id="capture-name"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capture-company">Your company name (MSP)</Label>
              <Input
                id="capture-company"
                placeholder="Acme IT Solutions"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              By continuing, you agree to receive occasional product updates from
              Stackteryx. Unsubscribe at any time.
            </p>

            <Button
              onClick={handleCaptureSubmit}
              disabled={!isValidEmail}
              className="w-full"
              size="lg"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* ── Step 2: Intake Form ──────────────────────────────────────────── */}
      {(step === "intake" || step === "generating") && (
        <section
          ref={formRef}
          className="px-6 pb-20 max-w-xl mx-auto scroll-mt-20"
        >
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("capture")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Brief Details
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Fill in your client details and we&apos;ll generate a tailored
                  Technology Strategy Brief.
                </p>
              </div>
            </div>

            {/* Client Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain">Client Domain *</Label>
              <Input
                id="domain"
                placeholder="acmecorp.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label>Industry *</Label>
              <Select
                value={industry}
                onValueChange={setIndustry}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company Size */}
            <div className="space-y-2">
              <Label>Company Size *</Label>
              <Select
                value={companySize}
                onValueChange={setCompanySize}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Primary Technology Concern */}
            <div className="space-y-2">
              <Label>Primary Technology Concern</Label>
              <Select
                value={concern}
                onValueChange={setConcern}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {CONCERNS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* MSP Name */}
            <div className="space-y-2">
              <Label htmlFor="mspName">Your Company Name (MSP) *</Label>
              <Input
                id="mspName"
                placeholder="Your MSP Name"
                value={mspName}
                onChange={(e) => setMspName(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isPending}
              className="w-full"
              size="lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Technology Strategy Brief
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Progress messages */}
            {isPending && (
              <div className="text-center">
                <p className="text-sm text-primary/80 animate-pulse">
                  {PROGRESS_MESSAGES[progressIdx].replace(
                    "{domain}",
                    domain.trim() || "client",
                  )}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section 3: Report Output ─────────────────────────────────────── */}
      {brief && (
        <section
          ref={resultRef}
          className="px-6 pb-20 max-w-4xl mx-auto scroll-mt-20"
        >
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            {/* Export buttons */}
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={exportingPdf}
              >
                {exportingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDocx}
                disabled={exportingDocx}
              >
                {exportingDocx ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                Download Word Document
              </Button>
            </div>

            <BriefOutputDisplay brief={brief} />
          </div>

          {/* ── Conversion CTA ───────────────────────────────────────────── */}
          <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8 space-y-4">
            <p className="text-sm text-foreground leading-relaxed">
              You just generated a Technology Strategy Brief for{" "}
              <span className="font-semibold text-primary">
                {brief.clientDomain}
              </span>
              .
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deliver this to your client as your first Fractional CTO
              engagement — then unlock quarterly advisory, QBR-ready reports,
              and roadmap tracking inside Stackteryx.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild>
                <Link href="/login?tab=signup">
                  Unlock Fractional CTO in Stackteryx
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="#how-it-works">Learn More</a>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Utilities ────────────────────────────────────────────────────────────────

function downloadBase64(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
