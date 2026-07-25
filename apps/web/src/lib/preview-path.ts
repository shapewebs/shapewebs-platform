const previewOrigin = "https://preview-path.shapewebs.invalid";

export function buildPrivatePreviewPath(publicPath: string): string | null {
  if (
    !publicPath.startsWith("/") ||
    publicPath.startsWith("//") ||
    publicPath.includes("\\") ||
    publicPath.includes("?") ||
    publicPath.includes("#")
  ) {
    return null;
  }

  const parsed = new URL(publicPath, previewOrigin);

  if (
    parsed.origin !== previewOrigin ||
    parsed.pathname !== publicPath ||
    parsed.search ||
    parsed.hash
  ) {
    return null;
  }

  return publicPath === "/" ? "/preview" : `/preview${publicPath}`;
}
