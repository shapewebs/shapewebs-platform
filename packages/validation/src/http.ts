export async function readBoundedText(
  request: Request,
  maximumBytes: number,
): Promise<
  | {
      status: "ok";
      value: string;
    }
  | {
      status: "too_large";
    }
> {
  const declaredLength = request.headers.get("content-length");

  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);

    if (
      !Number.isFinite(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > maximumBytes
    ) {
      return { status: "too_large" };
    }
  }

  if (!request.body) {
    return {
      status: "ok",
      value: "",
    };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      totalBytes += result.value.byteLength;

      if (totalBytes > maximumBytes) {
        await reader.cancel();
        return { status: "too_large" };
      }

      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    status: "ok",
    value: new TextDecoder().decode(body),
  };
}
