import * as path from "path";
import type { ParseDiagnostic, Range } from "./ast";
import { uriToPath, canonicalPathForUri } from "./uri";
import type { WorkspaceIndex } from "./workspace";

export function sanitizePackageSegment(name: string): string {
  const cleaned = name
    .replace(/[^A-Za-z0-9_.]/g, "_")
    .replace(/^([0-9])/, "_$1")
    .toLowerCase();

  return cleaned || "contract";
}

export function packageNameFromFilePath(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath));
  return sanitizePackageSegment(base);
}

export function suggestUniquePackageName(
  index: WorkspaceIndex,
  uri: string
): string {
  const filePath = uriToPath(uri);
  const base = packageNameFromFilePath(filePath);
  const folder = sanitizePackageSegment(path.basename(path.dirname(filePath)));
  const used = index.getUsedTopLevelNames(uri);

  const candidates = [base];

  if (folder && folder !== base && folder !== "contract") {
    candidates.push(`${folder}.${base}`);
  }

  for (const candidate of candidates) {
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  let suffix = 2;
  while (used.has(`${base}${suffix}`)) {
    suffix++;
  }

  return `${base}${suffix}`;
}

type TopLevelNameKind = "package" | "struct" | "enum" | "service";

interface TopLevelNameEntry {
  uri: string;
  range: Range;
  kind: TopLevelNameKind;
}

function getGlobalNameDiagnostics(
  index: WorkspaceIndex
): Map<string, ParseDiagnostic[]> {
  const byName = new Map<string, TopLevelNameEntry[]>();
  const results = new Map<string, ParseDiagnostic[]>();

  for (const file of index.getAllFiles()) {
    const { packageName, packageSpan, declarations } = file.parseResult.document;

    if (packageName && packageSpan) {
      const entries = byName.get(packageName) ?? [];
      entries.push({
        uri: file.uri,
        range: packageSpan.range,
        kind: "package",
      });
      byName.set(packageName, entries);
    }

    for (const decl of declarations) {
      if (
        decl.kind !== "struct" &&
        decl.kind !== "enum" &&
        decl.kind !== "service"
      ) {
        continue;
      }

      const entries = byName.get(decl.name) ?? [];
      entries.push({
        uri: file.uri,
        range: decl.nameSpan.range,
        kind: decl.kind,
      });
      byName.set(decl.name, entries);
    }
  }

  for (const [name, entries] of byName) {
    const uniqueEntries = dedupeEntriesByPath(entries);
    if (uniqueEntries.length <= 1) {
      continue;
    }

    for (const entry of uniqueEntries) {
      const others = uniqueEntries
        .filter(other => other !== entry)
        .map(other => `${other.kind} in ${path.basename(uriToPath(other.uri))}`)
        .join(", ");

      pushDiagnostic(results, entry.uri, {
        message: `Duplicate ${entry.kind} '${name}'. Also used as: ${others}. Names must be unique across all files.`,
        range: entry.range,
        severity: "error",
      });
    }
  }

  return results;
}

/** @deprecated use getWorkspaceDiagnostics */
export function getPackageDiagnostics(
  index: WorkspaceIndex
): Map<string, ParseDiagnostic[]> {
  return getWorkspaceDiagnostics(index);
}

export function getWorkspaceDiagnostics(
  index: WorkspaceIndex
): Map<string, ParseDiagnostic[]> {
  const results = mergeDiagnostics(getGlobalNameDiagnostics(index));

  for (const file of index.getAllFiles()) {
    const { packageName, declarations } = file.parseResult.document;

    if (!packageName && declarations.length > 0) {
      pushDiagnostic(results, file.uri, {
        message:
          "Missing package declaration. Add `package <name>` at the top of the file.",
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        severity: "warning",
      });
    }
  }

  return results;
}

function dedupeEntriesByPath(entries: TopLevelNameEntry[]): TopLevelNameEntry[] {
  const seen = new Map<string, TopLevelNameEntry>();

  for (const entry of entries) {
    const key = canonicalPathForUri(entry.uri);
    if (!seen.has(key)) {
      seen.set(key, entry);
    }
  }

  return [...seen.values()];
}

function pushDiagnostic(
  results: Map<string, ParseDiagnostic[]>,
  uri: string,
  diagnostic: ParseDiagnostic
): void {
  const diagnostics = results.get(uri) ?? [];
  diagnostics.push(diagnostic);
  results.set(uri, diagnostics);
}

function mergeDiagnostics(
  ...maps: Map<string, ParseDiagnostic[]>[]
): Map<string, ParseDiagnostic[]> {
  const merged = new Map<string, ParseDiagnostic[]>();

  for (const map of maps) {
    for (const [uri, diagnostics] of map) {
      const existing = merged.get(uri) ?? [];
      merged.set(uri, [...existing, ...diagnostics]);
    }
  }

  return merged;
}

export function isContractUri(uri: string): boolean {
  const lower = uri.toLowerCase();
  return lower.endsWith(".ctr") || lower.endsWith(".rpc");
}

export function shouldAutoInsertPackage(source: string): boolean {
  return source.trim().length === 0;
}

export function buildPackageHeader(packageName: string): string {
  return `package ${packageName}\n\n`;
}
