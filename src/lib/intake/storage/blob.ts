import { del, get, put } from "@vercel/blob";

// Thin wrapper over Vercel Blob for intake screenshots + generated mockups.
// Blobs are stored PRIVATE (require the store token to read) and surfaced to the
// browser only through the server-side proxy route. Token is read from
// BLOB_READ_WRITE_TOKEN by the SDK automatically.

export function hasBlobStorage(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export interface UploadedBlob {
  pathname: string;
  contentType: string;
}

/** Uploads bytes as a private blob and returns its canonical pathname. */
export async function uploadBlob(
  pathname: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<UploadedBlob> {
  const res = await put(pathname, Buffer.from(body), {
    access: "private",
    addRandomSuffix: true,
    contentType,
  });
  return { pathname: res.pathname, contentType: res.contentType };
}

/** Reads a private blob's bytes + content type, or null if missing. */
export async function readBlob(
  pathname: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const res = await get(pathname, { access: "private" });
  if (!res || res.statusCode !== 200) return null;
  const buf = await new Response(res.stream).arrayBuffer();
  return { bytes: new Uint8Array(buf), contentType: res.blob.contentType };
}

export async function deleteBlob(pathname: string): Promise<void> {
  try {
    await del(pathname);
  } catch {
    // Best effort — a missing blob is not an error worth surfacing.
  }
}
