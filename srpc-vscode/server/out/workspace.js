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
exports.uriToPath = exports.pathToUri = exports.WorkspaceIndex = void 0;
exports.scanWorkspaceFolder = scanWorkspaceFolder;
exports.readFileUri = readFileUri;
exports.getHoverForSymbol = getHoverForSymbol;
exports.getDocumentSymbols = getDocumentSymbols;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parser_1 = require("./parser");
const packages_1 = require("./packages");
const types_1 = require("./types");
const uri_1 = require("./uri");
const CONTRACT_EXTENSIONS = new Set([".ctr", ".rpc"]);
class WorkspaceIndex {
    files = new Map();
    symbolsByQualifiedName = new Map();
    symbolsBySimpleName = new Map();
    symbolsByUri = new Map();
    getFile(uri) {
        return this.files.get((0, uri_1.normalizeUri)(uri));
    }
    getAllFiles() {
        return [...this.files.values()];
    }
    getAllTypeSymbols() {
        return [...this.symbolsByQualifiedName.values()].filter(s => s.kind === "struct" || s.kind === "enum");
    }
    getAllSymbols() {
        return [...this.symbolsByQualifiedName.values()];
    }
    getUsedPackageNames(excludeUri) {
        return this.getUsedTopLevelNames(excludeUri);
    }
    getUsedTopLevelNames(excludeUri) {
        const used = new Set();
        const excluded = excludeUri ? (0, uri_1.normalizeUri)(excludeUri) : undefined;
        for (const file of this.getAllFiles()) {
            if (excluded && file.uri === excluded) {
                continue;
            }
            const { packageName, declarations } = file.parseResult.document;
            if (packageName) {
                used.add(packageName);
            }
            for (const decl of declarations) {
                if (decl.kind === "struct" ||
                    decl.kind === "enum" ||
                    decl.kind === "service") {
                    used.add(decl.name);
                }
            }
        }
        return used;
    }
    suggestPackageName(uri) {
        return (0, packages_1.suggestUniquePackageName)(this, uri);
    }
    lookupSymbol(name) {
        if (this.symbolsByQualifiedName.has(name)) {
            return this.symbolsByQualifiedName.get(name);
        }
        const simple = name.includes(".") ? name.split(".").pop() : name;
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
    updateFile(uri, source) {
        const normalizedUri = (0, uri_1.normalizeUri)(uri);
        this.evictAliasFiles(normalizedUri);
        this.removeSymbolsForUri(normalizedUri);
        const syntax = (0, parser_1.parseDocumentSyntax)(source);
        this.files.set(normalizedUri, { uri: normalizedUri, source, parseResult: syntax });
        this.indexSymbols(normalizedUri, syntax.document);
        this.revalidateAll();
    }
    removeFile(uri) {
        const normalizedUri = (0, uri_1.normalizeUri)(uri);
        this.removeSymbolsForUri(normalizedUri);
        this.files.delete(normalizedUri);
        this.revalidateAll();
    }
    loadFile(uri, source) {
        const normalizedUri = (0, uri_1.normalizeUri)(uri);
        this.evictAliasFiles(normalizedUri);
        this.removeSymbolsForUri(normalizedUri);
        const syntax = (0, parser_1.parseDocumentSyntax)(source);
        this.files.set(normalizedUri, { uri: normalizedUri, source, parseResult: syntax });
        this.indexSymbols(normalizedUri, syntax.document);
    }
    finishLoading() {
        this.revalidateAll();
    }
    getVisibleTypes(uri) {
        const normalizedUri = (0, uri_1.normalizeUri)(uri);
        const file = this.files.get(normalizedUri);
        if (!file) {
            return new Set();
        }
        return this.buildVisibleTypes(normalizedUri, file.parseResult.document);
    }
    findDefinition(uri, position) {
        const normalizedUri = (0, uri_1.normalizeUri)(uri);
        const file = this.files.get(normalizedUri);
        if (!file) {
            return null;
        }
        const symbol = (0, parser_1.findSymbolAtPosition)(file.parseResult.document, position);
        const names = new Set();
        if (symbol) {
            names.add(symbol.name);
        }
        const word = (0, uri_1.getWordAtPosition)(file.source, position);
        if (word) {
            names.add(word);
        }
        for (const name of names) {
            const local = file.parseResult.document.declarations.find(d => d.name === name);
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
    findReferences(uri, position) {
        const normalizedUri = (0, uri_1.normalizeUri)(uri);
        const file = this.files.get(normalizedUri);
        if (!file) {
            return [];
        }
        const symbol = (0, parser_1.findSymbolAtPosition)(file.parseResult.document, position);
        if (!symbol) {
            return [];
        }
        const targetNames = new Set([symbol.name]);
        const global = this.lookupSymbol(symbol.name);
        if (global) {
            targetNames.add(global.name);
            targetNames.add(global.qualifiedName);
        }
        const localDecl = file.parseResult.document.declarations.find(d => d.name === symbol.name);
        if (localDecl) {
            targetNames.add(localDecl.name);
            if (file.parseResult.document.packageName) {
                targetNames.add(`${file.parseResult.document.packageName}.${localDecl.name}`);
            }
        }
        const references = [];
        for (const [fileUri, state] of this.files) {
            references.push(...findTypeReferencesInDocument(state.parseResult.document, targetNames, fileUri));
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
    validateFile(uri) {
        const normalizedUri = (0, uri_1.normalizeUri)(uri);
        const file = this.files.get(normalizedUri);
        if (!file) {
            return [];
        }
        const diagnostics = [...file.parseResult.diagnostics];
        return diagnostics;
    }
    getPackageValidationDiagnostics() {
        return (0, packages_1.getWorkspaceDiagnostics)(this);
    }
    validateAll() {
        const results = new Map();
        for (const uri of this.files.keys()) {
            results.set(uri, this.validateFile(uri));
        }
        return results;
    }
    buildVisibleTypes(uri, document) {
        const visible = new Set();
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
    evictAliasFiles(uri) {
        const path = (0, uri_1.canonicalPathForUri)(uri);
        for (const existingUri of [...this.files.keys()]) {
            if (existingUri === uri) {
                continue;
            }
            if ((0, uri_1.canonicalPathForUri)(existingUri) === path) {
                this.removeSymbolsForUri(existingUri);
                this.files.delete(existingUri);
            }
        }
    }
    indexSymbols(uri, document) {
        const fileSymbols = [];
        for (const decl of document.declarations) {
            if (decl.kind !== "struct" && decl.kind !== "enum" && decl.kind !== "service") {
                continue;
            }
            const qualifiedName = document.packageName
                ? `${document.packageName}.${decl.name}`
                : decl.name;
            const info = {
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
    removeSymbolsForUri(uri) {
        const existing = this.symbolsByUri.get(uri) ?? [];
        for (const symbol of existing) {
            if (this.symbolsByQualifiedName.get(symbol.qualifiedName) === symbol) {
                this.symbolsByQualifiedName.delete(symbol.qualifiedName);
            }
            const simpleMatches = this.symbolsBySimpleName.get(symbol.name) ?? [];
            this.symbolsBySimpleName.set(symbol.name, simpleMatches.filter(s => s.uri !== uri));
        }
        this.symbolsByUri.delete(uri);
    }
    revalidateAll() {
        for (const [uri, file] of this.files) {
            const visible = this.buildVisibleTypes(uri, file.parseResult.document);
            const parseResult = (0, parser_1.parseDocument)(file.source, {
                resolveType: name => visible.has(name),
            });
            this.files.set(uri, { ...file, parseResult });
        }
    }
}
exports.WorkspaceIndex = WorkspaceIndex;
async function scanWorkspaceFolder(folderUri) {
    const folderPath = (0, uri_1.uriToPath)(folderUri);
    const uris = [];
    await walkDirectory(folderPath, uris);
    return uris;
}
async function walkDirectory(dir, uris) {
    let entries;
    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    }
    catch {
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
            uris.push((0, uri_1.pathToUri)(fullPath));
        }
    }
}
function findTypeReferencesInDocument(document, names, uri) {
    const refs = [];
    const visitType = (type) => {
        (0, types_1.visitTypeNodes)(type, node => {
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
function dedupeLocations(locations) {
    const seen = new Set();
    const result = [];
    for (const loc of locations) {
        const key = `${loc.uri}:${loc.range.start.line}:${loc.range.start.character}:${loc.range.end.line}:${loc.range.end.character}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(loc);
        }
    }
    return result;
}
var uri_2 = require("./uri");
Object.defineProperty(exports, "pathToUri", { enumerable: true, get: function () { return uri_2.pathToUri; } });
Object.defineProperty(exports, "uriToPath", { enumerable: true, get: function () { return uri_2.uriToPath; } });
function readFileUri(uri) {
    return fs.readFileSync((0, uri_1.uriToPath)(uri), "utf8");
}
function getHoverForSymbol(index, uri, position) {
    const file = index.getFile(uri);
    if (!file) {
        return null;
    }
    const symbol = (0, parser_1.findSymbolAtPosition)(file.parseResult.document, position);
    if (symbol?.detail) {
        return `**${symbol.name}**\n\n${symbol.detail}`;
    }
    if (symbol) {
        const global = index.lookupSymbol(symbol.name);
        if (global) {
            const relPath = path.basename((0, uri_1.uriToPath)(global.uri));
            return `**${global.kind} ${global.qualifiedName}**\n\nDefined in \`${relPath}\``;
        }
    }
    const localDecl = file.parseResult.document.declarations.find(d => d.name === symbol?.name);
    if (localDecl) {
        const body = localDecl.kind === "enum"
            ? localDecl.values.map(v => v.name).join(", ")
            : localDecl.kind === "struct"
                ? localDecl.fields
                    .map(f => `${f.name}${f.optional ? "?" : ""}: ${(0, types_1.typeToString)(f.type)}`)
                    .join("\n")
                : localDecl.methods.map(m => m.name).join(", ");
        return `**${localDecl.kind} ${localDecl.name}**\n\n${body}`;
    }
    return null;
}
function getDocumentSymbols(uri, document) {
    return (0, parser_1.collectSymbols)(document).map(symbol => ({
        ...symbol,
        uri,
    }));
}
//# sourceMappingURL=workspace.js.map