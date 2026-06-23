import type { TypeNode } from "../../srpc-vscode/server/src/ast.ts";

const SCALAR_MAP: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  int: "number",
  float: "number",
  bytes: "Uint8Array",
  any: "unknown",
  null: "null",
  date: "Date",
  datetime: "Date",
};

function referenceToTs(name: string): string {
  const segment = name.includes(".") ? name.split(".").pop()! : name;
  return segment;
}

export function typeNodeToTs(type: TypeNode): string {
  switch (type.kind) {
    case "primitive":
      return SCALAR_MAP[type.name] ?? type.name;

    case "reference":
      return referenceToTs(type.name);

    case "literal":
      return `"${type.value}"`;

    case "array":
      return `${typeNodeToTs(type.element)}[]`;

    case "list":
      return `${typeNodeToTs(type.element)}[]`;

    case "map":
      return `Record<${typeNodeToTs(type.key)}, ${typeNodeToTs(type.value)}>`;

    case "tuple":
      return `[${type.elements.map(typeNodeToTs).join(", ")}]`;

    case "union":
      return type.types.map(typeNodeToTs).join(" | ");

    case "inline-struct": {
      const fields = type.fields
        .map(
          field =>
            `${field.name}${field.optional ? "?" : ""}: ${typeNodeToTs(field.type)}`
        )
        .join("; ");
      return `{ ${fields} }`;
    }
  }
}
