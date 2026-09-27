const isDev = process.env.NODE_ENV !== "production";

let initialized = false;

export function initCrashReporter(): void {
  if (initialized) return;
  initialized = true;
  if (isDev) {
    console.log("[CrashReporter] Initialized (development mode)");
  }
}

export function logError(error: Error, context?: Record<string, any>): void {
  const entry = {
    level: "error",
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  if (isDev) {
    console.error("[CrashReporter]", entry);
  }
}

export function logInfo(message: string, data?: Record<string, any>): void {
  const entry = {
    level: "info",
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  if (isDev) {
    console.log("[CrashReporter]", entry);
  }
}
