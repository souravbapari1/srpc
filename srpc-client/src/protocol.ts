export const SRPC_VERSION = "1.0" as const;

export const SRPC_RPC_PATH = "/srpc";

export interface SrpcRequest {
  srpc: typeof SRPC_VERSION;
  service: string;
  method: string;
  id?: string;
  params?: unknown;
}

export interface SrpcErrorBody {
  code: number;
  message: string;
  /** Developer-facing error description. */
  detail?: string;
  data?: unknown;
}

export interface SrpcSuccessResponse {
  srpc: typeof SRPC_VERSION;
  id?: string;
  result: unknown;
}

export interface SrpcErrorResponse {
  srpc: typeof SRPC_VERSION;
  id?: string;
  error: SrpcErrorBody;
}

export type SrpcResponse = SrpcSuccessResponse | SrpcErrorResponse;

export const SrpcErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  SERVICE_NOT_FOUND: -32602,
  INVALID_PARAMS: -32602,
  METHOD_NOT_ALLOWED: -32604,
  INTERNAL_ERROR: -32603,
} as const;

export function isSrpcRequest(value: unknown): value is SrpcRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<SrpcRequest>;
  return (
    request.srpc === SRPC_VERSION &&
    typeof request.service === "string" &&
    typeof request.method === "string"
  );
}

export function buildSuccess(
  result: unknown,
  id?: string
): SrpcSuccessResponse {
  return {
    srpc: SRPC_VERSION,
    id,
    result,
  };
}

export function buildError(
  error: SrpcErrorBody,
  id?: string
): SrpcErrorResponse {
  return {
    srpc: SRPC_VERSION,
    id,
    error,
  };
}

export function servicePath(packageName: string, serviceName: string): string {
  return `${packageName}.${serviceName}`;
}

export function parseSrpcRequestFromQuery(
  query: Record<string, unknown>
): SrpcRequest | null {
  const srpc = query.srpc;
  const service = query.service;
  const method = query.method;

  if (
    srpc !== SRPC_VERSION ||
    typeof service !== "string" ||
    typeof method !== "string"
  ) {
    return null;
  }

  let params: unknown;

  if (typeof query.params === "string" && query.params.length > 0) {
    try {
      params = JSON.parse(query.params) as unknown;
    } catch {
      return null;
    }
  }

  return {
    srpc: SRPC_VERSION,
    service,
    method,
    id: typeof query.id === "string" ? query.id : undefined,
    params,
  };
}
