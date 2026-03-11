"use client";

import { useState, useCallback } from "react";
import { OnboardingModal } from "./onboarding-modal";
import type { OnboardingProfile, OnboardingToolSelection } from "@/lib/types";

interface OnboardingGateProps {
  children: React.ReactNode;
  onboardingComplete: boolean;
  orgId: string;
  defaultOrgName: string;
  defaultDisplayName: string;
  savedProfile: OnboardingProfile | null;
  savedStep: number;
  savedTools: OnboardingToolSelection[];
}

export function OnboardingGate({
  children,
  onboardingComplete,
  orgId,
  defaultOrgName,
  defaultDisplayName,
  savedProfile,
  savedStep,
  savedTools,
}: OnboardingGateProps) {
  const [completed, setCompleted] = useState(onboardingComplete);

  const handleComplete = useCallback(() => {
    setCompleted(true);
  }, []);

  if (completed) return <>{children}</>;

  return (
    <div className="relative">
      {/* The real platform — visible but blurred and non-interactive */}
      <div
        aria-hidden="true"
        style={{
          filter: "blur(6px)",
          opacity: 0.4,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {children}
      </div>

      {/* The gate modal — centered, sits above the blur */}
      <OnboardingModal
        orgId={orgId}
        defaultOrgName={defaultOrgName}
        defaultDisplayName={defaultDisplayName}
        savedProfile={savedProfile}
        savedStep={savedStep}
        savedTools={savedTools}
        onComplete={handleComplete}
      />
    </div>
  );
}
