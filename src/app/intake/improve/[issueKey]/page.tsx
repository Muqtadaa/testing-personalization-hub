import { PageHeader } from "@/components/ui";
import ImproveClient from "./ImproveClient";

// "Improve the brief" flow: a truncated, gap-focused intake seeded from an
// existing Jira ticket. Finalizing UPDATES that ticket (not create a new one)
// and returns to the roadmap, which re-syncs and clears the flag.
export default async function ImprovePage({
  params,
}: {
  params: Promise<{ issueKey: string }>;
}) {
  const { issueKey } = await params;
  return (
    <>
      <PageHeader
        dark
        compact
        eyebrow="Ticket review"
        title={`Improve ${issueKey}`}
        intro="A review flagged a few gaps on this ticket. I'll ask only about those, then update the ticket in Jira with the improved brief."
      />
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <ImproveClient issueKey={issueKey} />
        </div>
      </section>
    </>
  );
}
