import { trace } from "@opentelemetry/api";

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
  dependency?:
    "captcha" | "content" | "database" | "email" | "storage" | "unknown";
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
  getTraceId?: () => string | undefined;
  now?: () => Date;
  service: ShapewebsService;
  sink?: (level: StructuredLogLevel, line: string) => void;
};

export function resolveShapewebsEnvironment(
  environment: Record<string, string | undefined> = process.env,
): ShapewebsEnvironment {
  if (environment.NODE_ENV === "test") {
    return "test";
  }

  if (environment.VERCEL_ENV === "preview") {
    return "preview";
  }

  if (
    environment.VERCEL_ENV === "production" ||
    environment.NODE_ENV === "production"
  ) {
    return "production";
  }

  return "development";
}

const sensitiveKeyPattern =
  /authorization|cookie|credential|email|message|name|password|payload|secret|token/i;
const secretValuePattern =
  /(?:bearer\s+\S+|postgres(?:ql)?:\/\/|(?:api[_-]?key|password|secret|token)=\S+|github_pat_[a-z0-9_]+|gh[pousr]_[a-z0-9]+|\bre_[a-z0-9_-]{16,}\b|\bsk_[a-z0-9_-]+\b|eyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;

export function sanitizeLogValue(value: unknown, key = "", depth = 0): unknown {
  if (value === undefined) {
    return undefined;
  }

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
        .flatMap(([entryKey, entryValue]) => {
          const sanitizedValue = sanitizeLogValue(
            entryValue,
            entryKey,
            depth + 1,
          );

          return sanitizedValue === undefined
            ? []
            : [[entryKey, sanitizedValue]];
        }),
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
  const getTraceId =
    options.getTraceId ??
    (() => {
      return trace.getActiveSpan()?.spanContext().traceId;
    });
  const now = options.now ?? (() => new Date());
  const sink = options.sink ?? defaultSink;

  return {
    log(event: StructuredEvent): void {
      const traceId = event.traceId ?? getTraceId();
      const safeEvent = sanitizeLogValue({
        ...event,
        ...(traceId ? { traceId } : {}),
      }) as StructuredEvent;
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
  name:
    | "account-portal"
    | "authentication"
    | "captcha"
    | "content"
    | "customer-database"
    | "database"
    | "email"
    | "storage";
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
