import { CompletionItem } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { type DocumentNode, type Position } from "./ast";
import { type WorkspaceIndex } from "./workspace";
export type CompletionContext = "keyword" | "type" | "none";
export declare function getBraceDepth(document: TextDocument, position: Position): number;
export declare function getCompletionContext(document: TextDocument, position: Position, ast: DocumentNode): CompletionContext;
export declare function buildCompletions(document: TextDocument, position: Position, index: WorkspaceIndex): CompletionItem[];
