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

export type ScalarType =
  | "string"
  | "number"
  | "boolean"
  | "datetime"
  | "date"
  | "int"
  | "float"
  | "bytes"
  | "any"
  | "null";

/** @deprecated use ScalarType */
export type PrimitiveType = ScalarType;

export type TypeNode =
  | { kind: "primitive"; name: ScalarType; span: SourceSpan }
  | { kind: "reference"; name: string; span: SourceSpan }
  | { kind: "array"; element: TypeNode; span: SourceSpan }
  | { kind: "map"; key: TypeNode; value: TypeNode; span: SourceSpan }
  | { kind: "list"; element: TypeNode; span: SourceSpan }
  | { kind: "inline-struct"; fields: FieldNode[]; span: SourceSpan }
  | { kind: "tuple"; elements: TypeNode[]; span: SourceSpan }
  | { kind: "union"; types: TypeNode[]; span: SourceSpan }
  | { kind: "literal"; value: string; span: SourceSpan };

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

export const HTTP_METHOD_DECORATORS: Record<string, SrpcHttpMethod> = {
  get: "GET",
  post: "POST",
  put: "PUT",
  patch: "PATCH",
  delete: "DELETE",
};

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

export const SCALAR_TYPES: ScalarType[] = [
  "string",
  "number",
  "boolean",
  "datetime",
  "date",
  "int",
  "float",
  "bytes",
  "any",
  "null",
];

export const PRIMITIVE_TYPES = SCALAR_TYPES;

export const GENERIC_TYPE_KEYWORDS = ["map", "list"] as const;

export const KEYWORDS = [
  "enum",
  "struct",
  "service",
  "map",
  "list",
  "package",
] as const;

export function isScalarType(name: string): name is ScalarType {
  return (SCALAR_TYPES as readonly string[]).includes(name);
}

export const KEYWORD_DOCS: Record<string, string> = {
  enum: "**enum** defines a set of named constants.",
  struct: "**struct** defines a typed data shape with named fields.",
  service: "**service** groups RPC methods inside `{ }`.",
  package: "**package** sets the namespace for declarations in this file.",
  map: "**map\\<K, V\\>** key-value collection.",
  list: "**list\\<T\\>** ordered collection.",
  string: "UTF-8 string.",
  number: "Numeric value (alias).",
  int: "Integer number.",
  float: "Floating-point number.",
  boolean: "True or false.",
  bytes: "Binary data.",
  any: "Dynamic value.",
  null: "Null type (used in unions).",
  date: "Calendar date (no time).",
  datetime: "Date and time value.",
};
