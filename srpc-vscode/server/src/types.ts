import type { TypeNode } from "./ast";

export function visitTypeNodes(
  type: TypeNode,
  visitor: (type: TypeNode) => void
): void {
  visitor(type);

  switch (type.kind) {
    case "array":
    case "list":
      visitTypeNodes(type.element, visitor);
      break;
    case "map":
      visitTypeNodes(type.key, visitor);
      visitTypeNodes(type.value, visitor);
      break;
    case "inline-struct":
      for (const field of type.fields) {
        visitTypeNodes(field.type, visitor);
      }
      break;
    case "tuple":
      for (const member of type.elements) {
        visitTypeNodes(member, visitor);
      }
      break;
    case "union":
      for (const member of type.types) {
        visitTypeNodes(member, visitor);
      }
      break;
    case "primitive":
    case "reference":
    case "literal":
      break;
  }
}

export function typeToString(type: TypeNode): string {
  switch (type.kind) {
    case "primitive":
      return type.name;
    case "reference":
      return type.name;
    case "literal":
      return `"${type.value}"`;
    case "array":
      return `${typeToString(type.element)}[]`;
    case "map":
      return `map<${typeToString(type.key)}, ${typeToString(type.value)}>`;
    case "list":
      return `list<${typeToString(type.element)}>`;
    case "tuple":
      return `[${type.elements.map(typeToString).join(", ")}]`;
    case "union":
      return type.types.map(typeToString).join(" | ");
    case "inline-struct": {
      const fields = type.fields
        .map(f => `${f.name}${f.optional ? "?" : ""}: ${typeToString(f.type)}`)
        .join(", ");
      return `{ ${fields} }`;
    }
  }
}
