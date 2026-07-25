export function getAdminCookiePrefix(production: boolean): string {
  return production ? "__Host-shapewebs" : "shapewebs";
}

export function getAdminCookiePolicy(production: boolean) {
  return {
    attributes: {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: production,
    },
    prefix: getAdminCookiePrefix(production),
  };
}
