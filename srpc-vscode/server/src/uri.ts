import { URI } from "vscode-uri";
import * as fs from "fs";
import * as path from "path";
import type { Position } from "./ast";

function filePathFromUri(uri: string): string {
  const parsed = URI.parse(uri);

  if (parsed.scheme !== "file") {
    return parsed.fsPath;
  }

  // vscode-uri returns a broken fsPath for file://localhost/... URIs.
  if (parsed.authority === "localhost") {
    return parsed.path;
  }

  return parsed.fsPath;
}

/** Normalize file URIs so the same path always maps to one canonical URI. */
export function normalizeUri(uri: string): string {
  const parsed = URI.parse(uri);

  if (parsed.scheme === "file") {
    return URI.file(filePathFromUri(uri)).toString(true);
  }

  return parsed.toString(true);
}

/** Resolve a file URI to a stable filesystem path for deduplication. */
export function canonicalPathForUri(uri: string): string {
  const filePath = filePathFromUri(normalizeUri(uri));

  try {
    return fs.realpathSync.native(filePath);
  } catch {
    try {
      const resolvedParent = fs.realpathSync.native(path.dirname(filePath));
      return path.join(resolvedParent, path.basename(filePath));
    } catch {
      return filePath;
    }
  }
}

export function pathToUri(filePath: string): string {
  return URI.file(filePath).toString(true);
}

export function uriToPath(uri: string): string {
  return filePathFromUri(normalizeUri(uri));
}

export function getWordAtPosition(
  source: string,
  position: Position
): string | null {
  const lines = source.split("\n");
  const line = lines[position.line] ?? "";
  const before = line.slice(0, position.character);
  const after = line.slice(position.character);
  const startMatch = before.match(/[A-Za-z_][A-Za-z0-9_.]*$/);
  const endMatch = after.match(/^[A-Za-z0-9_.]*/);
  const word = `${startMatch?.[0] ?? ""}${endMatch?.[0] ?? ""}`;

  return word || null;
}

export interface WorkspaceFolderRef {
  uri: string;
  name: string;
}

const CONTRACT_DIRECTORY_NAMES = new Set(["contract", "contracts"]);

/** Nearest ancestor `contract/` or `contracts/` directory for a file URI. */
export function findContractRootForUri(uri: string): string | undefined {
  let dir = path.dirname(canonicalPathForUri(uri));

  while (true) {
    const base = path.basename(dir);

    if (CONTRACT_DIRECTORY_NAMES.has(base.toLowerCase())) {
      return normalizeUri(pathToUri(dir));
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }

    dir = parent;
  }
}

/** Pick the deepest workspace folder that contains this file URI. */
export function findWorkspaceFolderForUri(
  uri: string,
  folders: WorkspaceFolderRef[]
): string | undefined {
  const filePath = canonicalPathForUri(uri);
  let bestFolderUri: string | undefined;
  let bestLength = -1;

  for (const folder of folders) {
    const folderPath = canonicalPathForUri(folder.uri);
    const folderPrefix = folderPath.endsWith(path.sep)
      ? folderPath
      : `${folderPath}${path.sep}`;

    if (filePath !== folderPath && !filePath.startsWith(folderPrefix)) {
      continue;
    }

    if (folderPath.length > bestLength) {
      bestLength = folderPath.length;
      bestFolderUri = normalizeUri(folder.uri);
    }
  }

  return bestFolderUri;
}
