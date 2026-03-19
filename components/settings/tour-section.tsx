"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resetTourCompleted } from "@/actions/onboarding";
import { RefreshCw } from "lucide-react";

export function TourSection() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReplay() {
    startTransition(async () => {
      localStorage.removeItem("stackteryx-tour-completed");
      await resetTourCompleted();
      router.push("/dashboard");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guided Tour</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Replay the platform walkthrough to rediscover key features.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReplay}
          disabled={isPending}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Replay tour
        </Button>
      </CardContent>
    </Card>
  );
}
