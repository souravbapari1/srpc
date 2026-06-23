import type { ParseDiagnostic } from "./ast";
import type { WorkspaceIndex } from "./workspace";
export declare function sanitizePackageSegment(name: string): string;
export declare function packageNameFromFilePath(filePath: string): string;
export declare function suggestUniquePackageName(index: WorkspaceIndex, uri: string): string;
/** @deprecated use getWorkspaceDiagnostics */
export declare function getPackageDiagnostics(index: WorkspaceIndex): Map<string, ParseDiagnostic[]>;
export declare function getWorkspaceDiagnostics(index: WorkspaceIndex): Map<string, ParseDiagnostic[]>;
export declare function isContractUri(uri: string): boolean;
export declare function shouldAutoInsertPackage(source: string): boolean;
export declare function buildPackageHeader(packageName: string): string;
