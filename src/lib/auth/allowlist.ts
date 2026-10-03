// Shared email-domain allowlist for the whole hub. Imported by the auth gate
// (middleware), the sign-in flow, and the intake routes — one source of truth.
// Edge-safe: no Node or browser APIs, just string logic.
//
// Configure with ALLOWED_EMAIL_DOMAINS (comma-separated). Default: example.com.

export const ALLOWED_EMAIL_DOMAINS: string[] = (process.env.ALLOWED_EMAIL_DOMAINS || "example.com")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

/** Human-readable list of allowed domains, for error messages. */
export const ALLOWED_DOMAINS_LABEL = ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(", ");

/** True when the email's domain is one of the allowed domains. */
export function emailDomainAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const m = email.trim().toLowerCase().match(/^[^\s@]+@([^\s@]+)$/);
  if (!m) return false;
  return ALLOWED_EMAIL_DOMAINS.includes(m[1]);
}
