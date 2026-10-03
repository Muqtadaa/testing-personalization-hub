import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/intake/config/service";
import { getIntake, saveIntake } from "@/lib/intake/db/intakes";
import { getLLMProvider } from "@/lib/intake/llm";
import { hasBlobStorage, readBlob, uploadBlob } from "@/lib/intake/storage/blob";
import { renderSvgToPng } from "@/lib/intake/storage/svg";
import type { IdeationDocument, IdeationImage } from "@/lib/intake/llm/provider";
import type { IntakeAttachment } from "@/lib/intake/types";

export const dynamic = "force-dynamic";
// Vision + rendering can take a while; allow generous time on Fluid Compute.
export const maxDuration = 120;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

// POST /api/intake/[id]/ideate — analyze uploaded screenshots, propose variations,
// render each lo-fi SVG wireframe to a PNG mockup, and store everything on the record.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const record = await getIntake(id);
    if (!record) return NextResponse.json({ error: "Intake not found." }, { status: 404 });

    const screenshots = record.attachments.filter((a) => a.kind === "screenshot");
    if (!screenshots.length) {
      return NextResponse.json(
        { error: "Upload at least one screenshot before requesting ideas." },
        { status: 400 },
      );
    }
    if (!hasBlobStorage()) {
      return NextResponse.json(
        { error: "Image storage is not configured. Set BLOB_READ_WRITE_TOKEN." },
        { status: 501 },
      );
    }

    // Load screenshot bytes for the vision call.
    const images: IdeationImage[] = [];
    for (const s of screenshots) {
      const blob = await readBlob(s.blobPath);
      if (blob) images.push({ base64: toBase64(blob.bytes), mediaType: blob.contentType });
    }
    if (!images.length) {
      return NextResponse.json({ error: "Screenshots could not be read." }, { status: 500 });
    }

    // Load any context documents (PDF as base64; CSV/text decoded) to enrich ideation.
    const documents: IdeationDocument[] = [];
    for (const d of record.attachments.filter((a) => a.kind === "document")) {
      const blob = await readBlob(d.blobPath);
      if (!blob) continue;
      if (d.contentType === "application/pdf") {
        documents.push({ filename: d.filename, mediaType: d.contentType, base64: toBase64(blob.bytes) });
      } else {
        documents.push({
          filename: d.filename,
          mediaType: d.contentType,
          text: new TextDecoder().decode(blob.bytes),
        });
      }
    }

    const config = await getConfig();
    const provider = getLLMProvider();
    const ideation = await provider.ideateFromScreenshots({
      config,
      fields: record.fields,
      images,
      documents,
    });

    // Render each variation's SVG wireframe to a PNG and store it as a mockup.
    const newMockups: IntakeAttachment[] = [];
    for (const [i, variation] of ideation.variations.entries()) {
      try {
        const png = renderSvgToPng(variation.svg);
        const filename = `mockup-${i + 1}-${variation.name.replace(/[^\w]+/g, "-").slice(0, 40)}.png`;
        const uploaded = await uploadBlob(`intake/${id}/mockups/${filename}`, png, "image/png");
        newMockups.push({
          id: randomUUID(),
          kind: "mockup",
          blobPath: uploaded.pathname,
          filename,
          contentType: "image/png",
          caption: variation.name,
        });
      } catch (err) {
        console.error(`[ideate] failed to render variation "${variation.name}":`, err);
      }
    }

    // Compose a plain-language variationIdeas value for the brief.
    const ideasText = [
      ideation.whatToTest,
      ...ideation.variations.map(
        (v) => `- ${v.name}: ${v.description}${v.rationale ? ` (${v.rationale})` : ""}`,
      ),
    ]
      .filter(Boolean)
      .join("\n");
    // Re-read just before saving so a conversation turn during this ~50s call
    // isn't clobbered. Apply only the fields this route owns.
    const fresh = (await getIntake(id)) ?? record;
    fresh.fields.variationIdeas = ideasText;
    // Drop prior mockups (re-ideation supersedes them); keep screenshots + documents.
    fresh.attachments = [
      ...fresh.attachments.filter((a) => a.kind !== "mockup"),
      ...newMockups,
    ];
    await saveIntake(fresh);

    return NextResponse.json({ intake: fresh, ideation });
  } catch (err) {
    console.error("[api/intake/:id/ideate POST] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
