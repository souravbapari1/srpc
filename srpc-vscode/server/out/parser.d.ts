import { type DocumentNode, type ParseResult, type Position, type Range, type SymbolInfo } from "./ast";
import { typeToString } from "./types";
export declare function parseDocument(source: string, options?: {
    resolveType?: (name: string) => boolean;
}): ParseResult;
export declare function parseDocumentSyntax(source: string): ParseResult;
export { typeToString };
export declare function collectSymbols(document: DocumentNode): SymbolInfo[];
export declare function findSymbolAtPosition(document: DocumentNode, position: Position): SymbolInfo | null;
export declare function findDefinition(document: DocumentNode, position: Position): Range | null;
export declare function positionInRange(position: Position, range: Range): boolean;
export declare function formatDocument(source: string): string;
