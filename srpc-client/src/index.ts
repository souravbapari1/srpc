export {
  SrpcClient,
  SrpcError,
  createSrpcClient,
  createServiceClient,
  buildError,
} from "./client.ts";

export type {
  SrpcClientOptions,
  ServiceClientOptions,
  SrpcHttpOptions,
} from "./client.ts";

export {
  SRPC_VERSION,
  SRPC_RPC_PATH,
  SrpcErrorCode,
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
  buildHttpMethodRegistry,
  resolveMethodHttpMethod,
  serviceMetaToPath,
  type SrpcHttpMethod,
  type SrpcMethodMeta,
  type SrpcServiceMeta,
} from "./service-meta.ts";

export type { RpcClient } from "./types.ts";
