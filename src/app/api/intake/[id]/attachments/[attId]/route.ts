import { NextResponse } from "next/server";
import { getIntake, saveIntake } from "@/lib/intake/db/intakes";
import { deleteBlob, readBlob } from "@/lib/intake/storage/blob";

export const dynamic = "force-dynamic";

// GET /api/intake/[id]/attachments/[attId] — stream a private attachment's bytes
// so the browser can display it without the blob being publicly reachable.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; attId: string }> },
) {
  const { id, attId } = await ctx.params;
  const record = await getIntake(id);
  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const att = record.attachments.find((a) => a.id === attId);
  if (!att) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });

  const blob = await readBlob(att.blobPath);
  if (!blob) return NextResponse.json({ error: "Attachment unavailable." }, { status: 404 });

  return new Response(blob.bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": blob.contentType || att.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

// DELETE /api/intake/[id]/attachments/[attId] — remove an attachment.
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; attId: string }> },
) {
  const { id, attId } = await ctx.params;
  const record = await getIntake(id);
  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const att = record.attachments.find((a) => a.id === attId);
  if (att) {
    await deleteBlob(att.blobPath);
    // Re-read just before saving so a concurrent conversation turn isn't clobbered.
    const fresh = (await getIntake(id)) ?? record;
    fresh.attachments = fresh.attachments.filter((a) => a.id !== attId);
    await saveIntake(fresh);
    return NextResponse.json({ intake: fresh });
  }
  return NextResponse.json({ intake: record });
}
