export interface Position {
    line: number;
    character: number;
}
export interface Range {
    start: Position;
    end: Position;
}
export interface SourceSpan {
    range: Range;
}
export type ScalarType = "string" | "number" | "boolean" | "datetime" | "date" | "int" | "float" | "bytes" | "any" | "null";
/** @deprecated use ScalarType */
export type PrimitiveType = ScalarType;
export type TypeNode = {
    kind: "primitive";
    name: ScalarType;
    span: SourceSpan;
} | {
    kind: "reference";
    name: string;
    span: SourceSpan;
} | {
    kind: "array";
    element: TypeNode;
    span: SourceSpan;
} | {
    kind: "map";
    key: TypeNode;
    value: TypeNode;
    span: SourceSpan;
} | {
    kind: "list";
    element: TypeNode;
    span: SourceSpan;
} | {
    kind: "inline-struct";
    fields: FieldNode[];
    span: SourceSpan;
} | {
    kind: "tuple";
    elements: TypeNode[];
    span: SourceSpan;
} | {
    kind: "union";
    types: TypeNode[];
    span: SourceSpan;
} | {
    kind: "literal";
    value: string;
    span: SourceSpan;
};
export interface FieldNode {
    name: string;
    optional: boolean;
    type: TypeNode;
    span: SourceSpan;
    nameSpan: SourceSpan;
    typeSpan: SourceSpan;
}
export interface EnumValueNode {
    name: string;
    span: SourceSpan;
}
export interface EnumNode {
    kind: "enum";
    name: string;
    values: EnumValueNode[];
    span: SourceSpan;
    nameSpan: SourceSpan;
}
export interface StructNode {
    kind: "struct";
    name: string;
    fields: FieldNode[];
    span: SourceSpan;
    nameSpan: SourceSpan;
}
export interface ParamNode {
    name: string;
    type: TypeNode;
    span: SourceSpan;
    nameSpan: SourceSpan;
    typeSpan: SourceSpan;
}
export type SrpcHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export declare const HTTP_METHOD_DECORATORS: Record<string, SrpcHttpMethod>;
export interface MethodNode {
    name: string;
    params: ParamNode[];
    returnType: TypeNode;
    httpMethod?: SrpcHttpMethod;
    span: SourceSpan;
    nameSpan: SourceSpan;
    returnTypeSpan: SourceSpan;
    httpMethodSpan?: SourceSpan;
}
export interface ServiceNode {
    kind: "service";
    name: string;
    methods: MethodNode[];
    span: SourceSpan;
    nameSpan: SourceSpan;
}
export type DeclarationNode = EnumNode | StructNode | ServiceNode;
export interface DocumentNode {
    packageName?: string;
    packageSpan?: SourceSpan;
    declarations: DeclarationNode[];
}
export interface ParseDiagnostic {
    message: string;
    range: Range;
    severity: "error" | "warning";
}
export interface ParseResult {
    document: DocumentNode;
    diagnostics: ParseDiagnostic[];
}
export interface SymbolInfo {
    kind: "enum" | "struct" | "service" | "method" | "field" | "param" | "enum-value";
    name: string;
    range: Range;
    detail?: string;
    containerName?: string;
}
export interface GlobalSymbolInfo {
    name: string;
    qualifiedName: string;
    kind: "struct" | "enum" | "service";
    uri: string;
    range: Range;
    packageName?: string;
}
export interface SymbolLocation {
    uri: string;
    range: Range;
}
export declare const SCALAR_TYPES: ScalarType[];
export declare const PRIMITIVE_TYPES: ScalarType[];
export declare const GENERIC_TYPE_KEYWORDS: readonly ["map", "list"];
export declare const KEYWORDS: readonly ["enum", "struct", "service", "map", "list", "package"];
export declare function isScalarType(name: string): name is ScalarType;
export declare const KEYWORD_DOCS: Record<string, string>;
