import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/signout — clears the session and returns to /login.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[api/auth/signout] error:", err);
  }
  return NextResponse.redirect(new URL("/login", req.url), { status: 302 });
}
