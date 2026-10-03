import Link from "next/link";
import { getIntake } from "@/lib/intake/db/intakes";
import { Button, Card, Eyebrow, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const intake = await getIntake(id);

  if (!intake) {
    return (
      <>
        <PageHeader dark eyebrow="Intake" title="Intake not found" />
        <section className="bg-white">
          <div className="max-w-xl mx-auto px-6 py-12">
            <Button as="a" href="/intake" variant="secondary" size="md">
              Start a new intake
            </Button>
          </div>
        </section>
      </>
    );
  }

  const submitted = intake.status === "submitted" && intake.jiraIssueKey;

  return (
    <>
      <PageHeader
        dark
        eyebrow="Intake"
        title={submitted ? "Filed to Jira" : "Not submitted yet"}
        intro={
          submitted
            ? "Your intake landed in the team's Intake column for triage."
            : "This intake hasn't been filed to Jira yet. Head back to review to submit."
        }
      />
      <section className="bg-white">
        <div className="max-w-xl mx-auto px-6 py-12">
          <Card padding="lg" className="animate-fade-up text-center">
            {submitted ? (
              <>
                <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-lime text-2xl font-bold text-charcoal">
                  ✓
                </div>
                <Button
                  as="a"
                  href={intake.jiraUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  variant="primary"
                  size="lg"
                >
                  Open {intake.jiraIssueKey} in Jira →
                </Button>
              </>
            ) : (
              <Button as="a" href={`/intake/review/${id}`} variant="secondary" size="lg">
                Back to review
              </Button>
            )}

            <div className="mt-7 border-t border-muted/30 pt-5 text-left">
              <Eyebrow tone="muted">Brief title</Eyebrow>
              <p className="mt-1 text-body-sm text-body">
                {intake.brief?.title ?? intake.fields.briefTitle ?? "—"}
              </p>
            </div>
            <div className="mt-5">
              <Link
                href="/intake"
                className="focus-ring rounded-md text-body-sm font-medium text-accent hover:underline"
              >
                Start another intake
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
