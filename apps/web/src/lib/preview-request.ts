const previewGrantTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function parsePreviewGrantToken(body: string): string | null {
  const parameters = [...new URLSearchParams(body)];

  if (
    parameters.length !== 1 ||
    parameters[0]?.[0] !== "token" ||
    !previewGrantTokenPattern.test(parameters[0][1])
  ) {
    return null;
  }

  return parameters[0][1];
}
