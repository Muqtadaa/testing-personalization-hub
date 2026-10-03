import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intake & Brief Builder · Testing & Personalization Hub",
  description:
    "Conversational intake that turns a Testing & Personalization request into a structured brief and files it to Jira.",
};

// Segment layout (not a root layout — no <html>/<body>). The hub's root layout
// provides the shell; this just scopes metadata for the /intake section.
export default function IntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
