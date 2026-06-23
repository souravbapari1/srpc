import type { TextDocuments } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { ParseDiagnostic } from "./ast";
import {
  findContractRootForUri,
  findWorkspaceFolderForUri,
  normalizeUri,
  type WorkspaceFolderRef,
} from "./uri";
import { readFileUri, scanWorkspaceFolder, WorkspaceIndex } from "./workspace";

const ORPHAN_KEY = "__srpc_orphan__";

export class WorkspaceManager {
  private folders: WorkspaceFolderRef[] = [];
  private readonly indexes = new Map<string, WorkspaceIndex>();
  private readonly trackedUris = new Set<string>();

  setFolders(folders: WorkspaceFolderRef[]): void {
    this.folders = folders.map(folder => ({
      ...folder,
      uri: normalizeUri(folder.uri),
    }));
  }

  getFolders(): WorkspaceFolderRef[] {
    return this.folders;
  }

  getIndexForUri(uri: string): WorkspaceIndex {
    return this.getIndexForKey(this.indexKeyForUri(uri));
  }

  clear(): void {
    this.indexes.clear();
    this.trackedUris.clear();
  }

  async indexAll(documents: TextDocuments<TextDocument>): Promise<void> {
    this.clear();

    const allUris = new Set<string>();

    for (const folder of this.folders) {
      const found = await scanWorkspaceFolder(folder.uri);
      for (const uri of found) {
        allUris.add(normalizeUri(uri));
      }
    }

    for (const doc of documents.all()) {
      allUris.add(normalizeUri(doc.uri));
    }

    const urisByKey = new Map<string, Set<string>>();

    for (const uri of allUris) {
      const key = this.indexKeyForUri(uri);
      const bucket = urisByKey.get(key) ?? new Set<string>();
      bucket.add(uri);
      urisByKey.set(key, bucket);
    }

    for (const [key, uris] of urisByKey) {
      if (uris.size === 0) {
        continue;
      }

      const index = this.getIndexForKey(key);

      for (const uri of uris) {
        try {
          const source =
            getOpenDocument(documents, uri)?.getText() ?? readFileUri(uri);
          index.loadFile(uri, source);
          this.trackedUris.add(uri);
        } catch {
          // Skip unreadable files.
        }
      }

      index.finishLoading();
    }
  }

  syncDocument(document: TextDocument): void {
    const uri = normalizeUri(document.uri);
    this.trackedUris.add(uri);
    this.getIndexForUri(uri).updateFile(uri, document.getText());
  }

  reloadFromDisk(uri: string, documents: TextDocuments<TextDocument>): void {
    const normalized = normalizeUri(uri);

    try {
      const source =
        getOpenDocument(documents, normalized)?.getText() ??
        readFileUri(normalized);
      this.trackedUris.add(normalized);
      this.getIndexForUri(normalized).updateFile(normalized, source);
    } catch {
      this.removeFile(normalized);
    }
  }

  removeFile(uri: string): void {
    const normalized = normalizeUri(uri);
    this.trackedUris.delete(normalized);
    this.getIndexForUri(normalized).removeFile(normalized);
  }

  hasFile(uri: string): boolean {
    return this.getIndexForUri(uri).getFile(uri) !== undefined;
  }

  buildDiagnostics(): Map<string, ParseDiagnostic[]> {
    const results = new Map<string, ParseDiagnostic[]>();

    for (const index of this.indexes.values()) {
      const packageDiagnostics = index.getPackageValidationDiagnostics();

      for (const file of index.getAllFiles()) {
        results.set(file.uri, [
          ...index.validateFile(file.uri),
          ...(packageDiagnostics.get(file.uri) ?? []),
        ]);
      }
    }

    for (const uri of this.trackedUris) {
      if (!results.has(uri)) {
        results.set(uri, []);
      }
    }

    return results;
  }

  private getIndexForKey(key: string): WorkspaceIndex {
    let index = this.indexes.get(key);

    if (!index) {
      index = new WorkspaceIndex();
      this.indexes.set(key, index);
    }

    return index;
  }

  private indexKeyForUri(uri: string): string {
    const contractRoot = findContractRootForUri(uri);
    if (contractRoot) {
      return `contract:${contractRoot}`;
    }

    const folderUri = findWorkspaceFolderForUri(uri, this.folders);
    return folderUri ?? ORPHAN_KEY;
  }
}

function getOpenDocument(
  documents: TextDocuments<TextDocument>,
  uri: string
): TextDocument | undefined {
  const normalized = normalizeUri(uri);
  return documents.get(normalized) ?? documents.get(uri);
}
