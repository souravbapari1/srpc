import { SrpcErrorCode } from "./protocol.ts";

export interface StructuredSrpcError {
  code: number;
  message: string;
  detail: string;
  data?: unknown;
}

export function invalidRequestError(detail: string): StructuredSrpcError {
  return {
    code: SrpcErrorCode.INVALID_REQUEST,
    message: "The request could not be understood.",
    detail,
  };
}

export function serviceNotFoundError(service: string): StructuredSrpcError {
  return {
    code: SrpcErrorCode.SERVICE_NOT_FOUND,
    message: "That service is not available.",
    detail: `Service '${service}' not found.`,
  };
}

export function methodNotFoundError(
  service: string,
  method: string
): StructuredSrpcError {
  return {
    code: SrpcErrorCode.METHOD_NOT_FOUND,
    message: "That method is not available.",
    detail: `Method '${method}' not found on '${service}'.`,
  };
}

export function methodNotAllowedError(
  service: string,
  method: string,
  expected: string,
  actual: string
): StructuredSrpcError {
  return {
    code: SrpcErrorCode.METHOD_NOT_ALLOWED,
    message: `This request must use ${expected}, not ${actual}.`,
    detail: `Method '${method}' on '${service}' must be called with HTTP ${expected}, received ${actual}.`,
  };
}

export function internalError(detail: string): StructuredSrpcError {
  return {
    code: SrpcErrorCode.INTERNAL_ERROR,
    message: "Something went wrong while processing your request.",
    detail,
  };
}
