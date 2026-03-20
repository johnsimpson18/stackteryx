"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface IntelligencePanelContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const IntelligencePanelContext = createContext<IntelligencePanelContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function IntelligencePanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Keyboard shortcut: Cmd+I / Ctrl+I
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <IntelligencePanelContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </IntelligencePanelContext.Provider>
  );
}

export function useIntelligencePanel() {
  return useContext(IntelligencePanelContext);
}
