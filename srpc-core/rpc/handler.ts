import type { Request, Response } from "express";
import {
  createHandlerContext,
  type SrpcHandlerContext,
} from "./context.ts";
import {
  buildError,
  buildSuccess,
  isSrpcRequest,
  parseSrpcRequestFromQuery,
  SRPC_VERSION,
  SrpcErrorCode,
  type SrpcRequest,
} from "./protocol.ts";
import type { SrpcHttpMethod } from "./service-meta.ts";

export type ServiceMethodHandler = (
  params: unknown,
  context: SrpcHandlerContext
) => unknown | Promise<unknown>;

export type ServiceRegistry = Record<
  string,
  Record<string, ServiceMethodHandler>
>;

export type HttpMethodRegistry = Record<
  string,
  Record<string, SrpcHttpMethod>
>;

export interface HandleSrpcOptions {
  services: ServiceRegistry;
  httpMethods?: HttpMethodRegistry;
}

export async function handleSrpcRequest(
  body: unknown,
  options: HandleSrpcOptions,
  request?: Request
): Promise<ReturnType<typeof buildSuccess> | ReturnType<typeof buildError>> {
  if (!isSrpcRequest(body)) {
    return buildError({
      code: SrpcErrorCode.INVALID_REQUEST,
      message: `Invalid SRPC request. Expected srpc=${SRPC_VERSION}, service, and method.`,
    });
  }

  const methodError = validateHttpMethod(body, options, request?.method);

  if (methodError) {
    return methodError;
  }

  if (!request) {
    return dispatchRequest(body, options, createFallbackContext(body));
  }

  return dispatchRequest(
    body,
    options,
    createHandlerContext(request, body)
  );
}

export function createSrpcHttpHandler(options: HandleSrpcOptions) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const body = readSrpcPayload(req);
      const response = await handleSrpcRequest(body, options, req);
      const status = "error" in response ? 400 : 200;
      res.status(status).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";

      res.status(500).json(
        buildError({
          code: SrpcErrorCode.INTERNAL_ERROR,
          message,
        })
      );
    }
  };
}

function readSrpcPayload(req: Request): unknown {
  if (req.method === "GET") {
    return parseSrpcRequestFromQuery(req.query as Record<string, unknown>);
  }

  return req.body;
}

function validateHttpMethod(
  rpc: SrpcRequest,
  options: HandleSrpcOptions,
  incomingMethod?: string
): ReturnType<typeof buildError> | null {
  if (!incomingMethod || !options.httpMethods) {
    return null;
  }

  const expected = options.httpMethods[rpc.service]?.[rpc.method] ?? "POST";
  const actual = incomingMethod.toUpperCase();

  if (actual !== expected) {
    return buildError(
      {
        code: SrpcErrorCode.METHOD_NOT_ALLOWED,
        message: `Method '${rpc.method}' on '${rpc.service}' must be called with HTTP ${expected}, received ${actual}.`,
      },
      rpc.id
    );
  }

  return null;
}

async function dispatchRequest(
  rpc: SrpcRequest,
  options: HandleSrpcOptions,
  context: SrpcHandlerContext
) {
  const service = options.services[rpc.service];

  if (!service) {
    return buildError(
      {
        code: SrpcErrorCode.SERVICE_NOT_FOUND,
        message: `Service '${rpc.service}' not found.`,
      },
      rpc.id
    );
  }

  const handler = service[rpc.method];

  if (!handler) {
    return buildError(
      {
        code: SrpcErrorCode.METHOD_NOT_FOUND,
        message: `Method '${rpc.method}' not found on '${rpc.service}'.`,
      },
      rpc.id
    );
  }

  try {
    const result = await handler(rpc.params, context);
    return buildSuccess(result, rpc.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Handler execution failed";

    return buildError(
      {
        code: SrpcErrorCode.INTERNAL_ERROR,
        message,
      },
      rpc.id
    );
  }
}

function createFallbackContext(rpc: SrpcRequest): SrpcHandlerContext {
  const headers: Record<string, string | string[] | undefined> = {};

  return {
    headers,
    requestId: rpc.id,
    service: rpc.service,
    method: rpc.method,
    request: {} as Request,
    getHeader() {
      return undefined;
    },
    getBearerToken() {
      return undefined;
    },
  };
}
