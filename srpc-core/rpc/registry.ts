import type { ServiceMethodHandler } from "./handler.ts";
import type { SrpcHandlerContext } from "./context.ts";
import { servicePath } from "./protocol.ts";
import type { SrpcHttpMethod, SrpcServiceMeta } from "./service-meta.ts";
import { resolveMethodHttpMethod } from "./service-meta.ts";
import type { HttpMethodRegistry } from "./handler.ts";

export type ServiceHandlers<T> = {
  [K in keyof T as T[K] extends (...args: never) => unknown ? K : never]: T[K] extends (
    params: infer P
  ) => infer R
    ? (params: P, ctx: SrpcHandlerContext) => R | Promise<R>
    : never;
};

export interface DefinedService {
  key: string;
  packageName: string;
  serviceName: string;
  handlers: Record<string, ServiceMethodHandler>;
  methodHttpMethods: Record<string, SrpcHttpMethod>;
}

/** Register handlers using generated service metadata (`UserService` const). */
export function defineService<TService extends object>(
  meta: SrpcServiceMeta<TService, string>,
  handlers: ServiceHandlers<TService>
): DefinedService {
  const methodHttpMethods: Record<string, SrpcHttpMethod> = {};

  for (const methodName of Object.keys(meta.methods)) {
    methodHttpMethods[methodName] = resolveMethodHttpMethod(meta, methodName);
  }

  return {
    key: servicePath(meta.package, meta.service),
    packageName: meta.package,
    serviceName: meta.service,
    handlers: handlers as Record<string, ServiceMethodHandler>,
    methodHttpMethods,
  };
}

export function buildServiceRegistry(
  services: DefinedService[]
): Record<string, Record<string, ServiceMethodHandler>> {
  const registry: Record<string, Record<string, ServiceMethodHandler>> = {};

  for (const service of services) {
    registry[service.key] = service.handlers;
  }

  return registry;
}

export function buildHttpMethodRegistryFromServices(
  services: DefinedService[]
): HttpMethodRegistry {
  const registry: HttpMethodRegistry = {};

  for (const service of services) {
    registry[service.key] = service.methodHttpMethods;
  }

  return registry;
}
