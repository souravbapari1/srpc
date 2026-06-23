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
exports.getBraceDepth = getBraceDepth;
exports.getCompletionContext = getCompletionContext;
exports.buildCompletions = buildCompletions;
const path = __importStar(require("path"));
const node_1 = require("vscode-languageserver/node");
const ast_1 = require("./ast");
const uri_1 = require("./uri");
const TOP_LEVEL_KEYWORDS = [
    { label: "struct", snippet: "struct ${1:Name} {\n    $0\n}" },
    { label: "enum", snippet: "enum ${1:Name} {\n    $0\n}" },
    { label: "service", snippet: "service ${1:Name} {\n    @${2|get,post,put,patch,delete|} ${3:methodName}(\n        ${4:param}: ${5:string}\n    ) => ${6:string}\n}" },
    { label: "package", snippet: "package ${1:name}" },
];
function getBraceDepth(document, position) {
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
function getCompletionContext(document, position, ast) {
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: Number.MAX_SAFE_INTEGER },
    });
    const beforeCursor = line.slice(0, position.character);
    if (/:\s*[\w."'|]*$/.test(beforeCursor) ||
        /=>\s*[\w."'|]*$/.test(beforeCursor) ||
        /map<\s*[\w."'|]*$/.test(beforeCursor) ||
        /map<\s*[\w."'|]*,\s*[\w."'|]*$/.test(beforeCursor) ||
        /list<\s*[\w."'|]*$/.test(beforeCursor) ||
        /\|\s*[\w."'|]*$/.test(beforeCursor)) {
        return "type";
    }
    if (getBraceDepth(document, position) === 0 && /^\s*[a-zA-Z]*$/.test(beforeCursor)) {
        return "keyword";
    }
    return "none";
}
function getPrefix(beforeCursor, context) {
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
function matchesPrefix(label, prefix) {
    if (!prefix) {
        return true;
    }
    return label.toLowerCase().startsWith(prefix.toLowerCase());
}
function buildCompletions(document, position, index) {
    const file = index.getFile(document.uri);
    const ast = file?.parseResult.document ?? { declarations: [] };
    let context = getCompletionContext(document, position, ast);
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: Number.MAX_SAFE_INTEGER },
    });
    const beforeCursor = line.slice(0, position.character);
    const items = [];
    if (context === "none") {
        const depth = getBraceDepth(document, position);
        if (depth === 0) {
            context = "keyword";
        }
        else if (/@\s*[\w]*$/.test(beforeCursor)) {
            for (const [decorator, method] of Object.entries(ast_1.HTTP_METHOD_DECORATORS)) {
                if (!matchesPrefix(decorator, beforeCursor.replace(/^.*@/, ""))) {
                    continue;
                }
                items.push({
                    label: `@${decorator}`,
                    kind: node_1.CompletionItemKind.Keyword,
                    detail: `HTTP ${method}`,
                    insertText: `${decorator} `,
                    sortText: `0_${decorator}`,
                });
            }
            return items;
        }
        else if (line.includes(":")) {
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
                kind: node_1.CompletionItemKind.Keyword,
                detail: ast_1.KEYWORD_DOCS[keyword.label],
                insertText: keyword.snippet,
                insertTextFormat: node_1.InsertTextFormat.Snippet,
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
                detail: `${symbol.kind} (in ${path.basename((0, uri_1.uriToPath)(symbol.uri))})`,
                insertText: symbol.name,
                sortText: `1_${symbol.name}`,
            });
        }
    }
    if (context === "type") {
        for (const primitive of ast_1.SCALAR_TYPES) {
            if (!matchesPrefix(primitive, prefix)) {
                continue;
            }
            items.push({
                label: primitive,
                kind: node_1.CompletionItemKind.TypeParameter,
                detail: ast_1.KEYWORD_DOCS[primitive],
                sortText: `0_${primitive}`,
            });
        }
        for (const generic of ast_1.GENERIC_TYPE_KEYWORDS) {
            if (!matchesPrefix(generic, prefix)) {
                continue;
            }
            const snippet = generic === "map"
                ? "map<${1:string}, ${2:string}>"
                : `${generic}<\${1:string}>`;
            items.push({
                label: generic,
                kind: node_1.CompletionItemKind.Keyword,
                insertText: snippet,
                insertTextFormat: node_1.InsertTextFormat.Snippet,
                detail: ast_1.KEYWORD_DOCS[generic],
                sortText: `0_${generic}`,
            });
        }
        const seen = new Set();
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
function symbolKindToCompletionKind(kind) {
    switch (kind) {
        case "enum":
            return node_1.CompletionItemKind.Enum;
        case "service":
            return node_1.CompletionItemKind.Interface;
        case "struct":
            return node_1.CompletionItemKind.Class;
    }
}
//# sourceMappingURL=completion.js.map