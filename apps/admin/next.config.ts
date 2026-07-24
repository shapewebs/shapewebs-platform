import type { NextConfig } from "next";
import {
  buildAdminApiContentSecurityPolicy,
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
