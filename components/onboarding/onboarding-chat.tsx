"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AgentBadge } from "@/components/agents/agent-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";

interface OnboardingStep {
  id: string;
  question: string;
  type: "choice" | "text" | "multi_choice";
  options?: string[];
  placeholder?: string;
  dbField: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: "service_model",
    question: "How do you currently sell your services?",
    type: "choice",
    options: [
      "Bundled packages \u2014 clients pick a tier",
      "\u00C0 la carte \u2014 clients choose individual services",
      "Mix of both",
      "Still figuring this out",
    ],
    dbField: "sales_model",
  },
  {
    id: "client_verticals",
    question: "What industries do most of your clients work in?",
    type: "multi_choice",
    options: [
      "Healthcare", "Legal", "Finance", "Manufacturing",
      "Retail", "Government", "Education", "Construction", "Mixed",
    ],
    dbField: "target_verticals",
  },
  {
    id: "client_count",
    question: "How many active clients do you manage right now?",
    type: "choice",
    options: ["1\u20135", "6\u201315", "16\u201330", "30+"],
    dbField: "client_count_range",
  },
  {
    id: "team_size",
    question: "How big is your team?",
    type: "choice",
    options: ["Just me", "2\u20135 people", "6\u201315 people", "15+"],
    dbField: "company_size",
  },
  {
    id: "biggest_challenge",
    question: "What\u2019s the hardest part of running your services business right now?",
    type: "choice",
    options: [
      "Knowing if my services are actually profitable",
      "Winning new clients and writing proposals",
      "Delivering strategic advisory at scale",
      "Managing renewals and client retention",
      "Pricing my services confidently",
    ],
    dbField: "additional_context",
  },
  {
    id: "primary_goal",
    question: "What do you most want to get out of Stackteryx?",
    type: "choice",
    options: [
      "See my real service margins for the first time",
      "Build a proper service catalog",
      "Generate better client proposals",
      "Deliver Fractional CTO advisory",
      "Get my whole practice organized",
    ],
    dbField: "primary_goal",
  },
  {
    id: "tool_hint",
    question: "What security tools do you currently resell or use? (name a few \u2014 I\u2019ll find them)",
    type: "text",
    placeholder: "e.g. CrowdStrike, Datto, Microsoft 365...",
    dbField: "tool_hints",
  },
];

interface ChatMessage {
  id: string;
  role: "aria" | "user";
  content: string;
}

interface OnboardingChatProps {
  orgName: string;
  displayName: string;
  orgId: string;
}

