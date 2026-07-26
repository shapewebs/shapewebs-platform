import type { NextConfig } from "next";
import {
  buildPortalApiContentSecurityPolicy,
  buildPortalSecurityHeaders,
  workspaceTranspilePackages,
} from "@shapewebs/config";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [...workspaceTranspilePackages],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildPortalSecurityHeaders({
          includeContentSecurityPolicy: false,
        }),
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildPortalApiContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
