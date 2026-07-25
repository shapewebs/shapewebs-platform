const expectedCron = "*/5 * * * *";
const expectedEnvironment = "staging";
const expectedOutboxTarget =
  "https://admin-staging.shapewebs.com/api/jobs/outbox";
const expectedHeartbeatOrigin = "https://ping.checklyhq.com";
const maximumOutboxResponseBytes = 2_048;
const maximumSecretLength = 512;
const outboxTimeoutMs = 25_000;
const heartbeatTimeoutMs = 5_000;

type FailureReason =
  | "configuration_invalid"
  | "heartbeat_rejected"
  | "heartbeat_unreachable"
  | "outbox_rejected"
  | "outbox_response_invalid"
  | "outbox_response_too_large"
  | "outbox_unreachable"
  | "unexpected_failure"
  | "unexpected_schedule";

type OutboxResult = {
  permanentFailures: number;
  processed: number;
  retryableFailures: number;
};

export type SchedulerBindings = Env;

type SchedulerController = Pick<ScheduledController, "cron" | "scheduledTime">;

type SchedulerLog = {
  cron: string;
  durationMs: number;
  environment: "staging";
  eventCode: "shapewebs.outbox.scheduler";
  level: "error" | "info";
  reasonCode?: FailureReason;
  requestId: string;
  result: "failure" | "success";
  scheduledAt: string;
  service: "shapewebs-outbox-scheduler";
  timestamp: string;
} & Partial<OutboxResult>;

export type SchedulerDependencies = {
  fetch: typeof fetch;
  log: (record: SchedulerLog) => void;
  now: () => number;
  randomUUID: () => string;
};

class SchedulerFailure extends Error {
  constructor(readonly reasonCode: FailureReason) {
    super("Shapewebs outbox scheduler failed.");
    this.name = "SchedulerFailure";
  }
}

export function bindRuntimeFetch(fetchImplementation: typeof fetch) {
  return fetchImplementation.bind(globalThis) as typeof fetch;
}

export function createRuntimeDependencies(): SchedulerDependencies {
  return {
    fetch: bindRuntimeFetch(globalThis.fetch),
    log(record) {
      const serializedRecord = JSON.stringify(record);

      if (record.level === "error") {
        console.error(serializedRecord);
        return;
      }

      console.log(serializedRecord);
    },
    now: () => Date.now(),
    randomUUID: () => crypto.randomUUID(),
  };
}

function isBoundedSecret(value: string): boolean {
  return value.length >= 32 && value.length <= maximumSecretLength;
}

function getHeartbeatUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    if (
      url.origin !== expectedHeartbeatOrigin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname === "/"
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function validateBindings(environment: SchedulerBindings): URL {
  const heartbeatUrl = getHeartbeatUrl(environment.CHECKLY_HEARTBEAT_URL);

  if (
    environment.SHAPEWEBS_ENVIRONMENT !== expectedEnvironment ||
    environment.OUTBOX_TARGET_URL !== expectedOutboxTarget ||
    !isBoundedSecret(environment.OUTBOX_CRON_SECRET) ||
    !isBoundedSecret(environment.VERCEL_AUTOMATION_BYPASS) ||
    !heartbeatUrl
  ) {
    throw new SchedulerFailure("configuration_invalid");
  }

  return heartbeatUrl;
}

async function readBoundedText(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  const declaredLength = response.headers.get("content-length");

  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);

    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > maximumBytes
    ) {
      throw new SchedulerFailure("outbox_response_too_large");
    }
  }

  if (!response.body) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let totalBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maximumBytes) {
      try {
        await reader.cancel();
      } catch {
        // Cancellation is best-effort after the size boundary has failed.
      }

      throw new SchedulerFailure("outbox_response_too_large");
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

function parseOutboxResult(value: string): OutboxResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new SchedulerFailure("outbox_response_invalid");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SchedulerFailure("outbox_response_invalid");
  }

  const candidate = parsed as Record<string, unknown>;
  const permanentFailures = candidate.permanentFailures;
  const processed = candidate.processed;
  const retryableFailures = candidate.retryableFailures;

  if (
    !Number.isSafeInteger(permanentFailures) ||
    !Number.isSafeInteger(processed) ||
    !Number.isSafeInteger(retryableFailures) ||
    Number(permanentFailures) < 0 ||
    Number(processed) < 0 ||
    Number(retryableFailures) < 0 ||
    Number(permanentFailures) + Number(processed) + Number(retryableFailures) >
      10
  ) {
    throw new SchedulerFailure("outbox_response_invalid");
  }

  return {
    permanentFailures: Number(permanentFailures),
    processed: Number(processed),
    retryableFailures: Number(retryableFailures),
  };
}

