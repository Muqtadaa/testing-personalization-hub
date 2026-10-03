import { NextResponse } from "next/server";
import { ALLOWED_DOMAINS_LABEL } from "@/lib/auth/allowlist";
import { emailDomainAllowed } from "@/lib/intake/auth";
import { createIntake, getIntake, saveIntake } from "@/lib/intake/db/intakes";
import { processUserTurn } from "@/lib/intake/intake/engine";

// POST /api/intake — start or continue a conversational intake.
// Body: { id?: string, message?: string, submitter?: { name, email } }
// Without an id, a new draft is created; the message is then processed as a turn.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: string;
      message?: string;
      submitter?: { name?: string; email?: string };
      phase?: "core" | "detail";
    };
    const message = (body.message ?? "").trim();

    let record = body.id ? await getIntake(body.id) : null;
    if (body.id && !record) {
      return NextResponse.json({ error: "Intake not found." }, { status: 404 });
    }
    if (!record) {
      // Gate: new intakes require an allowed work email.
      const email = body.submitter?.email?.trim().toLowerCase() ?? "";
      if (!emailDomainAllowed(email)) {
        return NextResponse.json(
          { error: `Access is limited to ${ALLOWED_DOMAINS_LABEL} emails.` },
          { status: 403 },
        );
      }
      record = await createIntake();
      record.fields.submitterName = body.submitter?.name?.trim() || null;
      record.fields.submitterEmail = email;
      // Seed greeting so the user has context on a fresh conversation. Persist it
      // (after pushing) so server-side re-reads — e.g. during file upload/ideation
      // before the first turn — don't see an empty conversation.
      if (!record.messages.length) {
        record.messages.push({
          role: "assistant",
          content:
            "Hi! Tell me about the test or personalization idea you'd like to submit — in your own words. I'll ask a few questions and build a structured brief for you.",
          at: new Date().toISOString(),
        });
      }
      await saveIntake(record);
    }

    // Advance to the optional-detail phase when the user opts to keep going.
    if (body.phase && body.phase !== record.phase) {
      record.phase = body.phase;
      await saveIntake(record);
    }

    if (message) {
      record = await processUserTurn(record, message);
    }

    return NextResponse.json({ intake: record });
  } catch (err) {
    console.error("[api/intake] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
