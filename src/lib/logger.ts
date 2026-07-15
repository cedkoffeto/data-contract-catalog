function ts(): string {
  return new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

function prefix(level: string, args: unknown[]): unknown[] {
  return [`[${ts()}] [${level}]`, ...args];
}

export const logger = {
  info: (...args: unknown[]) => console.info(...prefix("INFO", args)),
  warn: (...args: unknown[]) => console.warn(...prefix("WARN", args)),
  error: (...args: unknown[]) => console.error(...prefix("ERROR", args)),
  debug: (...args: unknown[]) => console.debug(...prefix("DEBUG", args)),
};

if (typeof window === "undefined") {
  const origInfo = console.info;
  const origWarn = console.warn;
  const origError = console.error;
  const origDebug = console.debug;
  console.info = (...args) => origInfo(...prefix("INFO", args));
  console.warn = (...args) => origWarn(...prefix("WARN", args));
  console.error = (...args) => origError(...prefix("ERROR", args));
  console.debug = (...args) => origDebug(...prefix("DEBUG", args));
}
