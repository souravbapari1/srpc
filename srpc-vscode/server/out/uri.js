"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUri = normalizeUri;
exports.canonicalPathForUri = canonicalPathForUri;
exports.pathToUri = pathToUri;
exports.uriToPath = uriToPath;
exports.getWordAtPosition = getWordAtPosition;
exports.findWorkspaceFolderForUri = findWorkspaceFolderForUri;
const vscode_uri_1 = require("vscode-uri");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function filePathFromUri(uri) {
    const parsed = vscode_uri_1.URI.parse(uri);
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
function normalizeUri(uri) {
    const parsed = vscode_uri_1.URI.parse(uri);
    if (parsed.scheme === "file") {
        return vscode_uri_1.URI.file(filePathFromUri(uri)).toString(true);
    }
    return parsed.toString(true);
}
/** Resolve a file URI to a stable filesystem path for deduplication. */
function canonicalPathForUri(uri) {
    const filePath = filePathFromUri(normalizeUri(uri));
    try {
        return fs.realpathSync.native(filePath);
    }
    catch {
        return filePath;
    }
}
function pathToUri(filePath) {
    return vscode_uri_1.URI.file(filePath).toString(true);
}
function uriToPath(uri) {
    return filePathFromUri(normalizeUri(uri));
}
function getWordAtPosition(source, position) {
    const lines = source.split("\n");
    const line = lines[position.line] ?? "";
    const before = line.slice(0, position.character);
    const after = line.slice(position.character);
    const startMatch = before.match(/[A-Za-z_][A-Za-z0-9_.]*$/);
    const endMatch = after.match(/^[A-Za-z0-9_.]*/);
    const word = `${startMatch?.[0] ?? ""}${endMatch?.[0] ?? ""}`;
    return word || null;
}
/** Pick the deepest workspace folder that contains this file URI. */
function findWorkspaceFolderForUri(uri, folders) {
    const filePath = canonicalPathForUri(uri);
    let bestFolderUri;
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
//# sourceMappingURL=uri.js.map