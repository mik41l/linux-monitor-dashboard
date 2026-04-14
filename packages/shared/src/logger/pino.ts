type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

interface SharedLoggerOptions {
  name: string;
  level: LogLevel;
  timestamp: true;
  formatters: {
    level: (label: string) => { level: string };
  };
  base?: Record<string, string | number | boolean | null>;
}

export interface SharedLoggerContext {
  name: string;
  level: LogLevel;
  base?: Record<string, string | number | boolean | null>;
}

export function createSharedLoggerOptions(context: SharedLoggerContext): SharedLoggerOptions {
  return {
    name: context.name,
    level: context.level,
    timestamp: true,
    formatters: {
      level(label) {
        return {
          level: label
        };
      }
    },
    ...(context.base ? { base: context.base } : {})
  };
}
