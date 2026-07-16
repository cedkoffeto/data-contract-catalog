function timestamp(): string {
  return new Date().toISOString();
}

const isProd = process.env.NODE_ENV === "production";
const hasStdout = typeof process !== "undefined" && !!process.stdout?.write;
const hasStderr = typeof process !== "undefined" && !!process.stderr?.write;

function format(
  level: string,
  args: unknown[],
  color: string,
  reset: string,
): string {
  const ts = timestamp();
  if (isProd) {
    return JSON.stringify({ ts, level, msg: args });
  }
  const msg = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
  return `${color}[${ts}] [${level}]${reset} ${msg}`;
}

function writeOut(formatted: string) {
  if (hasStdout) {
    process.stdout.write(formatted + "\n");
  } else {
    console.log(formatted);
  }
}

function writeErr(formatted: string) {
  if (hasStderr) {
    process.stderr.write(formatted + "\n");
  } else {
    console.error(formatted);
  }
}

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

export const logger = {
  info: (...args: unknown[]) =>
    writeOut(format("INFO", args, BLUE, RESET)),
  warn: (...args: unknown[]) =>
    writeErr(format("WARN", args, YELLOW, RESET)),
  error: (...args: unknown[]) =>
    writeErr(format("ERROR", args, RED, RESET)),
  debug: (...args: unknown[]) =>
    writeOut(format("DEBUG", args, GRAY, RESET)),
};
