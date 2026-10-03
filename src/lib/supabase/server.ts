import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { nameFromEmail } from "@/lib/auth/displayName";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "./env";

// Server Supabase client for auth in Server Components, Server Actions, and
// Route Handlers. Reads/writes the session cookies via Next's cookie store.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_AUTH_URL!, SUPABASE_AUTH_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore when the proxy
          // (middleware) is refreshing the session.
        }
      },
    },
  });
}

/** The signed-in user's email + display name from the session, or null. */
export async function getSessionUser(): Promise<{ email: string; name: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const name =
    (user.user_metadata?.name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    nameFromEmail(user.email);
  return { email: user.email, name };
}
