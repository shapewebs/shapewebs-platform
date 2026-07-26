import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const mediaPackage = JSON.parse(
  await readFile(resolve("packages/media/package.json"), "utf8"),
);
const sharpVersion = mediaPackage.dependencies?.sharp;

assert.equal(
  typeof sharpVersion,
  "string",
  "packages/media must declare a pinned Sharp version.",
);

const mediaTracePath = resolve(
  "apps/admin/.next/server/app/api/admin/media/route.js.nft.json",
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
  const nativeRuntimeDirectory = `@img+sharp-linux-x64@${sharpVersion}/node_modules/@img`;

  assert.ok(
    files.some(
      (file) =>
        file.includes(nativeRuntimeDirectory) &&
        file.includes(
          `/sharp-linux-x64/lib/sharp-linux-x64-${sharpVersion}.node`,
        ),
    ),
    `${route} is missing the colocated Sharp Linux x64 native binary.`,
  );
  assert.ok(
    files.some(
      (file) =>
        file.includes(nativeRuntimeDirectory) &&
        /\/sharp-libvips-linux-x64\/lib\/libvips-cpp\.so\./u.test(file),
    ),
    `${route} is missing the colocated libvips Linux x64 runtime.`,
  );
}

const mediaFiles = await readTrace(mediaTracePath);
const cleanupFiles = await readTrace(cleanupTracePath);

assertSharpLinuxRuntime(mediaFiles, "/api/admin/media");
assertSharpLinuxRuntime(cleanupFiles, "/api/jobs/media-cleanup");

console.log(
  "Verified Sharp and libvips Linux x64 runtime artifacts for media routes.",
);
