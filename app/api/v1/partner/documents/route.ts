import { requirePartner } from "@/lib/core/partner";
import type { DocumentRecord } from "@/lib/core/types";
import { AppError, newId } from "@/lib/core/util";
import { api } from "@/lib/server/http";
import { storeUpload } from "@/lib/server/files";

const KINDS = ["id_proof", "address_proof", "certificate", "registration", "other"];
/** Multipart upload: fields "file", "kind", optional "credentialKey". Stored privately; only admins can open it. */
export const POST = api(async ({ req, ctx, actor }) => {
  const a = requirePartner(actor, true);
  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  if (!(file instanceof File)) throw new AppError(400, "no_file", "Please choose a file");
  if (!KINDS.includes(kind)) throw new AppError(400, "bad_kind", "Unknown document type");
  if ((await ctx.repo.col("documents").count({ providerId: a.providerId })) >= 30) throw new AppError(400, "limit", "Too many documents. Please contact support.");
  const stored = await storeUpload(file, a.userId, "private", true);
  const doc: DocumentRecord = { _id: newId(), ownerUserId: a.userId, providerId: a.providerId, kind, fileName: file.name.slice(0, 120), contentType: stored.contentType, sizeBytes: stored.size, storageKey: stored.id, visibility: "private", status: "uploaded", createdAt: ctx.now() };
  await ctx.repo.col<DocumentRecord>("documents").insertOne(doc);
  const credentialKey = form.get("credentialKey");
  if (typeof credentialKey === "string" && credentialKey) {
    await ctx.repo.col("providers").updateOne({ _id: a.providerId }, { $pull: { credentials: { key: credentialKey } } });
    await ctx.repo.col("providers").updateOne({ _id: a.providerId }, { $push: { credentials: { key: credentialKey, value: file.name.slice(0, 120), documentId: doc._id } } });
  }
  const { storageKey: _s, ...safe } = doc; void _s;
  return { document: safe };
});
