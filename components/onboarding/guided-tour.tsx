"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TOUR_STEPS } from "@/lib/onboarding-tour";
import { markTourCompleted } from "@/actions/onboarding";

interface GuidedTourProps {
  active: boolean;
  onComplete: () => void;
}

export function GuidedTour({ active, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const step = TOUR_STEPS[currentStep];

  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // Measure target on step change + resize
  useEffect(() => {
    if (!active || !step) return;

    // Find and scroll to target
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Wait for scroll then measure
      const timer = setTimeout(() => {
        setTargetRect(el.getBoundingClientRect());
      }, 400);

      // Observe resize
      observerRef.current = new ResizeObserver(() => {
        setTargetRect(el.getBoundingClientRect());
      });
      observerRef.current.observe(el);

      return () => {
        clearTimeout(timer);
        observerRef.current?.disconnect();
      };
    } else {
      // Target not found — skip this step
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        completeTour();
      }
    }
  }, [active, currentStep, step]);

  // Recalculate on window resize
  useEffect(() => {
    if (!active) return;
    const handler = () => measureTarget();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [active, measureTarget]);

  function completeTour() {
    onComplete();
    markTourCompleted().catch(() => {});
  }

  function handleNext() {
    if (currentStep >= TOUR_STEPS.length - 1) {
      completeTour();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  if (!active || !step || !targetRect) return null;

  // Tooltip positioning
  const GAP = 16;
  const TOOLTIP_W = 320;
  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    width: TOOLTIP_W,
    zIndex: 10000,
  };

  if (step.position === "right") {
    tooltipStyle.left = targetRect.right + GAP;
    tooltipStyle.top = targetRect.top;
    // If off-screen right, flip to bottom
    if (targetRect.right + GAP + TOOLTIP_W > window.innerWidth) {
      tooltipStyle.left = targetRect.left;
      tooltipStyle.top = targetRect.bottom + GAP;
    }
  } else if (step.position === "left") {
    tooltipStyle.left = targetRect.left - TOOLTIP_W - GAP;
    tooltipStyle.top = targetRect.top;
    if (tooltipStyle.left < 0) {
      tooltipStyle.left = targetRect.left;
      tooltipStyle.top = targetRect.bottom + GAP;
    }
  } else if (step.position === "bottom") {
    tooltipStyle.left = targetRect.left;
    tooltipStyle.top = targetRect.bottom + GAP;
  } else {
    tooltipStyle.left = targetRect.left;
    tooltipStyle.top = targetRect.top - GAP;
    tooltipStyle.transform = "translateY(-100%)";
  }

  return (
    <>
      {/* Spotlight cutout — creates hole in backdrop via box-shadow */}
      <div
        style={{
          position: "fixed",
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          borderRadius: 8,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75)",
          zIndex: 9999,
          pointerEvents: "none",
          border: "2px solid #c8f135",
          transition: "all 0.3s ease",
        }}
      />

      {/* Tooltip */}
      <div
        style={{
          ...tooltipStyle,
          background: "#111111",
          border: "1px solid #1e1e1e",
          borderRadius: 10,
          padding: "20px 24px",
        }}
      >
        {/* Step counter */}
        <p
          style={{
            fontSize: 11,
            color: "#c8f135",
            fontFamily: "var(--font-mono-alt)",
            marginBottom: 8,
          }}
        >
          Step {currentStep + 1} of {TOUR_STEPS.length}
        </p>

        {/* Title */}
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "var(--font-display)",
            marginBottom: 8,
          }}
        >
          {step.title}
        </h3>

        {/* Body */}
        <p
          style={{
            fontSize: 14,
            color: "#888888",
            fontFamily: "var(--font-mono-alt)",
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          {step.body}
        </p>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i <= currentStep ? "#c8f135" : "#333333",
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={completeTour}
            style={{
              fontSize: 12,
              color: "#555555",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono-alt)",
            }}
          >
            Skip tour
          </button>
          <button
            onClick={handleNext}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0A0A0A",
              background: "#c8f135",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
            }}
          >
            {step.ctaLabel}
          </button>
        </div>
      </div>
    </>
  );
}
