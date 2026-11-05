import { Binary } from "mongodb";
import { AppError, newId } from "@/lib/core/util";
import { getRepo } from "./ctx";

/**
 * File storage in MongoDB (one document per file, max 4 MB — Vercel's request limit is 4.5 MB).
 * Verification documents are "private" and are only streamed to admins through an authenticated route.
 * For large galleries you can later swap this module for S3/R2/Vercel Blob without touching callers.
 */
const MAX = 4 * 1024 * 1024;
const TYPES: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8,
  "image/png": (b) => b.subarray(0, 4).toString("hex") === "89504e47",
  "image/webp": (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP",
  "application/pdf": (b) => b.subarray(0, 4).toString() === "%PDF",
};

export interface StoredFile { _id: string; ownerUserId: string; contentType: string; size: number; data: Binary; visibility: "private" | "public"; createdAt: Date }

export async function storeUpload(file: File, ownerUserId: string, visibility: "private" | "public", allowPdf: boolean) {
  if (file.size > MAX) throw new AppError(413, "too_large", "File must be under 4 MB. Please send a smaller photo or PDF.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = Object.keys(TYPES).find((t) => TYPES[t](buf));
  if (!type || (type === "application/pdf" && !allowPdf)) throw new AppError(415, "bad_type", allowPdf ? "Please upload a JPG, PNG, WEBP or PDF file" : "Please upload a JPG, PNG or WEBP photo");
  const doc: StoredFile = { _id: newId(), ownerUserId, contentType: type, size: buf.length, data: new Binary(buf), visibility, createdAt: new Date() };
  await getRepo().col<StoredFile>("files").insertOne(doc);
  return { id: doc._id, contentType: type, size: buf.length };
}

export async function readFile(id: string) {
  return getRepo().col<StoredFile>("files").findOne({ _id: id });
}

export function fileResponse(f: StoredFile, isPublic: boolean) {
  const bytes = f.data.buffer instanceof Uint8Array ? f.data.buffer : new Uint8Array(f.data.buffer as ArrayBuffer);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": f.contentType,
      "Content-Length": String(f.size),
      "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": f.contentType === "application/pdf" ? "inline" : "inline",
    },
  });
}