export function OnboardingChat({ orgName, displayName, orgId }: OnboardingChatProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "aria",
      content: `Welcome to Stackteryx${displayName ? `, ${displayName}` : ""}. I\u2019m Aria \u2014 I\u2019m going to set up your practice and build your first service before we\u2019re done here.\n\n${STEPS[0].question}`,
    },
  ]);
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const step = STEPS[currentStep];
  const progress = ((currentStep) / STEPS.length) * 100;

  async function saveAnswer(field: string, value: unknown) {
    try {
      const { saveOnboardingChatAnswer } = await import("@/actions/onboarding");
      await saveOnboardingChatAnswer(orgId, field, value);
    } catch {
      // Non-critical — don't block the flow
    }
  }

  async function handleAnswer(answer: string | string[]) {
    const answerText = Array.isArray(answer) ? answer.join(", ") : answer;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: `user-${currentStep}`, role: "user", content: answerText },
    ]);

    setIsProcessing(true);

    // Save to DB
    await saveAnswer(step.dbField, answer);

    const nextStepIndex = currentStep + 1;

    if (nextStepIndex >= STEPS.length) {
      // All questions answered — build the service
      setMessages((prev) => [
        ...prev,
        { id: "building", role: "aria", content: "Working on your practice setup..." },
      ]);

      // Mark onboarding complete (via server action)
      try {
        const { completeOnboardingFromChat } = await import("@/actions/onboarding");
        await completeOnboardingFromChat(orgId);
      } catch {
        // Non-critical
      }

      setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== "building"),
          {
            id: "complete",
            role: "aria",
            content: "Your practice is set up. Your dashboard is ready \u2014 your six AI agents are already working on your portfolio.",
          },
        ]);
        setIsComplete(true);
        setIsProcessing(false);
      }, 2000);
    } else {
      // Generate acknowledgment + next question
      const nextStep = STEPS[nextStepIndex];
      const ack = generateAcknowledgment(step.id, answerText, nextStep.question);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `aria-${nextStepIndex}`, role: "aria", content: ack },
        ]);
        setCurrentStep(nextStepIndex);
        setSelectedMulti([]);
        setTextInput("");
        setIsProcessing(false);
      }, 600);
    }
  }

  function handleMultiConfirm() {
    if (selectedMulti.length > 0) handleAnswer(selectedMulti);
  }

  function handleTextSubmit() {
    if (textInput.trim()) handleAnswer(textInput.trim());
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0A" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b" style={{ borderColor: "#1e1e1e" }}>
        <Image src="/stackteryx-logo.svg" alt="Stackteryx" width={130} height={28} priority />
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Skip setup
        </Link>
      </div>

      {/* Progress */}
      <div className="px-6 pt-4">
        <div className="h-1 rounded-full bg-muted/20 overflow-hidden max-w-md mx-auto">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "#c8f135" }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5" style={{ fontFamily: "var(--font-mono-alt)" }}>
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4">
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === "aria" ? (
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <AgentBadge agentId="aria" size="sm" showTitle={false} />
                  </div>
                  <div
                    className="rounded-lg px-4 py-3 text-sm leading-relaxed"
                    style={{
                      background: "#111111",
                      border: "1px solid #1e1e1e",
                      color: "#cccccc",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <div
                    className="rounded-lg px-4 py-2 text-sm max-w-[80%]"
                    style={{
                      background: "#c8f135",
                      color: "#0A0A0A",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 px-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          )}
        </div>

        {/* Answer input area */}
        {!isProcessing && !isComplete && step && (
          <div className="pb-6 space-y-2">
            {step.type === "choice" && step.options && (
              <div className="grid grid-cols-1 gap-2">
                {step.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className="text-left rounded-lg px-4 py-3 text-sm transition-all"
                    style={{
                      background: "#111111",
                      border: "1px solid #1e1e1e",
                      color: "#cccccc",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#c8f135";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#1e1e1e";
                      e.currentTarget.style.color = "#cccccc";
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {step.type === "multi_choice" && step.options && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {step.options.map((option) => {
                    const selected = selectedMulti.includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          setSelectedMulti((prev) =>
                            selected
                              ? prev.filter((v) => v !== option)
                              : [...prev, option],
                          );
                        }}
                        className="text-left rounded-lg px-3 py-2 text-sm transition-all"
                        style={{
                          background: selected ? "#c8f13520" : "#111111",
                          border: `1px solid ${selected ? "#c8f135" : "#1e1e1e"}`,
                          color: selected ? "#c8f135" : "#cccccc",
                          fontFamily: "var(--font-mono-alt)",
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {selectedMulti.length > 0 && (
                  <Button onClick={handleMultiConfirm} className="w-full">
                    Continue with {selectedMulti.length} selected
                  </Button>
                )}
              </div>
            )}

            {step.type === "text" && (
              <div className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={step.placeholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTextSubmit();
                  }}
                  className="flex-1 bg-background/50"
                />
                <Button
                  size="icon"
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Completion CTA */}
        {isComplete && (
          <div className="pb-6">
            <Button
              className="w-full"
              onClick={() => router.push("/dashboard")}
              style={{ background: "#c8f135", color: "#0A0A0A" }}
            >
              Go to dashboard &rarr;
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple acknowledgment generator — no API call needed for basic transitions
function generateAcknowledgment(stepId: string, answer: string, nextQuestion: string): string {
  const acks: Record<string, (a: string) => string> = {
    service_model: (a) =>
      a.includes("Bundled")
        ? `Bundled is the most scalable approach. ${nextQuestion}`
        : a.includes("la carte")
          ? `\u00C0 la carte gives flexibility but watch your margins. ${nextQuestion}`
          : `Got it. ${nextQuestion}`,
    client_verticals: (a) =>
      a.includes("Healthcare")
        ? `Healthcare means HIPAA compliance is a consistent requirement. That shapes which tools matter most. ${nextQuestion}`
        : a.includes("Finance")
          ? `Financial services clients expect strong security posture. ${nextQuestion}`
          : `Noted. ${nextQuestion}`,
    client_count: () => `${nextQuestion}`,
    team_size: () => `${nextQuestion}`,
    biggest_challenge: (a) =>
      a.includes("profitable")
        ? `Margin visibility is the #1 thing Stackteryx solves. You\u2019ll see your real numbers shortly. ${nextQuestion}`
        : `That\u2019s exactly what we\u2019re building for. ${nextQuestion}`,
    primary_goal: () => `Last question \u2014 ${nextQuestion}`,
  };

  return (acks[stepId]?.(answer)) ?? `${nextQuestion}`;
}
