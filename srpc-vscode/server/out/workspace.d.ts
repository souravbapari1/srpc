import { type DocumentNode, type GlobalSymbolInfo, type ParseDiagnostic, type ParseResult, type Position, type Range, type SymbolLocation } from "./ast";
export interface FileState {
    uri: string;
    source: string;
    parseResult: ParseResult;
}
export declare class WorkspaceIndex {
    private readonly files;
    private readonly symbolsByQualifiedName;
    private readonly symbolsBySimpleName;
    private readonly symbolsByUri;
    getFile(uri: string): FileState | undefined;
    getAllFiles(): FileState[];
    getAllTypeSymbols(): GlobalSymbolInfo[];
    getAllSymbols(): GlobalSymbolInfo[];
    getUsedPackageNames(excludeUri?: string): Set<string>;
    getUsedTopLevelNames(excludeUri?: string): Set<string>;
    suggestPackageName(uri: string): string;
    lookupSymbol(name: string): GlobalSymbolInfo | undefined;
    updateFile(uri: string, source: string): void;
    removeFile(uri: string): void;
    loadFile(uri: string, source: string): void;
    finishLoading(): void;
    getVisibleTypes(uri: string): Set<string>;
    findDefinition(uri: string, position: Position): SymbolLocation | null;
    findReferences(uri: string, position: Position): SymbolLocation[];
    validateFile(uri: string): ParseDiagnostic[];
    getPackageValidationDiagnostics(): Map<string, ParseDiagnostic[]>;
    validateAll(): Map<string, ParseDiagnostic[]>;
    private buildVisibleTypes;
    private evictAliasFiles;
    private indexSymbols;
    private removeSymbolsForUri;
    private revalidateAll;
}
export declare function scanWorkspaceFolder(folderUri: string): Promise<string[]>;
export { pathToUri, uriToPath } from "./uri";
export declare function readFileUri(uri: string): string;
export declare function getHoverForSymbol(index: WorkspaceIndex, uri: string, position: Position): string | null;
export declare function getDocumentSymbols(uri: string, document: DocumentNode): {
    uri: string;
    kind: "enum" | "struct" | "service" | "method" | "field" | "param" | "enum-value";
    name: string;
    range: Range;
    detail?: string;
    containerName?: string;
}[];
