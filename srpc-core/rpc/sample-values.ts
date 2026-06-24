import type { ContractDocsStore, MethodDoc, StructDoc } from "../src/contract-docs.ts";

export interface SampleValueOptions {
  depth?: number;
  maxDepth?: number;
  fieldName?: string;
  includeOptional?: boolean;
}

const DEFAULT_MAX_DEPTH = 8;

export function buildMethodParamsSample(
  store: ContractDocsStore,
  packageName: string,
  method: MethodDoc,
  options: Pick<SampleValueOptions, "includeOptional"> = {}
): unknown {
  if (method.params.length === 0) {
    return {};
  }

  if (method.params.length === 1) {
    const param = method.params[0]!;
    return buildSampleValue(store, packageName, param.type, {
      fieldName: param.name,
      includeOptional: options.includeOptional ?? true,
    });
  }

  return Object.fromEntries(
    method.params.map(param => [
      param.name,
      buildSampleValue(store, packageName, param.type, {
        fieldName: param.name,
        includeOptional: options.includeOptional ?? true,
      }),
    ])
  );
}

export function buildSampleValue(
  store: ContractDocsStore,
  packageName: string,
  rawType: string,
  options: SampleValueOptions = {}
): unknown {
  const depth = options.depth ?? 0;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const includeOptional = options.includeOptional ?? true;
  const fieldName = options.fieldName ?? "";

  const type = normalizeType(rawType);
  if (!type) {
    return sampleScalar("string", fieldName);
  }

  if (depth >= maxDepth) {
    if (type.endsWith("[]") || /^list<.+>$/.test(type)) {
      return [];
    }
    if (/^map<.+>$/.test(type)) {
      return {};
    }
    return sampleScalar("string", fieldName);
  }

  if (type.includes("|")) {
    const first = type.split("|").map(part => part.trim()).find(Boolean);
    return first
      ? buildSampleValue(store, packageName, first, {
          ...options,
          depth: depth + 1,
        })
      : null;
  }

  if (type.endsWith("[]")) {
    const item = buildSampleValue(store, packageName, type.slice(0, -2), {
      depth: depth + 1,
      maxDepth,
      includeOptional,
    });
    return [item];
  }

  const listMatch = /^list<(.+)>$/.exec(type);
  if (listMatch) {
    const item = buildSampleValue(store, packageName, listMatch[1]!, {
      depth: depth + 1,
      maxDepth,
      includeOptional,
    });
    return [item];
  }

  const mapMatch = /^map<.+,\s*(.+)>$/.exec(type);
  if (mapMatch) {
    return {
      example: buildSampleValue(store, packageName, mapMatch[1]!, {
        depth: depth + 1,
        maxDepth,
        includeOptional,
        fieldName: "value",
      }),
    };
  }

  if (/^\[.*\]$/.test(type)) {
    return [];
  }

  if (type.startsWith("{") && type.endsWith("}")) {
    return {};
  }

  const scalar = sampleScalar(type, fieldName);
  if (scalar !== undefined) {
    return scalar;
  }

  const enumDoc = resolveEnum(store, packageName, type);
  if (enumDoc) {
    return enumDoc.values[0] ?? "VALUE";
  }

  const struct = resolveStruct(store, packageName, type);
  if (struct) {
    return buildStructSample(store, packageName, struct, {
      depth: depth + 1,
      maxDepth,
      includeOptional,
    });
  }

  return sampleScalar("string", fieldName);
}

function buildStructSample(
  store: ContractDocsStore,
  packageName: string,
  struct: StructDoc,
  options: Required<Pick<SampleValueOptions, "depth" | "maxDepth" | "includeOptional">>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of struct.fields) {
    if (!options.includeOptional && field.optional) {
      continue;
    }
    result[field.name] = buildSampleValue(store, packageName, field.type, {
      ...options,
      fieldName: field.name,
    });
  }

  return result;
}

function sampleScalar(type: string, fieldName: string): unknown | undefined {
  const name = fieldName.toLowerCase();

  switch (type) {
    case "string":
    case "bytes":
      return sampleString(name);
    case "date":
      return sampleDate();
    case "datetime":
      return sampleDateTime(name);
    case "any":
      return "example";
    case "number":
    case "int":
      return sampleInt(name);
    case "float":
      return sampleFloat(name);
    case "boolean":
      return sampleBoolean(name);
    case "null":
      return null;
    default:
      return undefined;
  }
}

function sampleString(fieldName: string): string {
  if (fieldName === "message") return "hello";
  if (fieldName === "id" || fieldName.endsWith("id")) return "example-id";
  if (fieldName.includes("email")) return "user@example.com";
  if (fieldName.includes("slug")) return "example-slug";
  if (fieldName.includes("url")) return "https://example.com";
  if (fieldName.includes("phone")) return "+15551234567";
  if (fieldName.includes("password")) return "secret";
  if (fieldName.includes("code")) return "ABC123";
  if (fieldName.includes("token")) return "sample-token";
  if (fieldName.includes("name") || fieldName === "title" || fieldName === "label") {
    return "Example";
  }
  if (fieldName.includes("group")) return "day";
  if (fieldName.includes("sort")) return "createdAt";
  if (fieldName.includes("country")) return "US";
  if (fieldName.includes("city")) return "San Francisco";
  if (fieldName.includes("state")) return "CA";
  if (fieldName.includes("postal")) return "94105";
  if (fieldName.includes("line1")) return "123 Main St";
  if (fieldName.includes("line2")) return "Suite 100";
  if (fieldName.includes("currency")) return "USD";
  if (fieldName.includes("status")) return "ACTIVE";
  if (fieldName.includes("type")) return "STANDARD";
  return "example";
}

function sampleInt(fieldName: string): number {
  if (fieldName === "page") return 1;
  if (fieldName.includes("pagesize") || fieldName === "limit") return 20;
  if (fieldName.includes("amount")) return 1999;
  if (fieldName.includes("count") || fieldName.includes("total")) return 10;
  if (fieldName.includes("quantity") || fieldName.includes("qty")) return 5;
  if (fieldName.includes("width")) return 800;
  if (fieldName.includes("height")) return 600;
  if (fieldName.includes("sortorder")) return 1;
  return 1;
}

function sampleFloat(fieldName: string): number {
  if (fieldName.includes("rate")) return 0.05;
  if (fieldName.includes("latitude")) return 37.7749;
  if (fieldName.includes("longitude")) return -122.4194;
  return 1.5;
}

function sampleBoolean(fieldName: string): boolean {
  if (fieldName.startsWith("is") || fieldName.startsWith("has")) return false;
  if (fieldName.includes("success") || fieldName === "ok") return true;
  return true;
}

function sampleDate(): string {
  return "2025-06-01";
}

function sampleDateTime(fieldName: string): string {
  if (fieldName === "from" || fieldName.includes("start")) {
    return "2025-06-01T00:00:00.000Z";
  }
  if (fieldName === "to" || fieldName.includes("end")) {
    return "2025-06-24T23:59:59.000Z";
  }
  if (fieldName.includes("created")) return "2025-06-01T10:00:00.000Z";
  if (fieldName.includes("updated")) return "2025-06-24T12:00:00.000Z";
  return "2025-06-24T12:00:00.000Z";
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
