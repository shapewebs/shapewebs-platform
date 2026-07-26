import type { MediaCleanupCandidate } from "@shapewebs/database/server";
import type { PrivateMediaStorage } from "@shapewebs/media/server";

const maximumWorkerRuntimeMs = 20_000;
const storageOperationTimeoutMs = 8_000;

export async function reconcileMediaCleanupCandidates(input: {
  candidates: MediaCleanupCandidate[];
  complete: (fileId: string) => Promise<boolean>;
  createStorage: (storeId: string) => PrivateMediaStorage;
  now?: () => number;
}): Promise<{
  cleaned: number;
  failed: number;
}> {
  const now = input.now ?? Date.now;
  const startedAt = now();
  let cleaned = 0;
  let failed = 0;

  for (const candidate of input.candidates) {
    if (now() - startedAt >= maximumWorkerRuntimeMs) {
      break;
    }

    try {
      const storage = input.createStorage(candidate.storeId);
      await storage.delete({
        abortSignal: AbortSignal.timeout(storageOperationTimeoutMs),
        ...(candidate.etag ? { etag: candidate.etag } : {}),
        pathname: candidate.pathname,
      });
      const completed = await input.complete(candidate.fileId);

      if (completed) cleaned += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    cleaned,
    failed,
  };
}
