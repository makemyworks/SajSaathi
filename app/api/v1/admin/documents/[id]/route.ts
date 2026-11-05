import type { DocumentRecord } from "@/lib/core/types";
import { notFound } from "@/lib/core/util";
import { audit } from "@/lib/core/context";
import { api } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
import { fileResponse, readFile } from "@/lib/server/files";
/** Streams a private verification document to an authorised admin. Every view is audit-logged. */
export const GET = api(async ({ ctx, actor, params }) => {
  const a = await admin(ctx, actor, "documents.view");
  const d = await ctx.repo.col<DocumentRecord>("documents").findOne({ _id: params.id });
  if (!d) throw notFound("Document");
  const f = await readFile(d.storageKey);
  if (!f) throw notFound("File");
  await audit(ctx, a, "document.view", "document", d._id);
  return fileResponse(f, false);
});
