import type { NextConfig } from "next";
import {
  buildWebSecurityHeaders,
  workspaceTranspilePackages,
} from "@shapewebs/config";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [...workspaceTranspilePackages],
  async headers() {
    return [
      {
        source: "/preview/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        source: "/:path*",
        headers: buildWebSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
