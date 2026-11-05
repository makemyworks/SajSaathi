import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
test("customer PWA manifest points to existing install icons and offline shell", () => {
  const manifest = JSON.parse(readFileSync(join(root, "public/manifest.webmanifest"), "utf8")) as { name?: string; start_url?: string; scope?: string; display?: string; icons?: { src: string }[] };
  assert.ok(manifest.name?.includes("Saj Saathi"));
  assert.equal(manifest.start_url, "/?source=pwa");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons ?? []) assert.ok(existsSync(join(root, "public", icon.src.replace(/^\//, ""))), `Missing icon: ${icon.src}`);
  assert.ok(existsSync(join(root, "public/sw.js")));
  assert.ok(existsSync(join(root, "public/offline.html")));
  const worker = readFileSync(join(root, "public/sw.js"), "utf8");
  assert.match(worker, /pathname.startsWith\("\/api\/"\)/, "API responses must stay network-only");
});
