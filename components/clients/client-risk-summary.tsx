"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Loader2, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskSummary } from "@/components/fractional-cto/risk-summary";
import { getClientLatestBrief } from "@/actions/fractional-cto";
import type { CTOBriefRecord } from "@/types/fractional-cto";

interface ClientRiskSummaryProps {
  clientId: string;
}

export function ClientRiskSummary({ clientId }: ClientRiskSummaryProps) {
  const [brief, setBrief] = useState<CTOBriefRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    startTransition(async () => {
      try {
        const data = await getClientLatestBrief(clientId);
        if (!cancelled) {
          setBrief(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading risk data...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No briefs for this client
  if (!brief) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-3 py-4">
            <div className="mx-auto h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                No risk data yet.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Generate a Technology Strategy Brief for this client to surface
                risk insights.
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/cto-briefs">
                Generate Brief
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const risks = brief.briefJson.technologyRisks ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <RiskSummary
          risks={risks}
          clientDomain={brief.domain}
          mspName={brief.mspName}
          quarterLabel={brief.quarterLabel}
        />
        <p className="text-[11px] text-muted-foreground/60">
          Showing risks from {brief.quarterLabel}.{" "}
          <Link
            href="/cto-briefs"
            className="text-primary hover:underline"
          >
            Generate a new brief
          </Link>{" "}
          to refresh.
        </p>
      </CardContent>
    </Card>
  );
}
