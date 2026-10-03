import { authConfigured } from "@/lib/supabase/env";
import { getSessionUser } from "@/lib/supabase/server";

// Defense-in-depth for mutating Results routes: the proxy gate fails open when
// Supabase auth env is absent (deliberate — see src/lib/supabase/env.ts), so
// routes that change shared data verify the session themselves. In unconfigured
// local dev they allow the request with null attribution.

export type ResultsUser = { email: string; name: string } | null;

export async function requireUserForMutation(): Promise<
  { ok: true; user: ResultsUser } | { ok: false }
> {
  if (!authConfigured()) return { ok: true, user: null };
  const user = await getSessionUser();
  return user ? { ok: true, user } : { ok: false };
}
