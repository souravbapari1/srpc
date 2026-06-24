export interface SrpcRequestLog {
  httpMethod: string;
  service: string;
  method: string;
  id?: string;
  params?: unknown;
}

export interface SrpcResponseLog {
  service: string;
  method: string;
  id?: string;
  durationMs: number;
  ok: boolean;
  code?: number;
  message?: string;
  detail?: string;
}

export interface SrpcLogger {
  request?(entry: SrpcRequestLog): void;
  response?(entry: SrpcResponseLog): void;
}

export interface ConsoleSrpcLoggerOptions {
  prefix?: string;
  colors?: boolean;
}

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
} as const;

export function createConsoleSrpcLogger(
  prefixOrOptions: string | ConsoleSrpcLoggerOptions = "srpc"
): SrpcLogger {
  const options =
    typeof prefixOrOptions === "string"
      ? { prefix: prefixOrOptions }
      : prefixOrOptions;
  const prefix = options.prefix ?? "srpc";
  const useColor = options.colors ?? supportsColor();

  const paint = (text: string, ...styles: string[]) =>
    useColor ? `${styles.join("")}${text}${ANSI.reset}` : text;

  const tag = paint(`[${prefix}]`, ANSI.gray, ANSI.bold);

  return {
    request(entry) {
      const route = paint(
        `${entry.service}.${entry.method}`,
        ANSI.blue,
        ANSI.bold
      );
      const id = entry.id
        ? ` ${paint("id=", ANSI.dim)}${paint(entry.id, ANSI.yellow)}`
        : "";
      const params =
        entry.params !== undefined
          ? ` ${paint("params=", ANSI.dim)}${paint(safeJson(entry.params), ANSI.gray)}`
          : "";

      console.log(
        `${tag} ${paint("→", ANSI.cyan, ANSI.bold)} ${colorHttpMethod(entry.httpMethod, useColor)} ${route}${id}${params}`
      );
    },
    response(entry) {
      const route = paint(
        `${entry.service}.${entry.method}`,
        ANSI.blue,
        ANSI.bold
      );
      const id = entry.id
        ? ` ${paint("id=", ANSI.dim)}${paint(entry.id, ANSI.yellow)}`
        : "";
      const duration = paint(`${entry.durationMs}ms`, ANSI.dim);

      if (entry.ok) {
        console.log(
          `${tag} ${paint("←", ANSI.green, ANSI.bold)} ${route}${id} ${paint("200", ANSI.green)} ${duration}`
        );
        return;
      }

      const code = paint(String(entry.code ?? "ERROR"), ANSI.red, ANSI.bold);
      const message = paint(entry.message ?? "Request failed", ANSI.red);
      const detail = entry.detail
        ? ` ${paint(entry.detail, ANSI.dim)}`
        : "";

      console.log(
        `${tag} ${paint("←", ANSI.red, ANSI.bold)} ${route}${id} ${code} ${message}${detail} ${duration}`
      );
    },
  };
}

function colorHttpMethod(method: string, useColor: boolean): string {
  const upper = method.toUpperCase();

  if (!useColor) {
    return upper;
  }

  const colors: Record<string, string> = {
    GET: ANSI.cyan,
    POST: ANSI.green,
    PUT: ANSI.yellow,
    PATCH: ANSI.magenta,
    DELETE: ANSI.red,
  };

  const style = colors[upper] ?? ANSI.white;
  return `${style}${ANSI.bold}${upper}${ANSI.reset}`;
}

function supportsColor(): boolean {
  if (typeof process === "undefined") {
    return false;
  }

  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  return process.stdout?.isTTY === true;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
