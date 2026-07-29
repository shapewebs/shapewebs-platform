import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const mediaTracePath = resolve(
  "apps/admin/.next/server/app/api/admin/media/route.js.nft.json",
);
const publicContentMediaTracePath = resolve(
  "apps/admin/.next/server/app/api/admin/content/media/route.js.nft.json",
);
const cleanupTracePath = resolve(
  "apps/admin/.next/server/app/api/jobs/media-cleanup/route.js.nft.json",
);

async function readTrace(pathname) {
  const trace = JSON.parse(await readFile(pathname, "utf8"));

  assert.ok(Array.isArray(trace.files), `${pathname} has no file trace.`);
  return trace.files;
}

function assertSharpLinuxRuntime(files, route) {
  assert.ok(
    files.some((file) => file.includes("@img/sharp-linux-x64")),
    `${route} is missing the Sharp Linux x64 native binary.`,
  );
  assert.ok(
    files.some((file) => file.includes("@img/sharp-libvips-linux-x64")),
    `${route} is missing the libvips Linux x64 runtime.`,
  );
}

const mediaFiles = await readTrace(mediaTracePath);
const publicContentMediaFiles = await readTrace(publicContentMediaTracePath);
const cleanupFiles = await readTrace(cleanupTracePath);

assertSharpLinuxRuntime(mediaFiles, "/api/admin/media");
assertSharpLinuxRuntime(publicContentMediaFiles, "/api/admin/content/media");
assertSharpLinuxRuntime(cleanupFiles, "/api/jobs/media-cleanup");

console.log(
  "Verified Sharp and libvips Linux x64 runtime artifacts for media routes.",
);
