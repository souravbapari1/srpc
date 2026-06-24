import express, { type Express, type Router } from "express";
import {
  createSrpcDocsRouter,
  SRPC_DOCS_PATH,
  type CreateSrpcDocsOptions,
} from "./docs.ts";
import {
  createContractsApiRouter,
  SRPC_CONTRACTS_API_PATH,
  type CreateContractsApiOptions,
} from "./contracts-router.ts";
import {
  createSrpcHttpHandler,
  type HandleSrpcOptions,
  type HttpMethodRegistry,
  type ServiceRegistry,
} from "./handler.ts";
import { SRPC_RPC_PATH } from "./protocol.ts";
import {
  buildHttpMethodRegistryFromServices,
  buildServiceRegistry,
  type DefinedService,
} from "./registry.ts";
import {
  createConsoleSrpcLogger,
  type SrpcLogger,
} from "./logger.ts";

export interface SrpcDocsServerOptions {
  /** Directory with `.ctr` / `.rpc` contract files. */
  contractDir: string;
  /** Docs base path. Defaults to `/docs`. */
  path?: string;
  /** Enable contract read/write API. Defaults to `true` when docs are enabled. */
  contractsApi?: boolean | SrpcContractsApiOptions;
}

export interface SrpcContractsApiOptions {
  /** API base path. Defaults to `/api/contracts`. */
  path?: string;
  /** Require this key for write operations. */
  apiKey?: string;
}

export interface CreateSrpcServerOptions {
  /** `DefinedService[]` from `defineService()` — HTTP verbs are inferred automatically. */
  services: DefinedService[] | ServiceRegistry;
  path?: string;
  /** Optional override for inferred HTTP verbs. */
  httpMethods?: HttpMethodRegistry;
  /** Log incoming RPC requests and responses to the console when `true`. */
  logger?: SrpcLogger | boolean;
  /** Serve contract docs at `/docs` (or custom path). */
  docs?: boolean | SrpcDocsServerOptions;
}

function resolveContractsApiOptions(
  docs: boolean | SrpcDocsServerOptions | undefined,
  contractDir: string
): CreateContractsApiOptions | undefined {
  if (!docs) {
    return undefined;
  }

  if (typeof docs === "object" && docs.contractsApi === false) {
    return undefined;
  }

  const contractsApi =
    typeof docs === "object" && docs.contractsApi && typeof docs.contractsApi === "object"
      ? docs.contractsApi
      : undefined;

  return {
    contractDir,
    apiKey: contractsApi?.apiKey,
  };
}

function mountContractsApiRouter(
  router: Router,
  docs: boolean | SrpcDocsServerOptions | undefined,
  contractDir: string
): void {
  const options = resolveContractsApiOptions(docs, contractDir);
  if (!options) {
    return;
  }

  const apiPath =
    typeof docs === "object" &&
    docs.contractsApi &&
    typeof docs.contractsApi === "object" &&
    docs.contractsApi.path
      ? docs.contractsApi.path
      : SRPC_CONTRACTS_API_PATH;

  router.use(apiPath, createContractsApiRouter(options));
}

function resolveLogger(
  logger: SrpcLogger | boolean | undefined
): SrpcLogger | undefined {
  if (logger === true) {
    return createConsoleSrpcLogger();
  }

  if (logger === false || logger === undefined) {
    return undefined;
  }

  return logger;
}

function resolveServerOptions(options: CreateSrpcServerOptions): HandleSrpcOptions {
  const logger = resolveLogger(options.logger);

  if (Array.isArray(options.services)) {
    return {
      services: buildServiceRegistry(options.services),
      httpMethods:
        options.httpMethods ??
        buildHttpMethodRegistryFromServices(options.services),
      logger,
    };
  }

  return {
    services: options.services,
    httpMethods: options.httpMethods,
    logger,
  };
}

function resolveDocsOptions(
  docs: boolean | SrpcDocsServerOptions | undefined,
  services: DefinedService[] | ServiceRegistry
): CreateSrpcDocsOptions | undefined {
  if (!docs) {
    return undefined;
  }

  const contractDir =
    typeof docs === "object" ? docs.contractDir : "contract";

  if (!Array.isArray(services)) {
    return { contractDir };
  }

  return { contractDir, services };
}

function mountDocsRouter(
  router: Router,
  docs: boolean | SrpcDocsServerOptions | undefined,
  services: DefinedService[] | ServiceRegistry
): void {
  const docsOptions = resolveDocsOptions(docs, services);
  if (!docsOptions) {
    return;
  }

  const docsPath =
    typeof docs === "object" && docs.path ? docs.path : SRPC_DOCS_PATH;

  router.use(docsPath, createSrpcDocsRouter(docsOptions));
}

export function createSrpcRouter(options: CreateSrpcServerOptions): Router {
  const router = express.Router();
  const path = options.path ?? SRPC_RPC_PATH;
  const handler = createSrpcHttpHandler(resolveServerOptions(options));

  router.get(path, handler);
  router.post(path, express.json(), handler);
  router.put(path, express.json(), handler);
  router.patch(path, express.json(), handler);
  router.delete(path, handler);

  mountDocsRouter(router, options.docs, options.services);

  const contractDir =
    typeof options.docs === "object"
      ? options.docs.contractDir
      : options.docs
        ? "contract"
        : undefined;

  if (contractDir) {
    mountContractsApiRouter(router, options.docs, contractDir);
  }

  return router;
}

export function createSrpcServer(options: CreateSrpcServerOptions): Express {
  const app = express();
  app.use(createSrpcRouter(options));
  return app;
}
