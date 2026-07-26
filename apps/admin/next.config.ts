import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";
import {
  buildAdminApiContentSecurityPolicy,
  buildAdminSecurityHeaders,
  workspaceTranspilePackages,
} from "@shapewebs/config";

const adminDirectory = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(adminDirectory, "../..");
const sharpLinuxRuntimeFiles = [
  "./node_modules/@img/sharp-linux-x64/**/*",
  "./node_modules/@img/sharp-libvips-linux-x64/**/*",
] as const;

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/admin/media": [...sharpLinuxRuntimeFiles],
    "/api/jobs/media-cleanup": [...sharpLinuxRuntimeFiles],
  },
  outputFileTracingRoot: monorepoRoot,
  poweredByHeader: false,
  transpilePackages: [...workspaceTranspilePackages],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildAdminSecurityHeaders({
          includeContentSecurityPolicy: false,
        }),
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildAdminApiContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
