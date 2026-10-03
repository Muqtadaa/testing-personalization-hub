// Thin Jira Cloud REST API v3 client using API-token Basic auth.
// Credentials come from env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN.

export interface JiraCreds {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export class JiraConfigError extends Error {}
export class JiraApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

export function getJiraCreds(): JiraCreds {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !apiToken) {
    throw new JiraConfigError(
      "Jira is not configured. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN.",
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), email, apiToken };
}

export function hasJiraCreds(): boolean {
  return !!(process.env.JIRA_BASE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN);
}

async function request<T>(
  creds: JiraCreds,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const auth = Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");
  const res = await fetch(`${creds.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const textBody = await res.text();
  let parsed: unknown = null;
  try {
    parsed = textBody ? JSON.parse(textBody) : null;
  } catch {
    parsed = textBody;
  }
  if (!res.ok) {
    throw new JiraApiError(
      `Jira ${method} ${path} failed (${res.status})`,
      res.status,
      parsed,
    );
  }
  return parsed as T;
}

export interface CreatedIssue {
  id: string;
  key: string;
  self: string;
}

export function createIssue(creds: JiraCreds, fields: Record<string, unknown>) {
  return request<CreatedIssue>(creds, "POST", "/rest/api/3/issue", { fields });
}

/** Fetch a single issue with the requested fields (read). */
export function getIssue(creds: JiraCreds, key: string, fields: string[]) {
  const q = fields.length ? `?fields=${encodeURIComponent(fields.join(","))}` : "";
  return request<JiraIssue>(creds, "GET", `/rest/api/3/issue/${key}${q}`);
}

/** Update an existing issue's fields (PUT). Jira returns 204; `request()`
 *  tolerates the empty body. Caller must pass UPDATE-safe fields only — Jira
 *  rejects creation-only fields (project / issuetype) on edit. */
export function updateIssue(creds: JiraCreds, key: string, fields: Record<string, unknown>) {
  return request<void>(creds, "PUT", `/rest/api/3/issue/${key}`, { fields });
}

// Uploads a file to an existing issue. Multipart, so it bypasses the JSON
// `request()` helper: Jira requires the `X-Atlassian-Token: no-check` header and
// the multipart boundary must be set by fetch (do NOT set Content-Type manually).
export async function addAttachment(
  creds: JiraCreds,
  issueKey: string,
  filename: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<void> {
  const auth = Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");
  const form = new FormData();
  form.append("file", new Blob([bytes as unknown as BlobPart], { type: contentType }), filename);
  const res = await fetch(`${creds.baseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "X-Atlassian-Token": "no-check",
      Accept: "application/json",
    },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new JiraApiError(
      `Jira attachment upload failed for ${filename} (${res.status})`,
      res.status,
      body,
    );
  }
}

export interface JiraTransition {
  id: string;
  name: string;
  to: { id: string; name: string };
}

export async function getTransitions(creds: JiraCreds, issueKey: string) {
  const r = await request<{ transitions: JiraTransition[] }>(
    creds,
    "GET",
    `/rest/api/3/issue/${issueKey}/transitions`,
  );
  return r.transitions;
}

export function doTransition(creds: JiraCreds, issueKey: string, transitionId: string) {
  return request<void>(creds, "POST", `/rest/api/3/issue/${issueKey}/transitions`, {
    transition: { id: transitionId },
  });
}

export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  displayName?: string;
}

export async function searchUsersByEmail(creds: JiraCreds, email: string): Promise<JiraUser[]> {
  return request<JiraUser[]>(
    creds,
    "GET",
    `/rest/api/3/user/search?query=${encodeURIComponent(email)}`,
  );
}

export async function getIssueStatus(creds: JiraCreds, issueKey: string): Promise<string | null> {
  const r = await request<{ fields?: { status?: { name?: string } } }>(
    creds,
    "GET",
    `/rest/api/3/issue/${issueKey}?fields=status`,
  );
  return r.fields?.status?.name ?? null;
}

// ---------------------------------------------------------------------------
// Enhanced JQL search (read). Uses the current `/rest/api/3/search/jql`
// endpoint with token-based pagination (`nextPageToken` / `isLast`). The legacy
// offset-based `/rest/api/3/search` is deprecated, so we never use it here.
// This endpoint returns no total count and only the fields you explicitly ask
// for, so callers must pass `fields` and loop until the page is the last one.
// ---------------------------------------------------------------------------

export interface JiraIssue {
  id: string;
  key: string;
  fields: Record<string, unknown>;
}

export interface JiraSearchPage {
  issues: JiraIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}

export interface JiraSearchParams {
  jql: string;
  fields: string[];
  maxResults?: number;
  nextPageToken?: string;
}

/** Single page of a JQL search. */
export function searchIssues(creds: JiraCreds, params: JiraSearchParams): Promise<JiraSearchPage> {
  const body: Record<string, unknown> = {
    jql: params.jql,
    fields: params.fields,
    maxResults: params.maxResults ?? 100,
  };
  if (params.nextPageToken) body.nextPageToken = params.nextPageToken;
  return request<JiraSearchPage>(creds, "POST", "/rest/api/3/search/jql", body);
}

/**
 * Follows pagination to collect every issue for a JQL query. `maxPages` is a
 * safety cap so a runaway query can't loop forever (100/page × 30 = 3000 max).
 */
export async function searchAllIssues(
  creds: JiraCreds,
  params: { jql: string; fields: string[]; pageSize?: number; maxPages?: number },
): Promise<JiraIssue[]> {
  const out: JiraIssue[] = [];
  const maxPages = params.maxPages ?? 30;
  let token: string | undefined;
  let pages = 0;
  do {
    const page = await searchIssues(creds, {
      jql: params.jql,
      fields: params.fields,
      maxResults: params.pageSize ?? 100,
      nextPageToken: token,
    });
    out.push(...(page.issues ?? []));
    // `isLast` is authoritative when present; otherwise stop when no token.
    token = page.isLast ? undefined : page.nextPageToken;
    pages += 1;
  } while (token && pages < maxPages);
  return out;
}

/** Browser URL for a Jira issue, e.g. https://example.atlassian.net/browse/HUB-123 */
export function issueBrowseUrl(creds: JiraCreds, key: string): string {
  return `${creds.baseUrl}/browse/${key}`;
}
