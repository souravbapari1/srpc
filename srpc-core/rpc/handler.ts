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
  type SrpcRequest,
} from "./protocol.ts";
import {
  internalError,
  invalidRequestError,
  methodNotAllowedError,
  methodNotFoundError,
  serviceNotFoundError,
} from "./errors.ts";
import type { SrpcHttpMethod } from "./service-meta.ts";
import type { SrpcLogger } from "./logger.ts";

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
  logger?: SrpcLogger;
}

export async function handleSrpcRequest(
  body: unknown,
  options: HandleSrpcOptions,
  request?: Request
): Promise<ReturnType<typeof buildSuccess> | ReturnType<typeof buildError>> {
  const started = performance.now();
  const httpMethod = request?.method ?? "?";

  if (!isSrpcRequest(body)) {
    return buildError(
      invalidRequestError(
        `Invalid SRPC request. Expected srpc=${SRPC_VERSION}, service, and method.`
      )
    );
  }

  logRequest(options.logger, httpMethod, body);

  const methodError = validateHttpMethod(body, options, request?.method);

  const response = methodError
    ? methodError
    : !request
      ? await dispatchRequest(body, options, createFallbackContext(body))
      : await dispatchRequest(
          body,
          options,
          createHandlerContext(request, body)
        );

  logResponse(options.logger, body, response, performance.now() - started);
  return response;
}

export function createSrpcHttpHandler(options: HandleSrpcOptions) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const body = readSrpcPayload(req);
      const response = await handleSrpcRequest(body, options, req);
      const status = "error" in response ? 400 : 200;
      res.status(status).json(response);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Internal server error";

      res.status(500).json(buildError(internalError(detail)));
    }
  };
}

function logRequest(
  logger: SrpcLogger | undefined,
  httpMethod: string,
  body: unknown
): void {
  if (!logger?.request || !isSrpcRequest(body)) {
    return;
  }

  logger.request({
    httpMethod,
    service: body.service,
    method: body.method,
    id: body.id,
    params: body.params,
  });
}

function logResponse(
  logger: SrpcLogger | undefined,
  body: unknown,
  response: ReturnType<typeof buildSuccess> | ReturnType<typeof buildError>,
  durationMs: number
): void {
  if (!logger?.response || !isSrpcRequest(body)) {
    return;
  }

  logger.response({
    service: body.service,
    method: body.method,
    id: body.id,
    durationMs: Math.round(durationMs),
    ok: !("error" in response),
    code: "error" in response ? response.error.code : undefined,
    message: "error" in response ? response.error.message : undefined,
    detail: "error" in response ? response.error.detail : undefined,
  });
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
      methodNotAllowedError(rpc.service, rpc.method, expected, actual),
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
    return buildError(serviceNotFoundError(rpc.service), rpc.id);
  }

  const handler = service[rpc.method];

  if (!handler) {
    return buildError(methodNotFoundError(rpc.service, rpc.method), rpc.id);
  }

  try {
    const result = await handler(rpc.params, context);
    return buildSuccess(result, rpc.id);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Handler execution failed";

    return buildError(internalError(detail), rpc.id);
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
