"use client";

import { checkLimit } from "@/actions/billing";
import { useLimitModal, type LimitType } from "@/components/billing/limit-context";
import type { LimitKey } from "@/lib/plans";

export function useCheckLimit() {
  const { showLimitModal } = useLimitModal();

  async function checkAndProceed(
    limitKey: LimitKey,
    onAllowed: () => void | Promise<void>,
  ): Promise<void> {
    const result = await checkLimit(limitKey);
    if (result.allowed) {
      await onAllowed();
    } else {
      showLimitModal(limitKey as LimitType, result.current, result.limit);
    }
  }

  return { checkAndProceed };
}
