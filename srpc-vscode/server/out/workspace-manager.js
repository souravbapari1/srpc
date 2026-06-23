"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceManager = void 0;
exports.getOpenDocument = getOpenDocument;
const uri_1 = require("./uri");
const workspace_1 = require("./workspace");
const ORPHAN_KEY = "__srpc_orphan__";
class WorkspaceManager {
    folders = [];
    indexes = new Map();
    trackedUris = new Set();
    setFolders(folders) {
        this.folders = folders.map(folder => ({
            ...folder,
            uri: (0, uri_1.normalizeUri)(folder.uri),
        }));
    }
    getFolders() {
        return this.folders;
    }
    getIndexForUri(uri) {
        const folderUri = (0, uri_1.findWorkspaceFolderForUri)(uri, this.folders);
        const key = folderUri ?? ORPHAN_KEY;
        let index = this.indexes.get(key);
        if (!index) {
            index = new workspace_1.WorkspaceIndex();
            this.indexes.set(key, index);
        }
        return index;
    }
    clear() {
        this.indexes.clear();
        this.trackedUris.clear();
    }
    async indexAll(documents) {
        this.clear();
        const urisByFolder = new Map();
        for (const folder of this.folders) {
            urisByFolder.set(folder.uri, new Set());
        }
        urisByFolder.set(ORPHAN_KEY, new Set());
        for (const folder of this.folders) {
            const found = await (0, workspace_1.scanWorkspaceFolder)(folder.uri);
            const bucket = urisByFolder.get(folder.uri);
            for (const uri of found) {
                bucket.add((0, uri_1.normalizeUri)(uri));
            }
        }
        for (const doc of documents.all()) {
            const normalized = (0, uri_1.normalizeUri)(doc.uri);
            const folderUri = (0, uri_1.findWorkspaceFolderForUri)(normalized, this.folders);
            const key = folderUri ?? ORPHAN_KEY;
            urisByFolder.get(key) ?? urisByFolder.set(key, new Set());
            urisByFolder.get(key).add(normalized);
        }
        for (const [key, uris] of urisByFolder) {
            if (uris.size === 0) {
                continue;
            }
            const index = key === ORPHAN_KEY ? this.getIndexForUri("") : this.indexes.get(key) ?? new workspace_1.WorkspaceIndex();
            if (!this.indexes.has(key)) {
                this.indexes.set(key, index);
            }
            for (const uri of uris) {
                try {
                    const source = getOpenDocument(documents, uri)?.getText() ?? (0, workspace_1.readFileUri)(uri);
                    index.loadFile(uri, source);
                    this.trackedUris.add(uri);
                }
                catch {
                    // Skip unreadable files.
                }
            }
            index.finishLoading();
        }
    }
    syncDocument(document) {
        const uri = (0, uri_1.normalizeUri)(document.uri);
        this.trackedUris.add(uri);
        this.getIndexForUri(uri).updateFile(uri, document.getText());
    }
    reloadFromDisk(uri, documents) {
        const normalized = (0, uri_1.normalizeUri)(uri);
        try {
            const source = getOpenDocument(documents, normalized)?.getText() ?? (0, workspace_1.readFileUri)(normalized);
            this.trackedUris.add(normalized);
            this.getIndexForUri(normalized).updateFile(normalized, source);
        }
        catch {
            this.removeFile(normalized);
        }
    }
    removeFile(uri) {
        const normalized = (0, uri_1.normalizeUri)(uri);
        this.trackedUris.delete(normalized);
        this.getIndexForUri(normalized).removeFile(normalized);
    }
    hasFile(uri) {
        return this.getIndexForUri(uri).getFile(uri) !== undefined;
    }
    buildDiagnostics() {
        const results = new Map();
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
}
exports.WorkspaceManager = WorkspaceManager;
function getOpenDocument(documents, uri) {
    const normalized = (0, uri_1.normalizeUri)(uri);
    return documents.get(normalized) ?? documents.get(uri);
}
//# sourceMappingURL=workspace-manager.js.map