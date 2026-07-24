import type { NextConfig } from "next";
import {
  buildAdminSecurityHeaders,
  workspaceTranspilePackages,
} from "@shapewebs/config";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [...workspaceTranspilePackages],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildAdminSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
