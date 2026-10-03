import { NextResponse } from "next/server";
import { parseResultsDataset } from "@/lib/results/parse";
import { createVersion, resultsReadOnly } from "@/lib/results/db/versions";
import { requireUserForMutation } from "@/lib/results/auth";
import { hasBlobStorage, uploadBlob } from "@/lib/intake/storage/blob";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel's serverless request body cap is 4.5MB — stay safely under it.
const MAX_BYTES = 4 * 1024 * 1024;

const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

function isXlsx(file: File): boolean {
  return XLSX_TYPES.has(file.type) || /\.xlsx?$/i.test(file.name);
}

// POST /api/results/upload — multipart/form-data with "workbook" (required,
// the Revenue Workbook) and "sourceData" (optional, the Source Data workbook).
// Parses both, stores the raw files privately in Vercel Blob, inserts a new
// dataset version, and activates it.
export async function POST(req: Request) {
  try {
    if (resultsReadOnly()) {
      return NextResponse.json(
        { error: "This is a read-only public snapshot — uploads are disabled." },
        { status: 403 },
      );
    }
    const auth = await requireUserForMutation();
    if (!auth.ok) {
      return NextResponse.json({ error: "Sign in to upload data." }, { status: 401 });
    }

    const form = await req.formData();
    const workbook = form.get("workbook");
    const sourceData = form.get("sourceData");
    const notes = form.get("notes");

    if (!(workbook instanceof File)) {
      return NextResponse.json({ error: "No Revenue Workbook file provided." }, { status: 400 });
    }
    const files: { field: string; file: File }[] = [{ field: "workbook", file: workbook }];
    if (sourceData instanceof File) files.push({ field: "sourceData", file: sourceData });

    for (const { field, file } of files) {
      if (!isXlsx(file)) {
        return NextResponse.json(
          { error: `"${file.name}" (${field}) is not an Excel (.xlsx) file.` },
          { status: 415 },
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `"${file.name}" is larger than 4 MB.` },
          { status: 413 },
        );
      }
    }

    const workbookBytes = new Uint8Array(await workbook.arrayBuffer());
    const sourceBytes =
      sourceData instanceof File ? new Uint8Array(await sourceData.arrayBuffer()) : null;

    const { dataset, stats } = parseResultsDataset(workbookBytes, sourceBytes);
    if (stats.monthsFound.length === 0) {
      return NextResponse.json(
        {
          error:
            "No monthly sheets (e.g. \"26 Jan\") were found in this workbook — is this the Revenue Workbook?",
          warnings: dataset.warnings,
        },
        { status: 422 },
      );
    }

    // Store the raw files so a future re-parse (or audit) can recover them.
    let workbookBlobPath: string | null = null;
    let sourceBlobPath: string | null = null;
    if (hasBlobStorage()) {
      const safe = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
      workbookBlobPath = (
        await uploadBlob(`results/uploads/${safe(workbook.name)}`, workbookBytes, workbook.type)
      ).pathname;
      if (sourceData instanceof File && sourceBytes) {
        sourceBlobPath = (
          await uploadBlob(`results/uploads/${safe(sourceData.name)}`, sourceBytes, sourceData.type)
        ).pathname;
      }
    }

    const version = await createVersion({
      dataset,
      parseStats: stats,
      workbookFilename: workbook.name,
      workbookBlobPath,
      sourceFilename: sourceData instanceof File ? sourceData.name : null,
      sourceBlobPath,
      uploadedByEmail: auth.user?.email ?? null,
      uploadedByName: auth.user?.name ?? null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    });

    return NextResponse.json({ version, stats, warnings: dataset.warnings });
  } catch (err) {
    console.error("[api/results/upload POST] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
