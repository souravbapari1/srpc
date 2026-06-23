import * as fs from "fs";
import * as path from "path";
import {
  type DocumentNode,
  type GlobalSymbolInfo,
  type ParseDiagnostic,
  type ParseResult,
  type Position,
  type Range,
  type SymbolLocation,
  type TypeNode,
} from "./ast";
import {
  collectSymbols,
  findSymbolAtPosition,
  parseDocument,
  parseDocumentSyntax,
} from "./parser";
import {
  getWorkspaceDiagnostics,
  suggestUniquePackageName,
} from "./packages";
import { typeToString, visitTypeNodes } from "./types";
import {
  getWordAtPosition,
  normalizeUri,
  canonicalPathForUri,
  pathToUri,
  uriToPath,
} from "./uri";

const CONTRACT_EXTENSIONS = new Set([".ctr", ".rpc"]);
const CONTRACT_DIRECTORY_NAMES = new Set(["contract", "contracts"]);

export interface FileState {
  uri: string;
  source: string;
  parseResult: ParseResult;
}

export class WorkspaceIndex {
  private readonly files = new Map<string, FileState>();
  private readonly symbolsByQualifiedName = new Map<string, GlobalSymbolInfo>();
  private readonly symbolsBySimpleName = new Map<string, GlobalSymbolInfo[]>();
  private readonly symbolsByUri = new Map<string, GlobalSymbolInfo[]>();

  getFile(uri: string): FileState | undefined {
    return this.files.get(normalizeUri(uri));
  }

  getAllFiles(): FileState[] {
    return [...this.files.values()];
  }

  getAllTypeSymbols(): GlobalSymbolInfo[] {
    return [...this.symbolsByQualifiedName.values()].filter(
      s => s.kind === "struct" || s.kind === "enum"
    );
  }

  getAllSymbols(): GlobalSymbolInfo[] {
    return [...this.symbolsByQualifiedName.values()];
  }

  getUsedPackageNames(excludeUri?: string): Set<string> {
    return this.getUsedTopLevelNames(excludeUri);
  }

  getUsedTopLevelNames(excludeUri?: string): Set<string> {
    const used = new Set<string>();
    const excluded = excludeUri ? normalizeUri(excludeUri) : undefined;

    for (const file of this.getAllFiles()) {
      if (excluded && file.uri === excluded) {
        continue;
      }

      const { packageName, declarations } = file.parseResult.document;

      if (packageName) {
        used.add(packageName);
      }

      for (const decl of declarations) {
        if (
          decl.kind === "struct" ||
          decl.kind === "enum" ||
          decl.kind === "service"
        ) {
          used.add(decl.name);
        }
      }
    }

    return used;
  }

  suggestPackageName(uri: string): string {
    return suggestUniquePackageName(this, uri);
  }

  lookupSymbol(name: string): GlobalSymbolInfo | undefined {
    if (this.symbolsByQualifiedName.has(name)) {
      return this.symbolsByQualifiedName.get(name);
    }

    const simple = name.includes(".") ? name.split(".").pop()! : name;
    const matches = this.symbolsBySimpleName.get(simple) ?? [];

    if (matches.length === 1) {
      return matches[0];
    }

    for (const match of matches) {
      if (match.qualifiedName === name) {
        return match;
      }
    }

    return undefined;
  }

  updateFile(uri: string, source: string): void {
    const normalizedUri = normalizeUri(uri);
    this.evictAliasFiles(normalizedUri);
    this.removeSymbolsForUri(normalizedUri);

    const syntax = parseDocumentSyntax(source);
    this.files.set(normalizedUri, { uri: normalizedUri, source, parseResult: syntax });
    this.indexSymbols(normalizedUri, syntax.document);
    this.revalidateAll();
  }

  removeFile(uri: string): void {
    const normalizedUri = normalizeUri(uri);
    this.removeSymbolsForUri(normalizedUri);
    this.files.delete(normalizedUri);
    this.revalidateAll();
  }

  loadFile(uri: string, source: string): void {
    const normalizedUri = normalizeUri(uri);
    this.evictAliasFiles(normalizedUri);
    this.removeSymbolsForUri(normalizedUri);
    const syntax = parseDocumentSyntax(source);
    this.files.set(normalizedUri, { uri: normalizedUri, source, parseResult: syntax });
    this.indexSymbols(normalizedUri, syntax.document);
  }

  finishLoading(): void {
    this.revalidateAll();
  }

  getVisibleTypes(uri: string): Set<string> {
    const file = this.files.get(uri);
    if (!file) {
      return new Set();
    }

    return this.buildVisibleTypes(uri, file.parseResult.document);
  }

