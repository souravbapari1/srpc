import type { ContractDocsStore, MethodDoc, StructDoc } from "../src/contract-docs.ts";

export type JsonSchema = Record<string, unknown>;

export function buildPlaygroundTypeDefinitions(
  store: ContractDocsStore
): Record<string, JsonSchema> {
  const structs = store.getAllStructs();
  const defs: Record<string, JsonSchema> = {};

  for (const struct of structs) {
    defs[definitionKey(struct.qualifiedName)] = {
      type: "object",
      properties: {},
    };
  }

  for (const struct of structs) {
    defs[definitionKey(struct.qualifiedName)] = buildStructSchema(
      store,
      struct.package,
      struct
    );
  }

  return defs;
}

export function buildMethodRequestSchema(
  store: ContractDocsStore,
  packageName: string,
  qualifiedService: string,
  methodName: string,
  params: MethodDoc["params"],
  typeDefinitions: Record<string, JsonSchema>
): JsonSchema {
  const paramsSchema = dereferenceSchema(
    buildParamsSchema(store, packageName, params),
    typeDefinitions
  );

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    definitions: typeDefinitions,
    properties: {
      srpc: { type: "string", const: "1.0" },
      service: { type: "string", const: qualifiedService },
      method: { type: "string", const: methodName },
      params: paramsSchema,
      id: { type: ["string", "number"] },
    },
    required: ["srpc", "service", "method", "params"],
    additionalProperties: false,
  };
}

function dereferenceSchema(
  schema: JsonSchema,
  definitions: Record<string, JsonSchema>,
  seen = new Set<string>()
): JsonSchema {
  if (typeof schema.$ref === "string") {
    const match = /^#\/definitions\/(.+)$/.exec(schema.$ref);
    if (match) {
      const key = match[1]!;
      if (seen.has(key)) {
        return { type: "object" };
      }
      const nextSeen = new Set(seen);
      nextSeen.add(key);
      const resolved = definitions[key];
      if (resolved) {
        return dereferenceSchema(resolved, definitions, nextSeen);
      }
    }
  }

  const result: JsonSchema = { ...schema };
  delete result.$ref;

  if (result.properties && typeof result.properties === "object") {
    result.properties = Object.fromEntries(
      Object.entries(result.properties as Record<string, JsonSchema>).map(
        ([key, value]) => [key, dereferenceSchema(value, definitions, new Set(seen))]
      )
    );
  }

  if (result.items && typeof result.items === "object") {
    result.items = dereferenceSchema(result.items as JsonSchema, definitions, new Set(seen));
  }

  if (Array.isArray(result.oneOf)) {
    result.oneOf = (result.oneOf as JsonSchema[]).map(item =>
      dereferenceSchema(item, definitions, new Set(seen))
    );
  }

  if (result.additionalProperties && typeof result.additionalProperties === "object") {
    result.additionalProperties = dereferenceSchema(
      result.additionalProperties as JsonSchema,
      definitions,
      new Set(seen)
    );
  }

  return result;
}

function buildParamsSchema(
  store: ContractDocsStore,
  packageName: string,
  params: MethodDoc["params"]
): JsonSchema {
  if (params.length === 0) {
    return { type: "object", additionalProperties: true };
  }

  if (params.length === 1) {
    return typeToSchema(store, packageName, params[0]!.type);
  }

  const properties = Object.fromEntries(
    params.map(param => [param.name, typeToSchema(store, packageName, param.type)])
  );

  return {
    type: "object",
    properties,
    required: params.map(param => param.name),
  };
}

function buildStructSchema(
  store: ContractDocsStore,
  packageName: string,
  struct: StructDoc
): JsonSchema {
  const properties = Object.fromEntries(
    struct.fields.map(field => [
      field.name,
      {
        ...typeToSchema(store, packageName, field.type),
        ...(field.optional ? {} : {}),
      },
    ])
  );

  const required = struct.fields
    .filter(field => !field.optional)
    .map(field => field.name);

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function typeToSchema(
  store: ContractDocsStore,
  packageName: string,
  rawType: string
): JsonSchema {
  const type = normalizeType(rawType);

  if (!type) {
    return {};
  }

  if (type.includes("|")) {
    const variants = type.split("|").map(part => part.trim()).filter(Boolean);
    return {
      oneOf: variants.map(variant =>
        typeToSchema(store, packageName, variant)
      ),
    };
  }

  if (type.endsWith("[]")) {
    return {
      type: "array",
      items: typeToSchema(store, packageName, type.slice(0, -2)),
    };
  }

  const listMatch = /^list<(.+)>$/.exec(type);
  if (listMatch) {
    return {
      type: "array",
      items: typeToSchema(store, packageName, listMatch[1]!),
    };
  }

  const mapMatch = /^map<.+,\s*(.+)>$/.exec(type);
  if (mapMatch) {
    return {
      type: "object",
      additionalProperties: typeToSchema(store, packageName, mapMatch[1]!),
    };
  }

  if (/^\[.*\]$/.test(type)) {
    return { type: "array", items: {} };
  }

  if (type.startsWith("{") && type.endsWith("}")) {
    return { type: "object", additionalProperties: true };
  }

  switch (type) {
    case "string":
    case "bytes":
    case "date":
    case "datetime":
    case "any":
      return { type: "string" };
    case "number":
    case "int":
    case "float":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "null":
      return { type: "null" };
  }

  const enumDoc = resolveEnum(store, packageName, type);
  if (enumDoc) {
    return { type: "string", enum: enumDoc.values };
  }

  const struct = resolveStruct(store, packageName, type);
  if (struct) {
    return { $ref: `#/definitions/${definitionKey(struct.qualifiedName)}` };
  }

  return {};
}

function definitionKey(qualifiedName: string): string {
  return qualifiedName.replace(/\./g, "_");
}

function normalizeType(type: string): string {
  return type.trim().replace(/\?$/, "");
}

function resolveStruct(
  store: ContractDocsStore,
  packageName: string,
  type: string
): StructDoc | undefined {
  if (type.includes(".")) {
    const [pkg, name] = splitQualified(type);
    if (!pkg || !name) {
      return undefined;
    }
    return store.getStruct(pkg, name);
  }

  const local = store.getStruct(packageName, type);
  if (local) {
    return local;
  }

  const matches = store.getAllStructs().filter(struct => struct.name === type);
  return matches.length === 1 ? matches[0] : undefined;
}

function resolveEnum(
  store: ContractDocsStore,
  packageName: string,
  type: string
) {
  if (type.includes(".")) {
    const [pkg, name] = splitQualified(type);
    if (!pkg || !name) {
      return undefined;
    }
    return store.getEnum(pkg, name);
  }

  const local = store.getEnum(packageName, type);
  if (local) {
    return local;
  }

  const matches = store.getAllEnums().filter(enumDoc => enumDoc.name === type);
  return matches.length === 1 ? matches[0] : undefined;
}

function splitQualified(type: string): [string | undefined, string | undefined] {
  const parts = type.split(".");
  if (parts.length < 2) {
    return [undefined, undefined];
  }
  return [parts[0], parts[parts.length - 1]];
}
