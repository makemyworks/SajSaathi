import { requirePartner } from "@/lib/core/partner";
import type { Provider } from "@/lib/core/types";
import { AppError } from "@/lib/core/util";
import { api, body } from "@/lib/server/http";
import { storeUpload } from "@/lib/server/files";

export const POST = api(async ({ req, ctx, actor }) => {
  const a = requirePartner(actor, true);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError(400, "no_file", "Please choose a photo");
  const p = await ctx.repo.col<Provider>("providers").findOne({ _id: a.providerId });
  if ((p?.gallery.length ?? 0) >= 24) throw new AppError(400, "limit", "You can have up to 24 photos");
  const s = await storeUpload(file, a.userId, "public", false);
  const url = `/api/v1/files/${s.id}`;
  const caption = String(form.get("caption") ?? "").slice(0, 100) || undefined;
  await ctx.repo.col<Provider>("providers").updateOne({ _id: a.providerId }, { $push: { gallery: { url, caption } } });
  return { photo: { url, caption } };
});
export const DELETE = api(async ({ req, ctx, actor }) => {
  const a = requirePartner(actor, true);
  const { url } = await body<{ url: string }>(req);
  await ctx.repo.col<Provider>("providers").updateOne({ _id: a.providerId }, { $pull: { gallery: { url } } });
  return { ok: true };
});
