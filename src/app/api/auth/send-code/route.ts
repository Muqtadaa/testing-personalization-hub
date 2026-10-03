import { NextResponse } from "next/server";
import { ALLOWED_DOMAINS_LABEL, emailDomainAllowed } from "@/lib/auth/allowlist";
import { authConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/send-code { email } — emails a 6-digit sign-in code, but only
// to an allowed work email. Domain is enforced here (server-side)
// so codes are never sent to arbitrary addresses through the app.
export async function POST(req: Request) {
  if (!authConfigured()) {
    return NextResponse.json({ error: "Sign-in is not configured yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!emailDomainAllowed(email)) {
    return NextResponse.json(
      { error: `Use your work email (${ALLOWED_DOMAINS_LABEL}).` },
      { status: 403 },
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    // Pass through Supabase's status (e.g. 429 for "email rate limit exceeded")
    // so the client can show a precise message and start a cooldown.
    const status = error.status && error.status >= 400 ? error.status : 400;
    const rateLimited = status === 429 || /rate limit/i.test(error.message);
    return NextResponse.json(
      { error: error.message, rateLimited },
      { status },
    );
  }
  return NextResponse.json({ ok: true });
}
