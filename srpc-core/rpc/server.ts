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
  createSrpcPlaygroundRouter,
  SRPC_PLAYGROUND_PATH,
  type CreateSrpcPlaygroundOptions,
} from "./playground.ts";
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
import {
  createSrpcDevToolsAuth,
  type SrpcDevToolsAuthOptions,
} from "./devtools-auth.ts";

export type { SrpcDevToolsAuthOptions };

export interface SrpcDocsServerOptions {
  /** Directory with `.ctr` / `.rpc` contract files. */
  contractDir: string;
  /** Docs base path. Defaults to `/docs`. */
  path?: string;
  /** Enable contract read/write API. Defaults to `true` when docs are enabled. */
  contractsApi?: boolean;
  /** Contract API base path. Defaults to `/api/contracts`. */
  contractsApiPath?: string;
}

export interface SrpcPlaygroundOptions {
  /** Directory with `.ctr` / `.rpc` contract files. */
  contractDir: string;
  /** Playground base path. Defaults to `/playground`. */
  path?: string;
}

export interface CreateSrpcServerOptions {
  /** `DefinedService[]` from `defineService()` — HTTP verbs are inferred automatically. */
  services: DefinedService[] | ServiceRegistry;
  path?: string;
  /** Optional override for inferred HTTP verbs. */
  httpMethods?: HttpMethodRegistry;
  /** Log incoming RPC requests and responses to the console when `true`. */
  logger?: SrpcLogger | boolean;
  /**
   * Protect `/docs`, `/playground`, and `/api/contracts` with API key and/or
   * HTTP Basic auth.
   */
  auth?: SrpcDevToolsAuthOptions;
  /** Serve contract docs at `/docs` (or custom path). */
  docs?: boolean | SrpcDocsServerOptions;
  /** Serve a built-in browser request tester at `/playground` (or custom path). */
  playground?: boolean | SrpcPlaygroundOptions;
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

  return { contractDir };
}

function mountWithAuth(
  router: Router,
  path: string,
  auth: SrpcDevToolsAuthOptions | undefined,
  handler: Router
): void {
  const guard = createSrpcDevToolsAuth(auth);
  if (guard) {
    router.use(path, guard);
  }

  router.use(path, handler);
}

function mountContractsApiRouter(
  router: Router,
  docs: boolean | SrpcDocsServerOptions | undefined,
  contractDir: string,
  serverAuth: SrpcDevToolsAuthOptions | undefined
): void {
  const options = resolveContractsApiOptions(docs, contractDir);
  if (!options) {
    return;
  }

  const apiPath =
    typeof docs === "object" && docs.contractsApiPath
      ? docs.contractsApiPath
      : SRPC_CONTRACTS_API_PATH;

  mountWithAuth(
    router,
    apiPath,
    serverAuth,
    createContractsApiRouter(options)
  );
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
  services: DefinedService[] | ServiceRegistry,
  serverAuth: SrpcDevToolsAuthOptions | undefined
): void {
  const docsOptions = resolveDocsOptions(docs, services);
  if (!docsOptions) {
    return;
  }

  const docsPath =
    typeof docs === "object" && docs.path ? docs.path : SRPC_DOCS_PATH;

  mountWithAuth(
    router,
    docsPath,
    serverAuth,
    createSrpcDocsRouter(docsOptions)
  );
}

function resolvePlaygroundOptions(
  playground: boolean | SrpcPlaygroundOptions | undefined,
  rpcPath: string
): CreateSrpcPlaygroundOptions | undefined {
  if (!playground) {
    return undefined;
  }

  return {
    contractDir:
      typeof playground === "object" ? playground.contractDir : "contract",
    rpcPath,
  };
}

function mountPlaygroundRouter(
  router: Router,
  playground: boolean | SrpcPlaygroundOptions | undefined,
  rpcPath: string,
  serverAuth: SrpcDevToolsAuthOptions | undefined
): void {
  const playgroundOptions = resolvePlaygroundOptions(playground, rpcPath);
  if (!playgroundOptions) {
    return;
  }

  const playgroundPath =
    typeof playground === "object" && playground.path
      ? playground.path
      : SRPC_PLAYGROUND_PATH;

  mountWithAuth(
    router,
    playgroundPath,
    serverAuth,
    createSrpcPlaygroundRouter(playgroundOptions)
  );
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

  mountDocsRouter(router, options.docs, options.services, options.auth);
  mountPlaygroundRouter(router, options.playground, path, options.auth);

  const contractDir =
    typeof options.docs === "object"
      ? options.docs.contractDir
      : options.docs
        ? "contract"
        : undefined;

  if (contractDir) {
    mountContractsApiRouter(router, options.docs, contractDir, options.auth);
  }

  return router;
}

export function createSrpcServer(options: CreateSrpcServerOptions): Express {
  const app = express();
  app.use(createSrpcRouter(options));
  return app;
}
