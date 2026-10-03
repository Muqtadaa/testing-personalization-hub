// Shared Atlassian Document Format (ADF) → plain-text helpers. Used by the
// roadmap normalizer (to surface a readable brief) and the intake reverse-mapper
// (to seed an "improve" conversation from an existing ticket's description).
// Description today is one-way (brief → ADF); this is lossy text extraction only.

const BRIEF_MAX = 8000;

/** Flatten an ADF document (or plain string) to text for light parsing. */
export function adfToText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(adfToText).join("");
  if (typeof node === "object") {
    const n = node as { text?: string; content?: unknown; type?: string };
    let out = "";
    if (typeof n.text === "string") out += n.text;
    if (n.content) out += adfToText(n.content);
    // Insert breaks for block nodes so line-based regexes work.
    if (n.type === "paragraph" || n.type === "heading") out += "\n";
    return out;
  }
  return "";
}

/** Readable plain-text brief from a Jira description (ADF or string), capped. */
export function briefText(description: unknown, max = BRIEF_MAX): string | null {
  const raw = adfToText(description);
  if (!raw) return null;
  const text = raw
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
