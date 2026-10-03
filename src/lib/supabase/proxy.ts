import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { emailDomainAllowed } from "@/lib/auth/allowlist";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL, authConfigured } from "./env";

// App-wide auth gate. Refreshes the Supabase session cookie and redirects any
// unauthenticated (or off-domain) request to /login. Paths that must stay open
// pre-sign-in: the login page and the auth API routes.

const PUBLIC_PREFIXES = ["/login", "/api/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Fail OPEN until the public Supabase env is configured. This way shipping the
  // gate cannot lock the whole hub out before sign-in is fully wired up; the gate
  // activates automatically once NEXT_PUBLIC_SUPABASE_URL + key are present.
  if (!authConfigured()) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_AUTH_URL!, SUPABASE_AUTH_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between createServerClient and getUser(): getUser refreshes
  // the token; skipping it can randomly log users out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowed = !!user && emailDomainAllowed(user.email);
  const path = request.nextUrl.pathname;

  if (!allowed && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    // Signed in but with a non-allowed domain: tell the login page why.
    if (user && !emailDomainAllowed(user.email)) url.searchParams.set("reason", "domain");
    return NextResponse.redirect(url);
  }

  // IMPORTANT: return the supabaseResponse as-is so refreshed cookies propagate.
  return supabaseResponse;
}
