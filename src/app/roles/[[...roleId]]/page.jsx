'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  DocRefPanel,
  Eyebrow,
  GlossaryTerm,
  PageHeader,
  Tab,
  Tabs,
} from '@/components/ui';
import { roles } from '@/data/roles.js';
import { phases, roleInvolvement } from '@/data/phases.js';

const ROLE_PANEL_ID = 'roles-panel';

export default function RolesPage() {
  const params = useParams();
  const roleId = Array.isArray(params.roleId) ? params.roleId[0] : params.roleId;
  const router = useRouter();
  const initial = roleId ? roles.findIndex((r) => r.id === roleId) : 0;
  const [active, setActive] = useState(initial >= 0 ? initial : 0);
  const roleIdInvalid = roleId && initial < 0;

  useEffect(() => {
    if (roleId) {
      const idx = roles.findIndex((r) => r.id === roleId);
      if (idx >= 0) setActive(idx);
    }
  }, [roleId]);

  const role = roles[active];

  function select(idx) {
    setActive(idx);
    router.push(`/roles/${roles[idx].id}`);
  }

  return (
    <>
      <PageHeader
        dark
        eyebrow="Role-based views"
        title="What FX looks like from where you sit."
        intro={
          <>
            Each stakeholder owns a different part of the workflow — from{' '}
            <GlossaryTerm term="primary-metric">primary metric</GlossaryTerm>{' '}
            definition through{' '}
            <GlossaryTerm term="impression">impression</GlossaryTerm> review.
            Select your role to see what you provide, what you get, and where
            you engage.
          </>
        }
      />

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {roleIdInvalid && (
            <div
              role="status"
              className="mb-6 p-4 bg-subtle border-l-4 border-lime rounded-r text-body-sm text-charcoal"
            >
              We couldn&apos;t find a role matching{' '}
              <code className="font-mono text-caption bg-white px-1.5 py-0.5 rounded border border-muted/30">
                {roleId}
              </code>
              . Showing {roles[0].name} instead.
            </div>
          )}
          <Tabs
            value={active}
            onChange={select}
            label="Stakeholder roles"
            className="mb-10"
          >
            {roles.map((r, i) => (
              <Tab key={r.id} value={i} variant="pill" panelId={ROLE_PANEL_ID}>
                {r.name}
              </Tab>
            ))}
          </Tabs>

          <Card
            padding="none"
            id={ROLE_PANEL_ID}
            role="tabpanel"
            className="overflow-hidden"
          >
            <div className="bg-charcoal text-on-dark px-7 py-8">
              <Eyebrow tone="dark">Role overview</Eyebrow>
              <h2 className="text-h1 md:text-h1-lg mt-2">{role.name}</h2>
              <p className="mt-4 text-body-lg text-on-dark max-w-3xl">
                {role.tagline}
              </p>
            </div>

            <div className="p-7 md:p-10 grid md:grid-cols-2 gap-x-12 gap-y-10">
              <RoleList
                label="Ownership"
                items={role.ownership}
                bullet="square"
              />
              <RoleList
                label="What you provide"
                items={role.provides}
                bullet="square-light"
              />
              <RoleList
                label="What you get"
                items={role.gets}
                bullet="check"
              />
              <RoleList
                label="Practical actions"
                items={role.practicalActions}
                bullet="numbered"
                as="ol"
              />
            </div>

            <div className="bg-subtle p-7 md:p-10 border-t border-muted/30">
              <Eyebrow tone="light" className="mb-3">
                Where {role.name} engages in the process
              </Eyebrow>

              {(() => {
                const ownsList = roleInvolvement[role.name]?.owns || [];
                if (!ownsList.length) return null;
                return (
                  <p className="text-body-sm text-muted mb-4">
                    Most active in:{' '}
                    {ownsList.map((id, idx) => {
                      const phase = phases.find((p) => p.id === id);
                      if (!phase) return null;
                      return (
                        <span key={id}>
                          <Link
                            href={`/process/${id}`}
                            className="text-accent font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 rounded"
                          >
                            Phase {id} ({phase.short})
                          </Link>
                          {idx < ownsList.length - 1 ? ', ' : '.'}
                        </span>
                      );
                    })}
                  </p>
                );
              })()}

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mt-4">
                {phases.map((p) => {
                  const engaged = role.engagesIn.includes(p.id);
                  return (
                    <Link
                      key={p.id}
                      href={`/process/${p.id}`}
                      aria-label={`${engaged ? 'Engages in' : 'Does not engage in'} Phase ${p.id}: ${p.short}`}
                      className={`block text-center p-3 rounded border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 ${
                        engaged
                          ? 'border-lime bg-white hover:bg-lime/10'
                          : 'border-muted/30 bg-white/40 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div
                        className={`text-eyebrow uppercase ${
                          engaged ? 'text-accent' : 'text-subtle'
                        }`}
                      >
                        Phase {p.id}
                      </div>
                      <div className="text-body-sm font-bold mt-1 leading-tight text-charcoal">
                        {p.short}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {role.docs && role.docs.length > 0 && (
              <div className="p-7 md:p-10 border-t border-muted/30">
                <DocRefPanel
                  eyebrow="Optimizely reference"
                  title={`Docs for ${role.name}`}
                  refKeys={role.docs}
                  variant="bare"
                />
              </div>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}

function RoleList({ label, items, bullet, as = 'ul' }) {
  const ListTag = as;
  return (
    <div>
      <Eyebrow tone="light" className="mb-3">
        {label}
      </Eyebrow>
      <ListTag className={as === 'ol' ? 'space-y-3' : 'space-y-2'}>
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-body">
            <Bullet kind={bullet} index={i} />
            <span>{item}</span>
          </li>
        ))}
      </ListTag>
    </div>
  );
}

function Bullet({ kind, index }) {
  if (kind === 'square') {
    return (
      <span
        aria-hidden="true"
        className="mt-1.5 w-2 h-2 rounded-sm bg-lime flex-shrink-0"
      />
    );
  }
  if (kind === 'square-light') {
    return (
      <span
        aria-hidden="true"
        className="mt-1.5 w-2 h-2 rounded-sm bg-lime/60 flex-shrink-0"
      />
    );
  }
  if (kind === 'check') {
    return (
      <svg
        aria-hidden="true"
        className="mt-0.5 w-5 h-5 text-accent flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'numbered') {
    return (
      <span className="font-bold text-accent flex-shrink-0" aria-hidden="true">
        {index + 1}.
      </span>
    );
  }
  return null;
}
