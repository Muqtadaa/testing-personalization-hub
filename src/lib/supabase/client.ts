import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "./env";

// Browser Supabase client for auth (sign-in code verify, reading the session).
// Uses the browser-safe publishable/anon key. createBrowserClient is a singleton
// internally, so repeated calls return the same instance.
export function createClient() {
  return createBrowserClient(SUPABASE_AUTH_URL!, SUPABASE_AUTH_KEY!);
}
