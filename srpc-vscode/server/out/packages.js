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
exports.sanitizePackageSegment = sanitizePackageSegment;
exports.packageNameFromFilePath = packageNameFromFilePath;
exports.suggestUniquePackageName = suggestUniquePackageName;
exports.getPackageDiagnostics = getPackageDiagnostics;
exports.getWorkspaceDiagnostics = getWorkspaceDiagnostics;
exports.isContractUri = isContractUri;
exports.shouldAutoInsertPackage = shouldAutoInsertPackage;
exports.buildPackageHeader = buildPackageHeader;
const path = __importStar(require("path"));
const uri_1 = require("./uri");
function sanitizePackageSegment(name) {
    const cleaned = name
        .replace(/[^A-Za-z0-9_.]/g, "_")
        .replace(/^([0-9])/, "_$1")
        .toLowerCase();
    return cleaned || "contract";
}
function packageNameFromFilePath(filePath) {
    const base = path.basename(filePath, path.extname(filePath));
    return sanitizePackageSegment(base);
}
function suggestUniquePackageName(index, uri) {
    const filePath = (0, uri_1.uriToPath)(uri);
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
function getGlobalNameDiagnostics(index) {
    const byName = new Map();
    const results = new Map();
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
            if (decl.kind !== "struct" &&
                decl.kind !== "enum" &&
                decl.kind !== "service") {
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
                .map(other => `${other.kind} in ${path.basename((0, uri_1.uriToPath)(other.uri))}`)
                .join(", ");
            pushDiagnostic(results, entry.uri, {
                message: `Duplicate ${entry.kind} '${name}'. Also used as: ${others}. Names must be unique within the same workspace project.`,
                range: entry.range,
                severity: "error",
            });
        }
    }
    return results;
}
/** @deprecated use getWorkspaceDiagnostics */
function getPackageDiagnostics(index) {
    return getWorkspaceDiagnostics(index);
}
function getWorkspaceDiagnostics(index) {
    const results = mergeDiagnostics(getGlobalNameDiagnostics(index));
    for (const file of index.getAllFiles()) {
        const { packageName, declarations } = file.parseResult.document;
        if (!packageName && declarations.length > 0) {
            pushDiagnostic(results, file.uri, {
                message: "Missing package declaration. Add `package <name>` at the top of the file.",
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
function dedupeEntriesByPath(entries) {
    const seen = new Map();
    for (const entry of entries) {
        const key = (0, uri_1.canonicalPathForUri)(entry.uri);
        if (!seen.has(key)) {
            seen.set(key, entry);
        }
    }
    return [...seen.values()];
}
function pushDiagnostic(results, uri, diagnostic) {
    const diagnostics = results.get(uri) ?? [];
    diagnostics.push(diagnostic);
    results.set(uri, diagnostics);
}
function mergeDiagnostics(...maps) {
    const merged = new Map();
    for (const map of maps) {
        for (const [uri, diagnostics] of map) {
            const existing = merged.get(uri) ?? [];
            merged.set(uri, [...existing, ...diagnostics]);
        }
    }
    return merged;
}
function isContractUri(uri) {
    const lower = uri.toLowerCase();
    return lower.endsWith(".ctr") || lower.endsWith(".rpc");
}
function shouldAutoInsertPackage(source) {
    return source.trim().length === 0;
}
function buildPackageHeader(packageName) {
    return `package ${packageName}\n\n`;
}
//# sourceMappingURL=packages.js.map