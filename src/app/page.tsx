import Link from "next/link";
import { Eyebrow } from "@/components/ui";

type Tool = {
  href: string;
  eyebrow: string;
  title: string;
  blurb: string;
  status: "live" | "soon" | "planned";
  highlights?: string[];
};

const tools: Tool[] = [
  {
    href: "/explore",
    eyebrow: "Enablement",
    title: "Feature Experimentation Explorer",
    blurb:
      "How Feature Experimentation works — the process, role views, use cases, glossary, templates, and a pre-analysis calculator.",
    status: "live",
    highlights: ["Decide", "Process", "Roles", "Pre-Analysis"],
  },
  {
    href: "/backlog",
    eyebrow: "Delivery",
    title: "Roadmap",
    blurb:
      "The live experimentation roadmap, pulled straight from Jira — Intake through Live as a projected-delivery Gantt, table, or board.",
    status: "live",
    highlights: ["Gantt", "Table", "Board"],
  },
  {
    href: "/intake",
    eyebrow: "Intake",
    title: "Intake & Brief Builder",
    blurb:
      "A guided conversation that turns your idea into a structured, RICE-scored brief and files it to Jira.",
    status: "live",
    highlights: ["Conversational", "RICE", "→ Jira"],
  },
  {
    href: "/results",
    eyebrow: "Measurement",
    title: "Results & Revenue Explorer",
    blurb:
      "Program revenue, forecast pacing, and per-experiment incremental uplift — from the monthly revenue workbook.",
    status: "live",
    highlights: ["Uplift", "Forecast", "Explorer"],
  },
];

const STATUS_LABEL: Record<Tool["status"], string> = {
  live: "Open",
  soon: "Coming soon",
  planned: "Planned",
};

export default function HubHome() {
  return (
    <>
      {/* Hero */}
      <section className="bg-charcoal text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <Eyebrow tone="dark" className="mb-3">
            Testing &amp; Personalization Hub
          </Eyebrow>
          <h1 className="text-display max-w-4xl">
            One place for how we{" "}
            <span className="text-lime underline decoration-lime/60 decoration-[0.18em] underline-offset-[0.14em] [text-decoration-skip-ink:none]">
              test, prioritize, and learn
            </span>
            .
          </h1>
          <p className="mt-4 max-w-3xl text-body-lg md:text-xl text-on-dark-muted">
            Everything the team needs to test, prioritize, and learn — in one place.
          </p>
        </div>
      </section>

      {/* Tool launcher */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <Eyebrow tone="light" className="mb-2">
            Tools
          </Eyebrow>
          <h2 className="text-h2 md:text-h2-lg text-charcoal accent-underline mb-10">
            Where do you want to go?
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            {tools.map((t) => (
              <ToolTile key={t.href} tool={t} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ToolTile({ tool }: { tool: Tool }) {
  const isLive = tool.status === "live";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <Eyebrow tone="light">{tool.eyebrow}</Eyebrow>
        <StatusBadge status={tool.status} />
      </div>
      <div className="mt-3 text-h3 text-charcoal flex items-center gap-2">
        {tool.title}
        {isLive && (
          <span
            aria-hidden="true"
            className="text-accent transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        )}
      </div>
      <p className="mt-2 text-body-sm text-muted leading-relaxed">{tool.blurb}</p>
      {tool.highlights && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tool.highlights.map((h) => (
            <span
              key={h}
              className="text-[10px] font-bold uppercase tracking-eyebrow text-accent bg-subtle border border-muted/40 rounded px-2 py-1"
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </>
  );

  if (isLive) {
    return (
      <Link
        href={tool.href}
        className="group block bg-white border border-muted/30 rounded-lg p-7 shadow-card hover:shadow-cardHover hover:border-lime/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      aria-disabled="true"
      className="block bg-white border border-dashed border-muted/40 rounded-lg p-7 opacity-70 select-none"
      title={STATUS_LABEL[tool.status]}
    >
      {inner}
    </div>
  );
}

function StatusBadge({ status }: { status: Tool["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-eyebrow text-accent">
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-lime" />
        Open
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-eyebrow text-subtle border border-muted/50 rounded px-2 py-0.5">
      {STATUS_LABEL[status]}
    </span>
  );
}
