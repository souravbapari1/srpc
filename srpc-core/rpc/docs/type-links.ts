import type { ContractDocsStore } from "../../src/contract-docs.ts";
import { escapeHtml } from "./escape.ts";
import type { TypeLinkRef } from "./types.ts";
import { cls } from "./ui.ts";

const PRIMITIVE_TYPES = new Set([
  "string",
  "int",
  "float",
  "boolean",
  "bool",
  "void",
  "any",
  "bytes",
  "double",
  "long",
  "date",
  "datetime",
  "timestamp",
]);

export function buildTypeLinkIndex(store: ContractDocsStore): Map<string, TypeLinkRef> {
  const index = new Map<string, TypeLinkRef>();

  for (const struct of store.getAllStructs()) {
    index.set(struct.qualifiedName, {
      kind: "struct",
      package: struct.package,
      name: struct.name,
      qualifiedName: struct.qualifiedName,
    });
  }

  for (const enumDoc of store.getAllEnums()) {
    index.set(enumDoc.qualifiedName, {
      kind: "enum",
      package: enumDoc.package,
      name: enumDoc.name,
      qualifiedName: enumDoc.qualifiedName,
    });
  }

  return index;
}

function resolveTypeRef(
  name: string,
  index: Map<string, TypeLinkRef>,
  contextPackage?: string
): TypeLinkRef | undefined {
  const trimmed = name.trim();
  if (!trimmed || PRIMITIVE_TYPES.has(trimmed)) {
    return undefined;
  }

  const qualified = index.get(trimmed);
  if (qualified) {
    return qualified;
  }

  if (contextPackage) {
    return index.get(`${contextPackage}.${trimmed}`);
  }

  return undefined;
}

export function collectContractTypeRefs(
  type: string,
  index: Map<string, TypeLinkRef>,
  contextPackage?: string
): TypeLinkRef[] {
  const refs: TypeLinkRef[] = [];
  const seen = new Set<string>();

  function addRef(ref: TypeLinkRef | undefined): void {
    if (!ref || seen.has(ref.qualifiedName)) {
      return;
    }
    seen.add(ref.qualifiedName);
    refs.push(ref);
  }

  function visit(typeStr: string): void {
    const trimmed = typeStr.trim();
    if (!trimmed || trimmed.startsWith("{")) {
      return;
    }

    const arrayMatch = trimmed.match(/^(.+)\[\]$/);
    if (arrayMatch) {
      visit(arrayMatch[1]!);
      return;
    }

    const listMatch = trimmed.match(/^list<(.+)>$/);
    if (listMatch) {
      visit(listMatch[1]!);
      return;
    }

    const mapMatch = trimmed.match(/^map<(.+),\s*(.+)>$/);
    if (mapMatch) {
      visit(mapMatch[1]!);
      visit(mapMatch[2]!);
      return;
    }

    if (trimmed.includes(" | ")) {
      for (const part of trimmed.split(" | ")) {
        visit(part);
      }
      return;
    }

    addRef(resolveTypeRef(trimmed, index, contextPackage));
  }

  visit(type);
  return refs;
}

function typeDocHref(ref: TypeLinkRef): string {
  const segment = ref.kind === "struct" ? "structs" : "enums";
  return `/docs/${ref.package}/${segment}/${ref.name}`;
}

function renderTypeLink(ref: TypeLinkRef, display: string): string {
  return `<a href="${escapeHtml(typeDocHref(ref))}" class="${cls.typeLink}">${escapeHtml(display)}</a>`;
}

export function linkifyContractType(
  type: string,
  index: Map<string, TypeLinkRef>,
  contextPackage?: string
): string {
  const trimmed = type.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("{")) {
    return `<span class="font-medium text-blue-700">${escapeHtml(trimmed)}</span>`;
  }

  const arrayMatch = trimmed.match(/^(.+)\[\]$/);
  if (arrayMatch) {
    return `${linkifyContractType(arrayMatch[1]!, index, contextPackage)}[]`;
  }

  const listMatch = trimmed.match(/^list<(.+)>$/);
  if (listMatch) {
    return `list&lt;${linkifyContractType(listMatch[1]!, index, contextPackage)}&gt;`;
  }

  const mapMatch = trimmed.match(/^map<(.+),\s*(.+)>$/);
  if (mapMatch) {
    return `map&lt;${linkifyContractType(mapMatch[1]!, index, contextPackage)}, ${linkifyContractType(mapMatch[2]!, index, contextPackage)}&gt;`;
  }

  if (trimmed.includes(" | ")) {
    return trimmed
      .split(" | ")
      .map(part => linkifyContractType(part, index, contextPackage))
      .join(" | ");
  }

  const ref = resolveTypeRef(trimmed, index, contextPackage);
  if (ref) {
    return renderTypeLink(ref, trimmed);
  }

  return `<span class="font-medium text-blue-700">${escapeHtml(trimmed)}</span>`;
}
