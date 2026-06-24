import type { MethodDoc } from "../../src/contract-docs.ts";

export function exampleRequest(service: string, method: MethodDoc): string {
  const params = exampleParams(method);
  return JSON.stringify(
    {
      srpc: "1.0",
      service,
      method: method.name,
      id: "req-1",
      params,
    },
    null,
    2
  );
}

export function exampleParams(method: MethodDoc): Record<string, unknown> {
  if (method.params.length === 0) {
    return {};
  }

  if (method.params.length === 1) {
    const param = method.params[0]!;
    if (param.name === "data") {
      const nested = exampleNestedValue(param.type);
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        return nested as Record<string, unknown>;
      }
      return { value: nested };
    }
    return { [param.name]: exampleNestedValue(param.type) };
  }

  const result: Record<string, unknown> = {};
  for (const param of method.params) {
    result[param.name] = exampleNestedValue(param.type);
  }
  return result;
}

function exampleNestedValue(type: string): unknown {
  if (type.includes("IdRequest") || type.endsWith(".IdRequest")) {
    return { id: "example-id" };
  }
  if (type.includes("SlugRequest")) return { slug: "example-slug" };
  if (type.includes("PaginationRequest")) {
    return { page: 1, pageSize: 20 };
  }
  if (type.includes("string")) return "example";
  if (type.includes("int") || type.includes("number") || type.includes("float")) return 1;
  if (type.includes("boolean")) return true;
  if (type.endsWith("[]")) return [];
  if (type.startsWith("map<")) return {};
  return {};
}
