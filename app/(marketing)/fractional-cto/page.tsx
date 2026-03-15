import type { Metadata } from "next";
import { FractionalCTOClient } from "./client";

export const metadata: Metadata = {
  title: "Free Technology Strategy Brief",
  description:
    "Generate an AI-powered executive technology advisory brief for your clients — free, no login required.",
};

export default function FractionalCTOPage() {
  return <FractionalCTOClient />;
}