  findDefinition(uri: string, position: Position): SymbolLocation | null {
    const normalizedUri = normalizeUri(uri);
    const file = this.files.get(normalizedUri);
    if (!file) {
      return null;
    }

    const symbol = findSymbolAtPosition(file.parseResult.document, position);
    const names = new Set<string>();

    if (symbol) {
      names.add(symbol.name);
    }

    const word = getWordAtPosition(file.source, position);
    if (word) {
      names.add(word);
    }

    for (const name of names) {
      const local = file.parseResult.document.declarations.find(
        d => d.name === name
      );

      if (local) {
        return { uri: normalizedUri, range: local.nameSpan.range };
      }

      const global = this.lookupSymbol(name);
      if (global) {
        return { uri: global.uri, range: global.range };
      }
    }

    return null;
  }

  findReferences(
    uri: string,
    position: Position
  ): SymbolLocation[] {
    const file = this.files.get(uri);
    if (!file) {
      return [];
    }

    const symbol = findSymbolAtPosition(file.parseResult.document, position);
    if (!symbol) {
      return [];
    }

    const targetNames = new Set<string>([symbol.name]);

    const global = this.lookupSymbol(symbol.name);
    if (global) {
      targetNames.add(global.name);
      targetNames.add(global.qualifiedName);
    }

    const localDecl = file.parseResult.document.declarations.find(
      d => d.name === symbol.name
    );

    if (localDecl) {
      targetNames.add(localDecl.name);
      if (file.parseResult.document.packageName) {
        targetNames.add(
          `${file.parseResult.document.packageName}.${localDecl.name}`
        );
      }
    }

    const references: SymbolLocation[] = [];

    for (const [fileUri, state] of this.files) {
      references.push(
        ...findTypeReferencesInDocument(
          state.parseResult.document,
          targetNames,
          fileUri
        )
      );

      if (targetNames.has(symbol.name)) {
        for (const decl of state.parseResult.document.declarations) {
          if (decl.name === symbol.name) {
            references.push({ uri: fileUri, range: decl.nameSpan.range });
          }
        }
      }
    }

    return dedupeLocations(references);
  }

  validateFile(uri: string): ParseDiagnostic[] {
    const file = this.files.get(uri);
    if (!file) {
      return [];
    }

    const diagnostics = [...file.parseResult.diagnostics];

    return diagnostics;
  }

  getPackageValidationDiagnostics(): Map<string, ParseDiagnostic[]> {
    return getWorkspaceDiagnostics(this);
  }

  validateAll(): Map<string, ParseDiagnostic[]> {
    const results = new Map<string, ParseDiagnostic[]>();

    for (const uri of this.files.keys()) {
      results.set(uri, this.validateFile(uri));
    }

    return results;
  }

  private buildVisibleTypes(
    uri: string,
    document: DocumentNode
  ): Set<string> {
    const visible = new Set<string>();

    for (const decl of document.declarations) {
      visible.add(decl.name);
      if (document.packageName) {
        visible.add(`${document.packageName}.${decl.name}`);
      }
    }

    for (const symbol of this.getAllTypeSymbols()) {
      visible.add(symbol.name);
      visible.add(symbol.qualifiedName);
    }

    return visible;
  }

  private evictAliasFiles(uri: string): void {
    const path = canonicalPathForUri(uri);

    for (const existingUri of [...this.files.keys()]) {
      if (existingUri === uri) {
        continue;
      }

      if (canonicalPathForUri(existingUri) === path) {
        this.removeSymbolsForUri(existingUri);
        this.files.delete(existingUri);
      }
    }
  }

  private indexSymbols(uri: string, document: DocumentNode): void {
    const fileSymbols: GlobalSymbolInfo[] = [];

    for (const decl of document.declarations) {
      if (decl.kind !== "struct" && decl.kind !== "enum" && decl.kind !== "service") {
        continue;
      }

      const qualifiedName = document.packageName
        ? `${document.packageName}.${decl.name}`
        : decl.name;

      const info: GlobalSymbolInfo = {
        name: decl.name,
        qualifiedName,
        kind: decl.kind,
        uri,
        range: decl.nameSpan.range,
        packageName: document.packageName,
      };

      fileSymbols.push(info);
      this.symbolsByQualifiedName.set(qualifiedName, info);

      const simpleMatches = this.symbolsBySimpleName.get(decl.name) ?? [];
      simpleMatches.push(info);
      this.symbolsBySimpleName.set(decl.name, simpleMatches);
    }

    this.symbolsByUri.set(uri, fileSymbols);
  }

