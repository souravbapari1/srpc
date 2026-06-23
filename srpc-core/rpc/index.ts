export {
  SRPC_VERSION,
  SRPC_RPC_PATH,
  SrpcErrorCode,
  buildError,
  buildSuccess,
  isSrpcRequest,
  parseSrpcRequestFromQuery,
  servicePath,
  type SrpcRequest,
  type SrpcResponse,
  type SrpcErrorBody,
  type SrpcSuccessResponse,
  type SrpcErrorResponse,
} from "./protocol.ts";

export {
  createSrpcHttpHandler,
  handleSrpcRequest,
  type ServiceRegistry,
  type ServiceMethodHandler,
  type HttpMethodRegistry,
} from "./handler.ts";

export {
  createHandlerContext,
  type SrpcHandlerContext,
} from "./context.ts";

export { createSrpcRouter, createSrpcServer } from "./server.ts";

export {
  buildServiceRegistry,
  buildHttpMethodRegistryFromServices,
  defineService,
  type DefinedService,
  type ServiceHandlers,
} from "./registry.ts";

export {
  buildHttpMethodRegistry,
  resolveMethodHttpMethod,
  serviceMetaToPath,
  type SrpcHttpMethod,
  type SrpcMethodMeta,
  type SrpcServiceMeta,
} from "./service-meta.ts";
