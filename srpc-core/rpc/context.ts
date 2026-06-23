import type { Request } from "express";
import type { SrpcRequest } from "./protocol.ts";

export interface SrpcHandlerContext {
  /** Normalized lower-case header map. */
  headers: Record<string, string | string[] | undefined>;
  /** SRPC request id from the client payload. */
  requestId?: string;
  service: string;
  method: string;
  ip?: string;
  /** Original Express request (headers, cookies, auth middleware, etc.). */
  request: Request;
  getHeader(name: string): string | undefined;
  getBearerToken(): string | undefined;
}

export function createHandlerContext(
  request: Request,
  rpc: SrpcRequest
): SrpcHandlerContext {
  const headers = request.headers;

  return {
    headers,
    requestId: rpc.id,
    service: rpc.service,
    method: rpc.method,
    ip: request.ip,
    request,
    getHeader(name: string) {
      const value = request.get(name);
      return value ?? undefined;
    },
    getBearerToken() {
      const authorization = request.get("authorization");

      if (!authorization?.startsWith("Bearer ")) {
        return undefined;
      }

      return authorization.slice("Bearer ".length).trim();
    },
  };
}
