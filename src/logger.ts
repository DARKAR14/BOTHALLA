type LogLevel = "debug" | "info" | "warn" | "error";

const weights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  public constructor(private readonly minimumLevel: LogLevel = "info") {}

  public debug(message: string, context?: unknown): void {
    this.write("debug", message, context);
  }

  public info(message: string, context?: unknown): void {
    this.write("info", message, context);
  }

  public warn(message: string, context?: unknown): void {
    this.write("warn", message, context);
  }

  public error(message: string, context?: unknown): void {
    this.write("error", message, context);
  }

  private write(level: LogLevel, message: string, context?: unknown): void {
    if (weights[level] < weights[this.minimumLevel]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context === undefined ? {} : { context: serializeContext(context) }),
    };

    const output = JSON.stringify(entry);
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else console.log(output);
  }
}

function serializeContext(context: unknown): unknown {
  if (context instanceof Error) {
    return { name: context.name, message: context.message, stack: context.stack };
  }
  return context;
}
