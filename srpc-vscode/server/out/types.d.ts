import type { TypeNode } from "./ast";
export declare function visitTypeNodes(type: TypeNode, visitor: (type: TypeNode) => void): void;
export declare function typeToString(type: TypeNode): string;
