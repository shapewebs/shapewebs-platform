export type StructuredLogLevel = "debug" | "info" | "warn" | "error";
export type ShapewebsService =
  "shapewebs-web" | "shapewebs-admin" | "shapewebs-worker";
export type ShapewebsEnvironment =
  "development" | "preview" | "production" | "test";
export type StructuredEventCode = `shapewebs.${string}`;
type StructuredEventResult = "success" | "failure" | "denied" | "degraded";

type SafeMetadata = {
  attempt?: number;
  count?: number;
  dependency?: "database" | "email" | "captcha" | "storage" | "unknown";
  httpStatus?: number;
  operation?: string;
  reasonCode?: string;
  resourceType?: string;
};

export type StructuredEvent = {
  actorIdHash?: string;
  durationMs?: number;
  eventCode: StructuredEventCode;
  level: StructuredLogLevel;
  metadata?: SafeMetadata;
  requestId?: string;
  result: StructuredEventResult;
  traceId?: string;
};

type StructuredLoggerOptions = {
  deploymentId?: string;
  environment: ShapewebsEnvironment;
  now?: () => Date;
  service: ShapewebsService;
  sink?: (level: StructuredLogLevel, line: string) => void;
};

const sensitiveKeyPattern =
  /authorization|cookie|credential|email|message|name|password|payload|secret|token/i;
const secretValuePattern =
  /(?:bearer\s+\S+|postgres(?:ql)?:\/\/|sk_[a-z0-9_-]+|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;

export function sanitizeLogValue(value: unknown, key = "", depth = 0): unknown {
  if (sensitiveKeyPattern.test(key)) {
    return "[REDACTED]";
  }

  if (depth > 4) {
    return "[TRUNCATED]";
  }

  if (typeof value === "string") {
    return secretValuePattern.test(value) ? "[REDACTED]" : value.slice(0, 500);
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => sanitizeLogValue(item, key, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 30)
        .map(([entryKey, entryValue]) => [
          entryKey,
          sanitizeLogValue(entryValue, entryKey, depth + 1),
        ]),
    );
  }

  return String(value).slice(0, 500);
}

function defaultSink(level: StructuredLogLevel, line: string): void {
  switch (level) {
    case "debug":
      console.debug(line);
      break;
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.info(line);
  }
}

export function createStructuredLogger(options: StructuredLoggerOptions) {
  const now = options.now ?? (() => new Date());
  const sink = options.sink ?? defaultSink;

  return {
    log(event: StructuredEvent): void {
      const safeEvent = sanitizeLogValue(event) as StructuredEvent;
      sink(
        event.level,
        JSON.stringify({
          timestamp: now().toISOString(),
          service: options.service,
          environment: options.environment,
          ...(options.deploymentId
            ? { deploymentId: options.deploymentId }
            : {}),
          ...safeEvent,
        }),
      );
    },
  };
}

export type ReadinessCheck = {
  check: () => Promise<void>;
  name: "database" | "email" | "captcha" | "storage";
};

export type ReadinessResult = {
  ready: boolean;
};

async function withTimeout(
  operation: Promise<void>,
  timeoutMs: number,
): Promise<void> {
  const timeoutState: { value?: ReturnType<typeof setTimeout> } = {};

  try {
    await Promise.race([
      operation,
      new Promise<void>((_, reject) => {
        timeoutState.value = setTimeout(
          () => reject(new Error("Readiness check timed out.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeoutState.value);
  }
}

export async function evaluateReadiness(
  checks: ReadinessCheck[],
  timeoutMs = 2_000,
): Promise<ReadinessResult> {
  if (checks.length === 0) {
    return { ready: false };
  }

  try {
    await Promise.all(
      checks.map(({ check }) => withTimeout(check(), timeoutMs)),
    );
    return { ready: true };
  } catch {
    return { ready: false };
  }
}
