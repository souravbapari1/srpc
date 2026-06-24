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

export {
  createDevToolsAuth,
  createSrpcDevToolsAuth,
  mergeDevToolsAuth,
  readApiKey,
  readDevToolsAuthFromEnv,
  type CreateDevToolsAuthInput,
  type SrpcDevToolsAuthOptions,
} from "./devtools-auth.ts";

export { createSrpcRouter, createSrpcServer } from "./server.ts";
export type {
  CreateSrpcServerOptions,
  SrpcDocsServerOptions,
  SrpcPlaygroundOptions,
} from "./server.ts";

export {
  createSrpcDocsRouter,
  createSrpcDocsStore,
  SRPC_DOCS_PATH,
  type CreateSrpcDocsOptions,
} from "./docs.ts";

export {
  createContractsApiRouter,
  createContractsApiStore,
  SRPC_CONTRACTS_API_PATH,
  type CreateContractsApiOptions,
} from "./contracts-router.ts";

export {
  createSrpcPlaygroundRouter,
  SRPC_PLAYGROUND_PATH,
  type CreateSrpcPlaygroundOptions,
} from "./playground.ts";

export {
  buildContractGraph,
  type BuildContractGraphOptions,
  type ContractGraph,
  type ContractGraphEdge,
  type ContractGraphNode,
} from "./docs/contract-graph.ts";

export {
  createConsoleSrpcLogger,
  type ConsoleSrpcLoggerOptions,
  type SrpcLogger,
  type SrpcRequestLog,
  type SrpcResponseLog,
} from "./logger.ts";

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
