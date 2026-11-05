import { api } from "@/lib/server/http";
import { fileResponse, readFile } from "@/lib/server/files";
import { notFound } from "@/lib/core/util";

/** Public files only (gallery photos). Private verification documents are never served here. */
export const GET = api(async ({ params }) => {
  const f = await readFile(params.id);
  if (!f || f.visibility !== "public") throw notFound("File");
  return fileResponse(f, true);
});
