"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlanContext } from "@/components/providers/plan-provider";

export function UpgradeSuccessHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = usePlanContext();

  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      toast.success("You're now on Stackteryx Pro. Unlimited access unlocked.");
      refresh();
      // Clear the query param without a page reload
      router.replace("/settings", { scroll: false });
    }
  }, [searchParams, router, refresh]);

  return null;
}
