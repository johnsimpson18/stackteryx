"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Rocket, ArrowRight, Plus, LayoutDashboard } from "lucide-react";

interface StepLaunchProps {
  launched: boolean;
  isPending: boolean;
  bundleId: string | null;
  onLaunch: () => void;
  onViewService: () => void;
  onCreateAnother: () => void;
  onGoToDashboard: () => void;
}

export function StepLaunch({
  launched,
  isPending,
  onLaunch,
  onViewService,
  onCreateAnother,
  onGoToDashboard,
}: StepLaunchProps) {
  if (!launched) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-primary/[0.12]">
          <Rocket className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Ready to launch?</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Your service will be set to active and available across Stackteryx.
            All five layers are configured and ready to go.
          </p>
        </div>

        <Button
          onClick={onLaunch}
          disabled={isPending}
          size="lg"
          className="gap-2 px-8 bg-primary text-primary-foreground"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Launch Service
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-8">
      {/* Success animation */}
      <div className="relative">
        <div
          className="h-20 w-20 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500"
          style={{ backgroundColor: "#A8FF3E" }}
        >
          <svg
            className="h-10 w-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0A0A0A"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" className="animate-in slide-in-from-left duration-300 delay-300" />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Service Launched!</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Your service is now active. All five layers are complete and
          your team can start selling immediately.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onViewService} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          View Service
        </Button>
        <Button onClick={onCreateAnother} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Another
        </Button>
        <Button onClick={onGoToDashboard} variant="ghost" className="gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>
      </div>
    </div>
  );
}