async function invokeOutbox(
  environment: SchedulerBindings,
  requestId: string,
  dependencies: SchedulerDependencies,
): Promise<OutboxResult> {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${environment.OUTBOX_CRON_SECRET}`,
    "User-Agent": "shapewebs-outbox-scheduler/1.0",
    "x-request-id": requestId,
    "x-vercel-protection-bypass": environment.VERCEL_AUTOMATION_BYPASS,
  };
  let response: Response;

  try {
    response = await dependencies.fetch(environment.OUTBOX_TARGET_URL, {
      cache: "no-store",
      headers,
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(outboxTimeoutMs),
    });
  } catch {
    throw new SchedulerFailure("outbox_unreachable");
  }

  if (response.status !== 200) {
    throw new SchedulerFailure("outbox_rejected");
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new SchedulerFailure("outbox_response_invalid");
  }

  return parseOutboxResult(
    await readBoundedText(response, maximumOutboxResponseBytes),
  );
}

async function sendHeartbeat(
  heartbeatUrl: URL,
  dependencies: SchedulerDependencies,
): Promise<void> {
  let response: Response;

  try {
    response = await dependencies.fetch(heartbeatUrl, {
      headers: {
        "User-Agent": "shapewebs-outbox-scheduler/1.0",
      },
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(heartbeatTimeoutMs),
    });
  } catch {
    throw new SchedulerFailure("heartbeat_unreachable");
  }

  if (response.status < 200 || response.status >= 300) {
    throw new SchedulerFailure("heartbeat_rejected");
  }
}

export async function runOutboxSchedule(
  controller: SchedulerController,
  environment: SchedulerBindings,
  dependencies: SchedulerDependencies = createRuntimeDependencies(),
): Promise<void> {
  const startedAt = dependencies.now();
  let requestId = "unavailable";
  const scheduledAt = new Date(controller.scheduledTime);
  let reasonCode: FailureReason = "unexpected_failure";

  try {
    requestId = dependencies.randomUUID();

    if (
      controller.cron !== expectedCron ||
      !Number.isFinite(controller.scheduledTime) ||
      Number.isNaN(scheduledAt.getTime())
    ) {
      throw new SchedulerFailure("unexpected_schedule");
    }

    const heartbeatUrl = validateBindings(environment);
    const outboxResult = await invokeOutbox(
      environment,
      requestId,
      dependencies,
    );
    await sendHeartbeat(heartbeatUrl, dependencies);
    const finishedAt = dependencies.now();

    dependencies.log({
      ...outboxResult,
      cron: controller.cron,
      durationMs: Math.max(0, finishedAt - startedAt),
      environment: expectedEnvironment,
      eventCode: "shapewebs.outbox.scheduler",
      level: "info",
      requestId,
      result: "success",
      scheduledAt: scheduledAt.toISOString(),
      service: "shapewebs-outbox-scheduler",
      timestamp: new Date(finishedAt).toISOString(),
    });
  } catch (error) {
    if (error instanceof SchedulerFailure) {
      reasonCode = error.reasonCode;
    }

    const finishedAt = dependencies.now();

    dependencies.log({
      cron: controller.cron,
      durationMs: Math.max(0, finishedAt - startedAt),
      environment: expectedEnvironment,
      eventCode: "shapewebs.outbox.scheduler",
      level: "error",
      reasonCode,
      requestId,
      result: "failure",
      scheduledAt: Number.isNaN(scheduledAt.getTime())
        ? "invalid"
        : scheduledAt.toISOString(),
      service: "shapewebs-outbox-scheduler",
      timestamp: new Date(finishedAt).toISOString(),
    });

    throw new Error(`Shapewebs scheduler failure: ${reasonCode}`);
  }
}
