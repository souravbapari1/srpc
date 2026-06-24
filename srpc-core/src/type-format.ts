import type { FieldNode, ParamNode, TypeNode } from "../../srpc-vscode/server/src/ast.ts";

export function typeNodeToContract(type: TypeNode): string {
  switch (type.kind) {
    case "primitive":
      return type.name;

    case "reference":
      return type.name;

    case "literal":
      return `"${type.value}"`;

    case "array":
      return `${typeNodeToContract(type.element)}[]`;

    case "list":
      return `list<${typeNodeToContract(type.element)}>`;

    case "map":
      return `map<${typeNodeToContract(type.key)}, ${typeNodeToContract(type.value)}>`;

    case "tuple":
      return `[${type.elements.map(typeNodeToContract).join(", ")}]`;

    case "union":
      return type.types.map(typeNodeToContract).join(" | ");

    case "inline-struct": {
      const fields = type.fields.map(fieldToContract).join(", ");
      return `{ ${fields} }`;
    }
  }
}

export function fieldToContract(field: FieldNode): string {
  return `${field.name}${field.optional ? "?" : ""}: ${typeNodeToContract(field.type)}`;
}

export function paramToContract(param: ParamNode): string {
  return `${param.name}: ${typeNodeToContract(param.type)}`;
}
