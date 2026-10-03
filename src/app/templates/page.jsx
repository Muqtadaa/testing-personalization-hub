'use client';

import { useState } from 'react';
import { DocRefPanel, Eyebrow, PageHeader, Tab, Tabs } from '@/components/ui';
import { templates } from '@/data/templates.js';

const TEMPLATES_PANEL_ID = 'templates-panel';

export default function TemplatesPage() {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const t = templates[active];

  async function copy() {
    try {
      await navigator.clipboard.writeText(t.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // Older browsers fallback
      const ta = document.createElement('textarea');
      ta.value = t.body;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  function download() {
    const blob = new Blob([t.body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        dark
        eyebrow="Reusable templates"
        title="Copy, download, and put to work."
        intro="The intake questions, decision criteria, QA checklist, and readout structure your team can use today. Each template is provided as Markdown so it drops into Confluence, Notion, Jira, or Google Docs."
      />

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-[280px_1fr] gap-8">
            {/* Sidebar — vertical tabs primitive provides tablist + arrow-key navigation */}
            <aside aria-label="Templates" className="no-print">
              <Tabs
                value={active}
                onChange={setActive}
                label="Templates"
                orientation="vertical"
              >
                {templates.map((tpl, i) => (
                  <Tab
                    key={tpl.id}
                    value={i}
                    variant="vertical"
                    panelId={TEMPLATES_PANEL_ID}
                  >
                    <Eyebrow tone="light" className="mb-1">
                      Template {i + 1}
                    </Eyebrow>
                    <div className="text-body-sm font-bold text-charcoal leading-tight">
                      {tpl.title}
                    </div>
                  </Tab>
                ))}
              </Tabs>
            </aside>

            {/* Body */}
            <div id={TEMPLATES_PANEL_ID} role="tabpanel" tabIndex={0} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 rounded">
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                <h2 className="text-h2 md:text-h2-lg text-charcoal">
                  {t.title}
                </h2>
                <span className="text-caption font-mono text-muted bg-subtle px-2 py-1 rounded">
                  {t.filename}
                </span>
              </div>
              <p className="text-muted mb-5">{t.description}</p>

              <div className="flex flex-wrap items-center gap-2 mb-5 no-print">
                <button
                  onClick={copy}
                  className="px-5 py-2.5 rounded bg-lime text-charcoal font-semibold hover:bg-lime-500 transition text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
                >
                  {copied ? '✓ Copied' : 'Copy as Markdown'}
                </button>
                <span aria-hidden="true" className="h-6 w-px bg-muted/40 mx-1 hidden sm:block" />
                <button
                  onClick={download}
                  className="px-5 py-2.5 rounded border border-muted text-charcoal font-semibold hover:bg-subtle hover:border-charcoal transition text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
                >
                  Download .md
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded border border-muted text-charcoal font-semibold hover:bg-subtle hover:border-charcoal transition text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 inline-flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 9V3h12v6M6 18h12v4H6v-4z M6 14h12v4H6zM6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Print
                </button>
              </div>

              <pre className="bg-charcoal text-on-dark text-body-sm rounded-lg p-6 overflow-x-auto leading-relaxed whitespace-pre-wrap font-mono">
                {t.body}
              </pre>

              {t.references && t.references.length > 0 && (
                <div className="mt-8 no-print">
                  <DocRefPanel
                    eyebrow="Supporting docs"
                    title="References for this template"
                    refKeys={t.references}
                    variant="subtle"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
