import type { TextDocuments } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { ParseDiagnostic } from "./ast";
import { type WorkspaceFolderRef } from "./uri";
import { WorkspaceIndex } from "./workspace";
export declare class WorkspaceManager {
    private folders;
    private readonly indexes;
    private readonly trackedUris;
    setFolders(folders: WorkspaceFolderRef[]): void;
    getFolders(): WorkspaceFolderRef[];
    getIndexForUri(uri: string): WorkspaceIndex;
    clear(): void;
    indexAll(documents: TextDocuments<TextDocument>): Promise<void>;
    syncDocument(document: TextDocument): void;
    reloadFromDisk(uri: string, documents: TextDocuments<TextDocument>): void;
    removeFile(uri: string): void;
    hasFile(uri: string): boolean;
    buildDiagnostics(): Map<string, ParseDiagnostic[]>;
}
export declare function getOpenDocument(documents: TextDocuments<TextDocument>, uri: string): TextDocument | undefined;
