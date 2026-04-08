type Header = {
  key: string;
  value: string;
};

const sharedHeaders: Header[] = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

function buildCsp(options: { allowAnalytics: boolean }) {
  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    ...(options.allowAnalytics ? ["https://vitals.vercel-insights.com"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "object-src 'none'",
    `connect-src ${connectSrc}`,
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "frame-src 'self'",
  ].join("; ");
}

export function buildWebSecurityHeaders(): Header[] {
  return [
    ...sharedHeaders,
    { key: "Content-Security-Policy", value: buildCsp({ allowAnalytics: true }) },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
  ];
}

export function buildAdminSecurityHeaders(): Header[] {
  return [
    ...sharedHeaders,
    { key: "Content-Security-Policy", value: buildCsp({ allowAnalytics: false }) },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ];
}
