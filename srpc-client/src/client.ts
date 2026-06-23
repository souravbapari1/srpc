import {
  buildError,
  SRPC_RPC_PATH,
  SRPC_VERSION,
  SrpcErrorCode,
  type SrpcResponse,
} from "./protocol.ts";
import type { SrpcServiceMeta } from "./service-meta.ts";
import {
  resolveMethodHttpMethod,
  serviceMetaToPath,
} from "./service-meta.ts";
import type { SrpcHttpMethod } from "./service-meta.ts";
import type { RpcClient } from "./types.ts";

export interface SrpcHttpOptions {
  headers?: Record<string, string>;
  timeout?: number;
  withCredentials?: boolean;
  auth?: {
    username: string;
    password: string;
  };
  fetch?: typeof fetch;
}

export interface SrpcClientOptions extends SrpcHttpOptions {
  baseUrl: string;
  service: string;
  path?: string;
  methodHttpMethods?: Record<string, SrpcHttpMethod>;
}

export interface ServiceClientOptions extends SrpcHttpOptions {
  baseUrl: string;
  path?: string;
}

export class SrpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown
  ) {
    super(message);
    this.name = "SrpcError";
  }
}

export class SrpcClient {
  private readonly path: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: SrpcClientOptions) {
    this.path = options.path ?? SRPC_RPC_PATH;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);

    if (typeof this.fetchImpl !== "function") {
      throw new SrpcError(
        SrpcErrorCode.INTERNAL_ERROR,
        "fetch is not available in this environment."
      );
    }
  }

  async call<T>(method: string, params?: unknown): Promise<T> {
    const url = new URL(this.path, this.options.baseUrl);
    const headers = buildRequestHeaders(this.options);
    const httpMethod =
      this.options.methodHttpMethods?.[method] ?? ("POST" as SrpcHttpMethod);
    const requestId = createRequestId();
    const envelope = {
      srpc: SRPC_VERSION,
      service: this.options.service,
      method,
      id: requestId,
      params,
    };

    try {
      const init: RequestInit = {
        method: httpMethod,
        headers,
        credentials: this.options.withCredentials ? "include" : "same-origin",
        signal:
          this.options.timeout !== undefined
            ? AbortSignal.timeout(this.options.timeout)
            : undefined,
      };

      if (httpMethod === "GET") {
        url.searchParams.set("srpc", SRPC_VERSION);
        url.searchParams.set("service", this.options.service);
        url.searchParams.set("method", method);
        url.searchParams.set("id", requestId);

        if (params !== undefined) {
          url.searchParams.set("params", JSON.stringify(params));
        }

        headers.delete("Content-Type");
      } else {
        init.body = JSON.stringify(envelope);
      }

      const response = await this.fetchImpl(url, init);
      const body = await readResponseBody(response);

      if (!response.ok) {
        if (body !== undefined) {
          try {
            return parseSrpcResponse<T>(body);
          } catch (parseError) {
            if (parseError instanceof SrpcError) {
              throw parseError;
            }
          }
        }

        throw new SrpcError(
          SrpcErrorCode.INTERNAL_ERROR,
          `RPC request failed with status ${response.status}.`
        );
      }

      return parseSrpcResponse<T>(body);
    } catch (error) {
      if (error instanceof SrpcError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new SrpcError(SrpcErrorCode.INTERNAL_ERROR, "Request timed out.");
      }

      const message =
        error instanceof Error ? error.message : "RPC request failed";

      throw new SrpcError(SrpcErrorCode.INTERNAL_ERROR, message);
    }
  }
}

function buildRequestHeaders(options: SrpcHttpOptions): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
  });

  if (options.headers) {
    for (const [name, value] of Object.entries(options.headers)) {
      headers.set(name, value);
    }
  }

  if (options.auth) {
    headers.set(
      "Authorization",
      `Basic ${encodeBasicAuth(options.auth.username, options.auth.password)}`
    );
  }

  return headers;
}

function encodeBasicAuth(username: string, password: string): string {
  const value = `${username}:${password}`;

  if (typeof btoa === "function") {
    return btoa(value);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }

  throw new SrpcError(
    SrpcErrorCode.INTERNAL_ERROR,
    "Basic auth is not supported in this environment."
  );
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SrpcError(
      SrpcErrorCode.PARSE_ERROR,
      "Server returned a non-JSON response."
    );
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function parseSrpcResponse<T>(body: unknown): T {
  if (!isSrpcResponse(body)) {
    throw new SrpcError(
      SrpcErrorCode.PARSE_ERROR,
      "Server returned an invalid SRPC response."
    );
  }

  if ("error" in body) {
    throw new SrpcError(body.error.code, body.error.message, body.error.data);
  }

  return body.result as T;
}

export function createSrpcClient<T extends object>(
  options: SrpcClientOptions
): RpcClient<T> {
  const client = new SrpcClient(options);

  return new Proxy({} as RpcClient<T>, {
    get(_target, property) {
      if (typeof property !== "string") {
        return undefined;
      }

      return (params: unknown) => client.call(property, params);
    },
  });
}

/** Typed client using generated service metadata from your `.ctr` codegen. */
export function createServiceClient<TService extends object>(
  meta: SrpcServiceMeta<TService>,
  options: ServiceClientOptions
): RpcClient<TService> {
  return createSrpcClient<TService>({
    ...options,
    service: serviceMetaToPath(meta),
    methodHttpMethods: Object.fromEntries(
      Object.keys(meta.methods).map(methodName => [
        methodName,
        resolveMethodHttpMethod(meta, methodName),
      ])
    ),
  });
}

function isSrpcResponse(value: unknown): value is SrpcResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<SrpcResponse>;
  return response.srpc === SRPC_VERSION;
}

export { buildError };
