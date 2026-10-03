// Public Supabase auth env. These are browser-safe keys (anon / publishable).
// `authConfigured()` lets the app FAIL OPEN when they're absent — so deploying
// the auth code before the env vars are set does not lock the whole hub out.
// Once both are present (locally or on Vercel), the sign-in gate activates.

export const SUPABASE_AUTH_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_AUTH_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function authConfigured(): boolean {
  return !!(SUPABASE_AUTH_URL && SUPABASE_AUTH_KEY);
}
