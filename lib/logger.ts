type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, string | number | boolean | null | undefined>;

function write(level: LogLevel, scope: string, message: string, meta?: LogMeta) {
  const payload = meta ? { scope, message, ...meta } : { scope, message };
  const line = JSON.stringify(payload);

  switch (level) {
    case "debug":
      console.debug(line);
      break;
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export const logger = {
  debug: (scope: string, message: string, meta?: LogMeta) => write("debug", scope, message, meta),
  info: (scope: string, message: string, meta?: LogMeta) => write("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: LogMeta) => write("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: LogMeta) => write("error", scope, message, meta),
};
