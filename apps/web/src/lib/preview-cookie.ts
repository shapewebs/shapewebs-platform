export function getPreviewCookiePolicy(production: boolean) {
  return {
    attributes: {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: production,
    },
    name: production ? "__Host-sw-preview-token" : "sw-preview-token",
  };
}
