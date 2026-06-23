import express, { type Express, type Router } from "express";
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

export interface CreateSrpcServerOptions {
  /** `DefinedService[]` from `defineService()` — HTTP verbs are inferred automatically. */
  services: DefinedService[] | ServiceRegistry;
  path?: string;
  /** Optional override for inferred HTTP verbs. */
  httpMethods?: HttpMethodRegistry;
}

function resolveServerOptions(options: CreateSrpcServerOptions): HandleSrpcOptions {
  if (Array.isArray(options.services)) {
    return {
      services: buildServiceRegistry(options.services),
      httpMethods:
        options.httpMethods ??
        buildHttpMethodRegistryFromServices(options.services),
    };
  }

  return {
    services: options.services,
    httpMethods: options.httpMethods,
  };
}

export function createSrpcRouter(options: CreateSrpcServerOptions): Router {
  const router = express.Router();
  const path = options.path ?? SRPC_RPC_PATH;
  const handler = createSrpcHttpHandler(resolveServerOptions(options));

  router.get(path, handler);
  router.post(path, express.json(), handler);
  router.put(path, express.json(), handler);
  router.patch(path, express.json(), handler);
  router.delete(path, express.json(), handler);

  return router;
}

export function createSrpcServer(options: CreateSrpcServerOptions): Express {
  const app = express();
  app.use(createSrpcRouter(options));
  return app;
}
