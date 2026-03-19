"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GuidedTour } from "./guided-tour";

interface TourContextValue {
  startTour: () => void;
}

const TourContext = createContext<TourContextValue>({ startTour: () => {} });

interface TourProviderProps {
  children: ReactNode;
  tourCompletedInDb: boolean;
}

export function TourProvider({ children, tourCompletedInDb }: TourProviderProps) {
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    // Auto-start conditions: not completed in localStorage or DB
    const completedLocal = localStorage.getItem("stackteryx-tour-completed") === "true";
    if (!completedLocal && !tourCompletedInDb) {
      // Delay so dashboard fully renders first
      const timer = setTimeout(() => setTourActive(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [tourCompletedInDb]);

  function handleComplete() {
    setTourActive(false);
    localStorage.setItem("stackteryx-tour-completed", "true");
  }

  function startTour() {
    localStorage.removeItem("stackteryx-tour-completed");
    setTourActive(true);
  }

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
      <GuidedTour active={tourActive} onComplete={handleComplete} />
    </TourContext.Provider>
  );
}

export function useTour() {
  return useContext(TourContext);
}
