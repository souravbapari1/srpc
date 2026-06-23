export type SrpcHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface SrpcMethodMeta {
  httpMethod: SrpcHttpMethod;
}

export interface SrpcServiceMeta<
  TService extends object = object,
  TName extends string = string,
> {
  package: string;
  service: TName;
  methods: Record<string, SrpcMethodMeta>;
  /** @internal Phantom type link for inference — never set at runtime. */
  readonly __serviceType?: TService;
}

export function serviceMetaToPath(meta: SrpcServiceMeta): string {
  return `${meta.package}.${meta.service}`;
}

export function resolveMethodHttpMethod(
  meta: SrpcServiceMeta,
  methodName: string
): SrpcHttpMethod {
  return meta.methods[methodName]?.httpMethod ?? "POST";
}

export function buildHttpMethodRegistry(
  services: Record<string, SrpcServiceMeta>
): Record<string, Record<string, SrpcHttpMethod>> {
  const registry: Record<string, Record<string, SrpcHttpMethod>> = {};

  for (const meta of Object.values(services)) {
    const serviceKey = serviceMetaToPath(meta);
    registry[serviceKey] = {};

    for (const [methodName, methodMeta] of Object.entries(meta.methods)) {
      registry[serviceKey][methodName] = methodMeta.httpMethod;
    }
  }

  return registry;
}
