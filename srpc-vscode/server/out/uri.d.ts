import type { Position } from "./ast";
/** Normalize file URIs so the same path always maps to one canonical URI. */
export declare function normalizeUri(uri: string): string;
/** Resolve a file URI to a stable filesystem path for deduplication. */
export declare function canonicalPathForUri(uri: string): string;
export declare function pathToUri(filePath: string): string;
export declare function uriToPath(uri: string): string;
export declare function getWordAtPosition(source: string, position: Position): string | null;
export interface WorkspaceFolderRef {
    uri: string;
    name: string;
}
/** Pick the deepest workspace folder that contains this file URI. */
export declare function findWorkspaceFolderForUri(uri: string, folders: WorkspaceFolderRef[]): string | undefined;
