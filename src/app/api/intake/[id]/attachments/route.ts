import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getIntake, saveIntake } from "@/lib/intake/db/intakes";
import { hasBlobStorage, uploadBlob } from "@/lib/intake/storage/blob";
import type { IntakeAttachment } from "@/lib/intake/types";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file

// Non-image context document types we accept (and can feed to the model).
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "text/markdown",
]);

/** Decide storage subfolder + attachment kind from the content type. */
function classify(contentType: string): { kind: "screenshot" | "document"; folder: string } | null {
  if (contentType.startsWith("image/")) return { kind: "screenshot", folder: "screenshots" };
  if (DOCUMENT_TYPES.has(contentType)) return { kind: "document", folder: "documents" };
  return null;
}

// POST /api/intake/[id]/attachments — upload a screenshot (multipart/form-data,
// field "file"). Stores it privately in Vercel Blob and records the reference.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const record = await getIntake(id);
    if (!record) return NextResponse.json({ error: "Intake not found." }, { status: 404 });

    if (!hasBlobStorage()) {
      return NextResponse.json(
        { error: "Image storage is not configured. Set BLOB_READ_WRITE_TOKEN." },
        { status: 501 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const cls = classify(file.type);
    if (!cls) {
      const isSpreadsheet = /sheet|excel|\.xlsx?$/i.test(file.type + " " + file.name);
      return NextResponse.json(
        {
          error: isSpreadsheet
            ? "Spreadsheets aren't supported directly — please export as CSV and upload that."
            : "Unsupported file type. Upload an image (screenshot/mockup) or a PDF, CSV, or text file.",
        },
        { status: 415 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is larger than 10 MB." }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || `${cls.kind}.bin`;
    const uploaded = await uploadBlob(`intake/${id}/${cls.folder}/${safeName}`, bytes, file.type);

    const attachment: IntakeAttachment = {
      id: randomUUID(),
      kind: cls.kind,
      blobPath: uploaded.pathname,
      filename: safeName,
      contentType: uploaded.contentType,
    };
    // Re-read just before saving so a concurrent conversation turn isn't clobbered.
    const fresh = (await getIntake(id)) ?? record;
    fresh.attachments = [...fresh.attachments, attachment];
    await saveIntake(fresh);

    return NextResponse.json({ intake: fresh, attachment });
  } catch (err) {
    console.error("[api/intake/:id/attachments POST] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
