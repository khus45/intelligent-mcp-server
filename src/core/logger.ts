import type { AppConfig } from "../config.js";

const priorities = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type LogLevel = keyof typeof priorities;

export function createLogger(config: Pick<AppConfig, "logLevel">) {
  function write(
    level: LogLevel,
    event: string,
    context: Record<string, unknown> = {},
  ): void {
    if (priorities[level] < priorities[config.logLevel]) return;

    // STDIO transport owns stdout. Operational logs must only use stderr.
    process.stderr.write(
      `${JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...context })}\n`,
    );
  }

  return {
    debug: (event: string, context?: Record<string, unknown>) =>
      write("debug", event, context),
    info: (event: string, context?: Record<string, unknown>) =>
      write("info", event, context),
    warn: (event: string, context?: Record<string, unknown>) =>
      write("warn", event, context),
    error: (event: string, context?: Record<string, unknown>) =>
      write("error", event, context),
  };
}

export type Logger = ReturnType<typeof createLogger>;
