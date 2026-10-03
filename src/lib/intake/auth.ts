// Access control for the builder. The domain allowlist now lives in the shared
// auth module (used by the app-wide sign-in gate too); re-exported here so
// existing imports keep working.

import { ALLOWED_EMAIL_DOMAINS, emailDomainAllowed } from "@/lib/auth/allowlist";
export { ALLOWED_EMAIL_DOMAINS, emailDomainAllowed };

export interface AuthedUser {
  name: string;
  email: string;
}

/** Persisted shape: identity plus the time it was stored, so we can expire it. */
interface StoredUser extends AuthedUser {
  storedAt: string; // ISO timestamp
}

const KEY = "intake_user";
/** How long a remembered identity stays valid on this device. */
export const IDENTITY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days

// Persist to localStorage so the identity survives tab/browser close. The value
// is stamped with `storedAt` and expires after IDENTITY_TTL_MS; an expired or
// off-domain value is cleared on read so the gate reappears.
export function readAuthedUser(): AuthedUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as Partial<StoredUser>;
    const fresh =
      !!u.storedAt && Date.now() - Date.parse(u.storedAt) < IDENTITY_TTL_MS;
    if (u?.email && emailDomainAllowed(u.email) && fresh) {
      return { name: u.name ?? "", email: u.email };
    }
    clearAuthedUser();
    return null;
  } catch {
    return null;
  }
}

export function storeAuthedUser(user: AuthedUser): void {
  if (typeof window === "undefined") return;
  const stored: StoredUser = { ...user, storedAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(stored));
}

export function clearAuthedUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
