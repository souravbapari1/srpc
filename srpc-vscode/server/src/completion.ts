import * as path from "path";
import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  GENERIC_TYPE_KEYWORDS,
  HTTP_METHOD_DECORATORS,
  KEYWORD_DOCS,
  SCALAR_TYPES,
  type DocumentNode,
  type Position,
} from "./ast";
import { positionInRange } from "./parser";
import { type WorkspaceIndex } from "./workspace";
import { uriToPath } from "./uri";

export type CompletionContext =
  | "keyword"
  | "type"
  | "none";

const TOP_LEVEL_KEYWORDS = [
  { label: "struct", snippet: "struct ${1:Name} {\n    $0\n}" },
  { label: "enum", snippet: "enum ${1:Name} {\n    $0\n}" },
  { label: "service", snippet: "service ${1:Name} {\n    @${2|get,post,put,patch,delete|} ${3:methodName}(\n        ${4:param}: ${5:string}\n    ) => ${6:string}\n}" },
  { label: "package", snippet: "package ${1:name}" },
] as const;

export function getBraceDepth(document: TextDocument, position: Position): number {
  const text = document.getText({
    start: { line: 0, character: 0 },
    end: position,
  });

  let depth = 0;

  for (const ch of text) {
    if (ch === "{") {
      depth++;
    }
    if (ch === "}") {
      depth--;
    }
  }

  return depth;
}

export function getCompletionContext(
  document: TextDocument,
  position: Position,
  ast: DocumentNode
): CompletionContext {
  const line = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line, character: Number.MAX_SAFE_INTEGER },
  });
  const beforeCursor = line.slice(0, position.character);

  if (
    /:\s*[\w."'|]*$/.test(beforeCursor) ||
    /=>\s*[\w."'|]*$/.test(beforeCursor) ||
    /map<\s*[\w."'|]*$/.test(beforeCursor) ||
    /map<\s*[\w."'|]*,\s*[\w."'|]*$/.test(beforeCursor) ||
    /list<\s*[\w."'|]*$/.test(beforeCursor) ||
    /\|\s*[\w."'|]*$/.test(beforeCursor)
  ) {
    return "type";
  }

  if (getBraceDepth(document, position) === 0 && /^\s*[a-zA-Z]*$/.test(beforeCursor)) {
    return "keyword";
  }

  return "none";
}

function getPrefix(beforeCursor: string, context: CompletionContext): string {
  if (context === "keyword") {
    return (beforeCursor.match(/^\s*([a-zA-Z]*)$/)?.[1] ?? "").toLowerCase();
  }

  if (context === "type") {
    const mapValueMatch = beforeCursor.match(/map<[^>]*,\s*([\w.]*)$/);
    if (mapValueMatch?.[1] !== undefined) {
      return mapValueMatch[1];
    }

    const mapKeyMatch = beforeCursor.match(/map<\s*([\w.]*)$/);
    if (mapKeyMatch?.[1] !== undefined) {
      return mapKeyMatch[1];
    }

    const fieldMatch = beforeCursor.match(/:\s*([\w.]*)$/);
    if (fieldMatch?.[1] !== undefined) {
      return fieldMatch[1];
    }

    return beforeCursor.match(/=>\s*([\w.]*)$/)?.[1] ?? "";
  }

  return "";
}

function matchesPrefix(label: string, prefix: string): boolean {
  if (!prefix) {
    return true;
  }

  return label.toLowerCase().startsWith(prefix.toLowerCase());
}

export function buildCompletions(
  document: TextDocument,
  position: Position,
  index: WorkspaceIndex
): CompletionItem[] {
  const file = index.getFile(document.uri);
  const ast = file?.parseResult.document ?? { declarations: [] };

  let context = getCompletionContext(document, position, ast);

  const line = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line, character: Number.MAX_SAFE_INTEGER },
  });
  const beforeCursor = line.slice(0, position.character);
  const items: CompletionItem[] = [];

  if (context === "none") {
    const depth = getBraceDepth(document, position);

    if (depth === 0) {
      context = "keyword";
    } else if (/@\s*[\w]*$/.test(beforeCursor)) {
      for (const [decorator, method] of Object.entries(HTTP_METHOD_DECORATORS)) {
        if (!matchesPrefix(decorator, beforeCursor.replace(/^.*@/, ""))) {
          continue;
        }

        items.push({
          label: `@${decorator}`,
          kind: CompletionItemKind.Keyword,
          detail: `HTTP ${method}`,
          insertText: `${decorator} `,
          sortText: `0_${decorator}`,
        });
      }

      return items;
    } else if (line.includes(":")) {
      context = "type";
    }
  }

  const prefix = getPrefix(beforeCursor, context);

  if (context === "keyword") {
    for (const keyword of TOP_LEVEL_KEYWORDS) {
      if (!matchesPrefix(keyword.label, prefix)) {
        continue;
      }

      items.push({
        label: keyword.label,
        kind: CompletionItemKind.Keyword,
        detail: KEYWORD_DOCS[keyword.label],
        insertText: keyword.snippet,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: `0_${keyword.label}`,
      });
    }

    for (const symbol of index.getAllSymbols()) {
      if (!matchesPrefix(symbol.name, prefix)) {
        continue;
      }

      items.push({
        label: symbol.name,
        kind: symbolKindToCompletionKind(symbol.kind),
        detail: `${symbol.kind} (in ${path.basename(uriToPath(symbol.uri))})`,
        insertText: symbol.name,
        sortText: `1_${symbol.name}`,
      });
    }
  }

  if (context === "type") {
    for (const primitive of SCALAR_TYPES) {
      if (!matchesPrefix(primitive, prefix)) {
        continue;
      }

      items.push({
        label: primitive,
        kind: CompletionItemKind.TypeParameter,
        detail: KEYWORD_DOCS[primitive],
        sortText: `0_${primitive}`,
      });
    }

    for (const generic of GENERIC_TYPE_KEYWORDS) {
      if (!matchesPrefix(generic, prefix)) {
        continue;
      }

      const snippet =
        generic === "map"
          ? "map<${1:string}, ${2:string}>"
          : `${generic}<\${1:string}>`;

      items.push({
        label: generic,
        kind: CompletionItemKind.Keyword,
        insertText: snippet,
        insertTextFormat: InsertTextFormat.Snippet,
        detail: KEYWORD_DOCS[generic],
        sortText: `0_${generic}`,
      });
    }

    const seen = new Set<string>();

    for (const symbol of index.getAllSymbols()) {
      if (symbol.kind === "service") {
        continue;
      }

      for (const label of [symbol.name, symbol.qualifiedName]) {
        if (seen.has(label) || !matchesPrefix(label, prefix)) {
          continue;
        }

        seen.add(label);
        items.push({
          label,
          kind: symbolKindToCompletionKind(symbol.kind),
          detail: `${symbol.kind} ${label}`,
          sortText: `1_${label}`,
        });
      }
    }
  }

  return items;
}

function symbolKindToCompletionKind(
  kind: "struct" | "enum" | "service"
): CompletionItemKind {
  switch (kind) {
    case "enum":
      return CompletionItemKind.Enum;
    case "service":
      return CompletionItemKind.Interface;
    case "struct":
      return CompletionItemKind.Class;
  }
}
