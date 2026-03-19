"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { LimitHitModal } from "./limit-hit-modal";

export type LimitType =
  | "services"
  | "clients"
  | "aiGenerationsPerMonth"
  | "exportsPerMonth"
  | "ctoBriefsTotalEver"
  | "teamMembers";

interface LimitContextValue {
  showLimitModal: (
    limitType: LimitType,
    current: number,
    limit: number,
  ) => void;
}

const LimitContext = createContext<LimitContextValue>({
  showLimitModal: () => {},
});

export function LimitProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    limitType: LimitType;
    current: number;
    limit: number;
  }>({ isOpen: false, limitType: "services", current: 0, limit: 0 });

  function showLimitModal(
    limitType: LimitType,
    current: number,
    limit: number,
  ) {
    setModalState({ isOpen: true, limitType, current, limit });
  }

  return (
    <LimitContext.Provider value={{ showLimitModal }}>
      {children}
      <LimitHitModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((s) => ({ ...s, isOpen: false }))}
        limitType={modalState.limitType}
        current={modalState.current}
        limit={modalState.limit}
      />
    </LimitContext.Provider>
  );
}

export function useLimitModal() {
  return useContext(LimitContext);
}
