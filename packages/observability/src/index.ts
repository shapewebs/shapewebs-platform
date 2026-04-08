export type StructuredLogLevel = "debug" | "info" | "warn" | "error";

export function logStructuredEvent(
  level: StructuredLogLevel,
  event: string,
  data: Record<string, unknown> = {},
) {
  const logger = level === "error" ? console.error : console.log;
  logger(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...data,
    }),
  );
}
