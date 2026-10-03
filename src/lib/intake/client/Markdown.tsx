import type { ReactNode } from "react";
import { stripEmoji } from "@/lib/intake/text";

// Lightweight, dependency-free markdown renderer for what the assistant produces:
// headings, paragraphs, bold, italic, inline code, links, bullet / numbered lists,
// and GFM pipe tables. Styled to the design system; safe (no raw HTML injection).

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Order matters: **bold** before *italic*. Italic = single asterisks only
  // (not underscores) to avoid false matches on snake_case identifiers.
  const regex =
    /(\*\*([^*]+)\*\*)|(\*([^*\n]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-body">
          {m[2]}
        </strong>,
      );
    } else if (m[4] !== undefined) {
      nodes.push(
        <em key={`${keyBase}-i${i}`} className="italic">
          {m[4]}
        </em>,
      );
    } else if (m[6] !== undefined) {
      nodes.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded-sm border border-muted/30 bg-white px-1 py-0.5 font-mono text-[0.85em] text-body"
        >
          {m[6]}
        </code>,
      );
    } else if (m[8] !== undefined) {
      nodes.push(
        <a
          key={`${keyBase}-a${i}`}
          href={m[9]}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline"
        >
          {m[8]}
        </a>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const ORDERED = /^\s*\d+\.\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEP = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/;

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

export function Markdown({ content }: { content: string }) {
  const lines = stripEmoji(content).split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let k = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`b${k++}`} className="leading-relaxed [&:not(:first-child)]:mt-2">
          {renderInline(para.join(" "), `b${k}`)}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (!list) return;
    const cls = `mt-2 space-y-1 pl-5 leading-relaxed ${
      list.type === "ol" ? "list-decimal" : "list-disc"
    }`;
    const items = list.items.map((b, j) => <li key={j}>{renderInline(b, `b${k}-${j}`)}</li>);
    blocks.push(
      list.type === "ol" ? (
        <ol key={`b${k++}`} className={cls}>
          {items}
        </ol>
      ) : (
        <ul key={`b${k++}`} className={cls}>
          {items}
        </ul>
      ),
    );
    list = null;
  };
  const flushBlocks = () => {
    flushPara();
    flushList();
  };

  const headingClass = (lvl: number) => {
    if (lvl <= 2) return "mt-4 text-body font-bold text-charcoal [&:first-child]:mt-0";
    if (lvl === 3) return "mt-3 text-body-sm font-bold text-charcoal";
    return "mt-3 text-body-sm font-semibold text-charcoal";
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Table: a row followed by a separator row.
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      flushBlocks();
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i].trimEnd())) {
        rows.push(splitRow(lines[i].trimEnd()));
        i++;
      }
      blocks.push(
        <div key={`b${k++}`} className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr>
                {header.map((h, c) => (
                  <th
                    key={c}
                    className="border border-muted/40 bg-subtle px-2 py-1 text-left font-semibold text-charcoal"
                  >
                    {renderInline(h, `h${k}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((cell, ci) => (
                    <td key={ci} className="border border-muted/40 px-2 py-1 align-top">
                      {renderInline(cell, `d${k}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.trim() === "") {
      // Blank ends a paragraph but NOT a list (keeps numbering continuous).
      flushPara();
      i++;
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      flushBlocks();
      i++;
      continue;
    }

    const head = line.match(HEADING);
    if (head) {
      flushBlocks();
      const lvl = head[1].length;
      const Tag = (`h${Math.min(lvl + 1, 6)}` as "h2" | "h3" | "h4" | "h5" | "h6");
      blocks.push(
        <Tag key={`b${k++}`} className={headingClass(lvl)}>
          {renderInline(head[2], `b${k}`)}
        </Tag>,
      );
      i++;
      continue;
    }

    const bm = line.match(BULLET);
    const om = line.match(ORDERED);
    if (bm) {
      flushPara();
      if (list && list.type !== "ul") flushList();
      if (!list) list = { type: "ul", items: [] };
      list.items.push(bm[1]);
    } else if (om) {
      flushPara();
      if (list && list.type !== "ol") flushList();
      if (!list) list = { type: "ol", items: [] };
      list.items.push(om[1]);
    } else {
      flushList();
      para.push(line);
    }
    i++;
  }
  flushBlocks();

  return <div className="text-body-sm">{blocks}</div>;
}