  private removeSymbolsForUri(uri: string): void {
    const existing = this.symbolsByUri.get(uri) ?? [];

    for (const symbol of existing) {
      if (this.symbolsByQualifiedName.get(symbol.qualifiedName) === symbol) {
        this.symbolsByQualifiedName.delete(symbol.qualifiedName);
      }

      const simpleMatches = this.symbolsBySimpleName.get(symbol.name) ?? [];
      this.symbolsBySimpleName.set(
        symbol.name,
        simpleMatches.filter(s => s.uri !== uri)
      );
    }

    this.symbolsByUri.delete(uri);
  }

  private revalidateAll(): void {
    for (const [uri, file] of this.files) {
      const visible = this.buildVisibleTypes(uri, file.parseResult.document);
      const parseResult = parseDocument(file.source, {
        resolveType: name => visible.has(name),
      });
      this.files.set(uri, { ...file, parseResult });
    }
  }
}

export async function scanWorkspaceFolder(folderUri: string): Promise<string[]> {
  const folderPath = uriToPath(folderUri);
  const uris: string[] = [];
  const contractDirs = await findContractDirectories(folderPath);

  if (contractDirs.length > 0) {
    for (const dir of contractDirs) {
      await walkDirectory(dir, uris);
    }
    return uris;
  }

  await walkDirectory(folderPath, uris);
  return uris;
}

async function findContractDirectories(rootDir: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: fs.Dirent[];

    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }

      if (!entry.isDirectory()) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (CONTRACT_DIRECTORY_NAMES.has(entry.name.toLowerCase())) {
        found.push(fullPath);
        continue;
      }

      await walk(fullPath);
    }
  }

  await walk(rootDir);
  return found;
}

async function walkDirectory(dir: string, uris: string[]): Promise<void> {
  let entries: fs.Dirent[];

  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(fullPath, uris);
      continue;
    }

    if (CONTRACT_EXTENSIONS.has(path.extname(entry.name))) {
      uris.push(pathToUri(fullPath));
    }
  }
}

function findTypeReferencesInDocument(
  document: DocumentNode,
  names: Set<string>,
  uri: string
): SymbolLocation[] {
  const refs: SymbolLocation[] = [];

  const visitType = (type: TypeNode): void => {
    visitTypeNodes(type, node => {
      if (node.kind === "reference" && names.has(node.name)) {
        refs.push({ uri, range: node.span.range });
      }
    });
  };

  for (const decl of document.declarations) {
    if (decl.kind === "struct") {
      for (const field of decl.fields) {
        visitType(field.type);
      }
    }

    if (decl.kind === "service") {
      for (const method of decl.methods) {
        for (const param of method.params) {
          visitType(param.type);
        }
        visitType(method.returnType);
      }
    }
  }

  return refs;
}

function dedupeLocations(locations: SymbolLocation[]): SymbolLocation[] {
  const seen = new Set<string>();
  const result: SymbolLocation[] = [];

  for (const loc of locations) {
    const key = `${loc.uri}:${loc.range.start.line}:${loc.range.start.character}:${loc.range.end.line}:${loc.range.end.character}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(loc);
    }
  }

  return result;
}

export { pathToUri, uriToPath } from "./uri";

export function readFileUri(uri: string): string {
  return fs.readFileSync(uriToPath(uri), "utf8");
}

export function getHoverForSymbol(
  index: WorkspaceIndex,
  uri: string,
  position: Position
): string | null {
  const file = index.getFile(uri);
  if (!file) {
    return null;
  }

  const symbol = findSymbolAtPosition(file.parseResult.document, position);
  if (symbol?.detail) {
    return `**${symbol.name}**\n\n${symbol.detail}`;
  }

  if (symbol) {
    const global = index.lookupSymbol(symbol.name);
    if (global) {
      const relPath = path.basename(uriToPath(global.uri));
      return `**${global.kind} ${global.qualifiedName}**\n\nDefined in \`${relPath}\``;
    }
  }

  const localDecl = file.parseResult.document.declarations.find(
    d => d.name === symbol?.name
  );

  if (localDecl) {
    const body =
      localDecl.kind === "enum"
        ? localDecl.values.map(v => v.name).join(", ")
        : localDecl.kind === "struct"
          ? localDecl.fields
              .map(f => `${f.name}${f.optional ? "?" : ""}: ${typeToString(f.type)}`)
              .join("\n")
          : localDecl.methods.map(m => m.name).join(", ");

    return `**${localDecl.kind} ${localDecl.name}**\n\n${body}`;
  }

  return null;
}

export function getDocumentSymbols(uri: string, document: DocumentNode) {
  return collectSymbols(document).map(symbol => ({
    ...symbol,
    uri,
  }));
}
