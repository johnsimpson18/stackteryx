"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface ImportSuccessProps {
  vendorsCreated: number;
  costModelsCreated: number;
  onClose: () => void;
}

export function ImportSuccess({
  vendorsCreated,
  costModelsCreated,
  onClose,
}: ImportSuccessProps) {
  return (
    <div className="flex flex-col items-center text-center py-6 space-y-4">
      <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Import complete
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Created {vendorsCreated} vendor{vendorsCreated !== 1 ? "s" : ""} and{" "}
          {costModelsCreated} cost model{costModelsCreated !== 1 ? "s" : ""}.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
        <Button asChild>
          <Link href="/vendors">
            View Vendors
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
