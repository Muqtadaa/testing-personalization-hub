// Central Jira configuration. Every instance-specific identifier (project,
// issue type, custom field ids, select-option ids) is read from the environment
// with neutral placeholder defaults, so no tenant-specific value lives in code.
// Set the JIRA_* variables (see .env.example) to match your Jira instance.

const env = (name: string, fallback: string): string => {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
};

/** Instance + project identifiers. */
export const JIRA_INSTANCE = {
  baseUrl: env("JIRA_BASE_URL", "https://your-domain.atlassian.net").replace(/\/$/, ""),
  cloudId: env("JIRA_CLOUD_ID", "00000000-0000-0000-0000-000000000000"),
  projectKey: env("JIRA_PROJECT_KEY", "HUB"),
  projectId: env("JIRA_PROJECT_ID", "10000"),
  issueTypeId: env("JIRA_ISSUE_TYPE_ID", "10001"),
  serviceAccountId: env("JIRA_SERVICE_ACCOUNT_ID", "000000000000000000000000"),
} as const;

/** Jira field ids (custom fields are instance-specific). */
export const JIRA_FIELDS = {
  requestType: env("JIRA_FIELD_REQUEST_TYPE", "customfield_10001"),
  lineOfBusiness: env("JIRA_FIELD_LINE_OF_BUSINESS", "customfield_10002"),
  journey: env("JIRA_FIELD_JOURNEY", "customfield_10003"),
  riceReach: env("JIRA_FIELD_RICE_REACH", "customfield_10004"),
  riceImpact: env("JIRA_FIELD_RICE_IMPACT", "customfield_10005"),
  riceEffort: env("JIRA_FIELD_RICE_EFFORT", "customfield_10006"),
  category: env("JIRA_FIELD_CATEGORY", "customfield_10007"),
  journeyPlatform: env("JIRA_FIELD_JOURNEY_PLATFORM", "customfield_10008"),
  rank: env("JIRA_FIELD_RANK", "customfield_10009"),
} as const;

/** Numeric part of a custom field id, for `cf[...]` JQL ordering. */
export const JIRA_RANK_CF_NUMBER = JIRA_FIELDS.rank.replace(/^customfield_/, "");

const opt = (name: string, fallback: string) => env(name, fallback);

/** Select-option ids, keyed by display value. Override per instance via env. */
export const JIRA_OPTIONS = {
  requestType: {
    "Optimization / A/B Test": opt("JIRA_OPT_REQUEST_TYPE_AB_TEST", "20001"),
    "Personalization Campaign": opt("JIRA_OPT_REQUEST_TYPE_PERSONALIZATION", "20002"),
    "Research / Discovery": opt("JIRA_OPT_REQUEST_TYPE_RESEARCH", "20003"),
    Workshop: opt("JIRA_OPT_REQUEST_TYPE_WORKSHOP", "20004"),
  } as Record<string, string>,
  lineOfBusiness: {
    "Online Store": opt("JIRA_OPT_LOB_ONLINE_STORE", "20011"),
    Marketplace: opt("JIRA_OPT_LOB_MARKETPLACE", "20012"),
    "Rewards App": opt("JIRA_OPT_LOB_REWARDS_APP", "20013"),
  } as Record<string, string>,
  journey: {
    Acquisition: opt("JIRA_OPT_JOURNEY_ACQUISITION", "20021"),
    Conversion: opt("JIRA_OPT_JOURNEY_CONVERSION", "20022"),
    Retention: opt("JIRA_OPT_JOURNEY_RETENTION", "20023"),
  } as Record<string, string>,
  rice: {
    reach: {
      High: opt("JIRA_OPT_RICE_REACH_HIGH", "20031"),
      Medium: opt("JIRA_OPT_RICE_REACH_MEDIUM", "20032"),
      Low: opt("JIRA_OPT_RICE_REACH_LOW", "20033"),
    },
    impact: {
      High: opt("JIRA_OPT_RICE_IMPACT_HIGH", "20034"),
      Medium: opt("JIRA_OPT_RICE_IMPACT_MEDIUM", "20035"),
      Low: opt("JIRA_OPT_RICE_IMPACT_LOW", "20036"),
    },
    effort: {
      High: opt("JIRA_OPT_RICE_EFFORT_HIGH", "20037"),
      Medium: opt("JIRA_OPT_RICE_EFFORT_MEDIUM", "20038"),
      Low: opt("JIRA_OPT_RICE_EFFORT_LOW", "20039"),
    },
  } as Record<"reach" | "impact" | "effort", Record<"High" | "Medium" | "Low", string>>,
  category: {
    "Optimization / A/B Test": opt("JIRA_OPT_CATEGORY_OPTIMIZATION", "20041"),
    "Personalization Campaign": opt("JIRA_OPT_CATEGORY_PERSONALIZATION", "20042"),
    "Research / Discovery": opt("JIRA_OPT_CATEGORY_RESEARCH", "20043"),
  } as Record<string, string>,
} as const;
