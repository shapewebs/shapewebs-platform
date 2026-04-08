import type { NextConfig } from "next";
import {
  buildWebSecurityHeaders,
  workspaceTranspilePackages,
} from "@shapewebs/config";

const nextConfig: NextConfig = {
  transpilePackages: [...workspaceTranspilePackages],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildWebSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
