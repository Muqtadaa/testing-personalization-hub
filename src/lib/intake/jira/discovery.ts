import type { JiraTarget } from "@/lib/intake/config/schema";
import { getSupabase } from "@/lib/intake/db/client";
import { getJiraCreds } from "./client";

// Jira metadata discovery: pulls the create-screen field metadata for the
// configured project + issue type so admins can verify the mapping against the
// live Jira config (and detect drift). Snapshot is stored in Supabase when
// available.

export interface DiscoveredField {
  fieldId: string;
  name: string;
  required: boolean;
  schemaType: string;
  allowedValues?: { id: string; value: string }[];
}

export async function discoverFields(jira: JiraTarget): Promise<DiscoveredField[]> {
  const creds = getJiraCreds();
  const auth = Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");
  const res = await fetch(
    `${creds.baseUrl}/rest/api/3/issue/createmeta/${jira.projectKey}/issuetypes/${jira.issueTypeId}?maxResults=200`,
    { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`createmeta failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as {
    fields?: Array<{
      fieldId: string;
      name: string;
      required: boolean;
      schema?: { type?: string };
      allowedValues?: Array<{ id: string; value?: string; name?: string }>;
    }>;
  };
  return (data.fields ?? []).map((f) => ({
    fieldId: f.fieldId,
    name: f.name,
    required: f.required,
    schemaType: f.schema?.type ?? "unknown",
    allowedValues: f.allowedValues?.map((a) => ({ id: a.id, value: a.value ?? a.name ?? "" })),
  }));
}

export async function refreshMetadataSnapshot(jira: JiraTarget): Promise<DiscoveredField[]> {
  const fields = await discoverFields(jira);
  const db = getSupabase();
  if (db) {
    await db.from("jira_metadata_snapshot").upsert({
      id: 1,
      project_key: jira.projectKey,
      issue_type_id: jira.issueTypeId,
      fields,
      captured_at: new Date().toISOString(),
    });
  }
  return fields;
}
