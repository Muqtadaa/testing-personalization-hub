import type { GeneratedBrief } from "@/lib/intake/types";

// Renders a GeneratedBrief (+ optional preamble paragraphs) into Atlassian
// Document Format (ADF) for the Jira issue description field.

type AdfNode = Record<string, unknown>;

function text(t: string): AdfNode {
  return { type: "text", text: t };
}

function paragraph(t: string): AdfNode {
  return { type: "paragraph", content: t ? [text(t)] : [] };
}

function heading(t: string, level = 3): AdfNode {
  return { type: "heading", attrs: { level }, content: [text(t)] };
}

function bulletList(items: string[]): AdfNode {
  return {
    type: "bulletList",
    content: items.map((i) => ({
      type: "listItem",
      content: [paragraph(i.replace(/^[-*]\s*/, ""))],
    })),
  };
}

function bodyToNodes(body: string): AdfNode[] {
  const lines = body.split("\n").map((l) => l.trimEnd());
  const nodes: AdfNode[] = [];
  let buffer: string[] = [];
  const flushBullets = () => {
    if (buffer.length) {
      nodes.push(bulletList(buffer));
      buffer = [];
    }
  };
  for (const line of lines) {
    if (/^[-*]\s+/.test(line)) {
      buffer.push(line);
    } else {
      flushBullets();
      if (line.trim()) nodes.push(paragraph(line));
    }
  }
  flushBullets();
  if (!nodes.length) nodes.push(paragraph(""));
  return nodes;
}

export function briefToAdf(brief: GeneratedBrief, preamble: string[] = []): AdfNode {
  const content: AdfNode[] = [];
  for (const p of preamble) content.push(paragraph(p));
  // Summary and Hypothesis are top-level brief fields (not in `sections`); render
  // them first so the Jira description always leads with them.
  if (brief.summary?.trim()) {
    content.push(heading("Summary"));
    content.push(...bodyToNodes(brief.summary));
  }
  if (brief.hypothesis?.trim()) {
    content.push(heading("Hypothesis"));
    content.push(...bodyToNodes(brief.hypothesis));
  }
  for (const section of brief.sections) {
    content.push(heading(section.heading));
    content.push(...bodyToNodes(section.body));
  }
  return { type: "doc", version: 1, content };
}

/** Plain-text rendering for the dry-run preview and non-ADF contexts. */
export function briefToPlainText(brief: GeneratedBrief): string {
  const parts = [
    brief.summary ? `## Summary\n${brief.summary}\n` : "",
    brief.hypothesis ? `## Hypothesis\n${brief.hypothesis}\n` : "",
  ];
  for (const s of brief.sections) parts.push(`## ${s.heading}\n${s.body}\n`);
  return parts.join("\n");
}
