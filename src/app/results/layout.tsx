import type { Metadata } from "next";
import type { ReactNode } from "react";
import ResultsDataProvider from "@/components/results/ResultsDataProvider";

export const metadata: Metadata = {
  title: "Results · Testing & Personalization Hub",
  description:
    "Testing & Personalization program revenue: incremental uplift, forecast pacing, and per-experiment results.",
};

export default function ResultsLayout({ children }: { children: ReactNode }) {
  return <ResultsDataProvider>{children}</ResultsDataProvider>;
}
