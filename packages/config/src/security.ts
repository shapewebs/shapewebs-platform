type Header = {
  key: string;
  value: string;
};

const sharedHeaders: Header[] = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

function buildCsp(options: {
  allowAnalytics: boolean;
  allowTurnstile: boolean;
}) {
  const connectSrc = [
    "'self'",
    ...(options.allowAnalytics ? ["https://vitals.vercel-insights.com"] : []),
  ].join(" ");
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(options.allowTurnstile ? ["https://challenges.cloudflare.com"] : []),
    ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
  ].join(" ");
  const frameSrc = [
    "'self'",
    ...(options.allowTurnstile ? ["https://challenges.cloudflare.com"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    `connect-src ${connectSrc}`,
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `frame-src ${frameSrc}`,
  ].join("; ");
}

export function buildAdminContentSecurityPolicy(nonce: string): string {
  if (!/^[A-Za-z0-9+/=_-]+$/.test(nonce)) {
    throw new Error("The CSP nonce contains invalid characters.");
  }

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    "connect-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "frame-src 'self'",
  ].join("; ");
}

export function buildAdminApiContentSecurityPolicy(): string {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join("; ");
}

export function buildWebSecurityHeaders(): Header[] {
  return [
    ...sharedHeaders,
    {
      key: "Content-Security-Policy",
      value: buildCsp({ allowAnalytics: true, allowTurnstile: true }),
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
  ];
}

export function buildAdminSecurityHeaders(options?: {
  includeContentSecurityPolicy?: boolean;
}): Header[] {
  return [
    ...sharedHeaders,
    ...(options?.includeContentSecurityPolicy === false
      ? []
      : [
          {
            key: "Content-Security-Policy",
            value: buildCsp({
              allowAnalytics: false,
              allowTurnstile: false,
            }),
          },
        ]),
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ];
}
