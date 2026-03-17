"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, ArrowRight, Users, FileText, Eye, Plus, Package } from "lucide-react";

interface StepLaunchProps {
  launched: boolean;
  isPending: boolean;
  bundleId: string | null;
  onLaunch: () => void;
  activeServiceCount?: number;
}

export function StepLaunch({
  launched,
  isPending,
  bundleId,
  onLaunch,
  activeServiceCount = 0,
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

  // The newly launched service brings total to activeServiceCount + 1
  const totalServices = activeServiceCount + 1;

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
        <h2 className="text-3xl font-bold text-foreground">Your service is live.</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          What would you like to do next?
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Button asChild className="gap-2 justify-start">
          <Link href="/clients">
            <Users className="h-4 w-4" />
            Assign to a client
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Link>
        </Button>

        {bundleId && (
          <Button variant="outline" className="gap-2 justify-start" asChild>
            <Link href={`/sales-studio?bundle=${bundleId}`}>
              <FileText className="h-4 w-4" />
              Create a proposal
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          </Button>
        )}

        {bundleId && (
          <Button variant="outline" className="gap-2 justify-start" asChild>
            <Link href={`/services/${bundleId}`}>
              <Eye className="h-4 w-4" />
              View your service
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          </Button>
        )}

        <Button variant="ghost" className="gap-2 justify-start" asChild>
          <Link href="/services/new">
            <Plus className="h-4 w-4" />
            Build another service
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Link>
        </Button>
      </div>

      {/* Packaging hint — shows when org has 2+ active services */}
      {totalServices >= 2 && (
        <div className="rounded-xl border border-border bg-card px-5 py-4 max-w-sm w-full text-left">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Have multiple services? You can package them into tiers (Good / Better / Best) from the Services page.
          </p>
          <Button variant="link" size="sm" className="px-0 h-auto mt-1 text-xs gap-1" asChild>
            <Link href="/services?tab=packages">
              <Package className="h-3 w-3" />
              Create a Package
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
