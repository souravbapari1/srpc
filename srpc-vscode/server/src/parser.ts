import {
  type DeclarationNode,
  type DocumentNode,
  type EnumNode,
  type EnumValueNode,
  type FieldNode,
  type MethodNode,
  type ParamNode,
  type ParseDiagnostic,
  type ParseResult,
  type Position,
  type Range,
  type ServiceNode,
  type SourceSpan,
  type StructNode,
  type SymbolInfo,
  type TypeNode,
  isScalarType,
  HTTP_METHOD_DECORATORS,
  type SrpcHttpMethod,
} from "./ast";
import { typeToString, visitTypeNodes } from "./types";

function spanFromOffsets(
  source: string,
  start: number,
  end: number
): SourceSpan {
  return { range: offsetRange(source, start, end) };
}

function offsetRange(source: string, start: number, end: number): Range {
  const startPos = offsetToPosition(source, start);
  const endPos = offsetToPosition(source, end);
  return { start: startPos, end: endPos };
}

function offsetToPosition(source: string, offset: number): Position {
  let line = 0;
  let character = 0;

  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      character = 0;
    } else {
      character++;
    }
  }

  return { line, character };
}

class Parser {
  private index = 0;
  private diagnostics: ParseDiagnostic[] = [];

  constructor(private readonly source: string) {}

  parse(): ParseResult {
    let packageName: string | undefined;
    let packageSpan: SourceSpan | undefined;
    const declarations: DeclarationNode[] = [];

    this.skipWhitespace();

    if (this.peekKeyword("package")) {
      const pkg = this.parsePackage();
      if (pkg) {
        packageName = pkg.name;
        packageSpan = pkg.span;
      }
      this.skipWhitespace();
    }

    while (this.peekKeyword("import")) {
      const start = this.index;
      this.matchKeyword("import");

      while (!this.eof() && this.source[this.index] !== "\n") {
        this.index++;
      }

      this.error(
        "Import statements are not needed; types resolve across files automatically.",
        start,
        this.index
      );
      this.skipWhitespace();
    }

    while (!this.eof()) {
      const decl = this.parseDeclaration();
      if (decl) {
        declarations.push(decl);
      } else {
        this.skipUntilNextDeclaration();
      }
      this.skipWhitespace();
    }

    return {
      document: { packageName, packageSpan, declarations },
      diagnostics: this.diagnostics,
    };
  }

  private parsePackage(): { name: string; span: SourceSpan } | null {
    const start = this.index;
    this.matchKeyword("package");
    this.skipWhitespace();

    const nameStart = this.index;
    const name = this.readQualifiedName();

    if (!name) {
      this.error("Expected package name.", nameStart, nameStart + 1);
      return null;
    }

    return {
      name,
      span: spanFromOffsets(this.source, start, this.index),
    };
  }

  private readQualifiedName(): string | null {
    const first = this.readIdentifier();

    if (!first) {
      return null;
    }

    const parts = [first];

    while (this.peekChar(".")) {
      this.index++;
      const part = this.readIdentifier();

      if (!part) {
        this.index--;
        break;
      }

      parts.push(part);
    }

    return parts.join(".");
  }

  private parseDeclaration(): DeclarationNode | null {
    const keywordStart = this.index;

    if (this.matchKeyword("enum")) {
      return this.parseEnum(keywordStart);
    }

    if (this.matchKeyword("struct")) {
      return this.parseStruct(keywordStart);
    }

    if (this.matchKeyword("service")) {
      return this.parseService(keywordStart);
    }

    if (!this.eof()) {
      const token = this.readIdentifier() ?? this.source[this.index];
      this.error(
        `Unexpected token '${token ?? ""}'. Expected enum, struct, or service.`,
        keywordStart,
        this.index
      );
    }

    return null;
  }

  private parseEnum(start: number): EnumNode | null {
    this.skipWhitespace();
    const nameStart = this.index;
    const name = this.expectIdentifier("Expected enum name.");

    if (!name) {
      return null;
    }

    const nameSpan = spanFromOffsets(this.source, nameStart, this.index);
    this.skipWhitespace();

    if (!this.expectChar("{", "Expected '{' after enum name.")) {
      return null;
    }

    const values: EnumValueNode[] = [];

    while (!this.eof() && !this.peekChar("}")) {
      this.skipWhitespace();
      if (this.peekChar("}")) {
        break;
      }

      const valueStart = this.index;
      const valueName = this.expectIdentifier("Expected enum value.");

      if (!valueName) {
        this.skipUntil("}");
        break;
      }

      values.push({
        name: valueName,
        span: spanFromOffsets(this.source, valueStart, this.index),
      });

      this.skipWhitespace();
    }

    this.expectChar("}", "Expected '}' to close enum.");

    return {
      kind: "enum",
      name,
      values,
      span: spanFromOffsets(this.source, start, this.index),
      nameSpan,
    };
  }

  private parseStruct(start: number): StructNode | null {
    this.skipWhitespace();
    const nameStart = this.index;
    const name = this.expectIdentifier("Expected struct name.");

    if (!name) {
      return null;
    }

    const nameSpan = spanFromOffsets(this.source, nameStart, this.index);
    this.skipWhitespace();

    if (!this.expectChar("{", "Expected '{' after struct name.")) {
      return null;
    }

    const fields = this.parseFields("}");

    this.expectChar("}", "Expected '}' to close struct.");

    return {
      kind: "struct",
      name,
      fields,
      span: spanFromOffsets(this.source, start, this.index),
      nameSpan,
    };
  }

  private parseService(start: number): ServiceNode | null {
    this.skipWhitespace();
    const nameStart = this.index;
    const name = this.expectIdentifier("Expected service name.");

    if (!name) {
      return null;
    }

    const nameSpan = spanFromOffsets(this.source, nameStart, this.index);
    this.skipWhitespace();

    if (!this.expectChar("{", "Expected '{' after service name.")) {
      return null;
    }

    const methods: MethodNode[] = [];

    while (!this.eof() && !this.peekChar("}")) {
      this.skipWhitespace();

      if (this.peekChar("}")) {
        break;
      }

      const method = this.parseMethod();

      if (!method) {
        this.skipUntil("}");
        break;
      }

      methods.push(method);
    }

    this.expectChar("}", "Expected '}' to close service.");

    return {
      kind: "service",
      name,
      methods,
      span: spanFromOffsets(this.source, start, this.index),
      nameSpan,
    };
  }

  private parseMethod(): MethodNode | null {
    const start = this.index;
    const decorator = this.parseHttpMethodDecorator();
    this.skipWhitespace();
    const nameStart = this.index;
    const name = this.expectIdentifier("Expected method name.");

    if (!name) {
      return null;
    }

    const nameSpan = spanFromOffsets(this.source, nameStart, this.index);
    this.skipWhitespace();

    if (!this.expectChar("(", "Expected '(' after method name.")) {
      return null;
    }

    const params = this.parseParams();
    this.skipWhitespace();

    if (!this.expectChar(")", "Expected ')' after parameters.")) {
      return null;
    }

    this.skipWhitespace();

    if (!this.matchLiteral("=>")) {
      this.error("Expected '=>' before return type.", this.index, this.index + 2);
      return null;
    }

    this.skipWhitespace();
    const returnTypeStart = this.index;
    const returnType = this.parseType();

    if (!returnType) {
      return null;
    }

    return {
      name,
      params,
      returnType,
      httpMethod: decorator?.method,
      span: spanFromOffsets(this.source, start, this.index),
      nameSpan,
      returnTypeSpan: spanFromOffsets(this.source, returnTypeStart, this.index),
      httpMethodSpan: decorator?.span,
    };
  }

  private parseHttpMethodDecorator():
    | { method: SrpcHttpMethod; span: SourceSpan }
    | undefined {
    this.skipWhitespace();

    if (!this.peekChar("@")) {
      return undefined;
    }

    const start = this.index;
    this.index++;

    const nameStart = this.index;
    const decoratorName = this.readIdentifier();

    if (!decoratorName) {
      this.error("Expected HTTP method name after '@'.", nameStart, nameStart + 1);
      return undefined;
    }

    const method = HTTP_METHOD_DECORATORS[decoratorName.toLowerCase()];

    if (!method) {
      this.error(
        `Unknown HTTP method decorator '@${decoratorName}'. Use @get, @post, @put, @patch, or @delete.`,
        start,
        this.index
      );
      return undefined;
    }

    return {
      method,
      span: spanFromOffsets(this.source, start, this.index),
    };
  }

  private parseParams(): ParamNode[] {
    const params: ParamNode[] = [];

    this.skipWhitespace();

    if (this.peekChar(")")) {
      return params;
    }

    while (!this.eof()) {
      const paramStart = this.index;
      const nameStart = this.index;
      const name = this.expectIdentifier("Expected parameter name.");

      if (!name) {
        break;
      }

      const nameSpan = spanFromOffsets(this.source, nameStart, this.index);
      this.skipWhitespace();

      if (!this.expectChar(":", "Expected ':' after parameter name.")) {
        break;
      }

      this.skipWhitespace();
      const typeStart = this.index;
      const type = this.parseType();

      if (!type) {
        break;
      }

      params.push({
        name,
        type,
        span: spanFromOffsets(this.source, paramStart, this.index),
        nameSpan,
        typeSpan: spanFromOffsets(this.source, typeStart, this.index),
      });

      this.skipWhitespace();

      if (!this.peekChar(",")) {
        break;
      }

      this.index++;
      this.skipWhitespace();
    }

    return params;
  }

  private parseFields(closeChar: "}" | null): FieldNode[] {
    const fields: FieldNode[] = [];

    while (!this.eof()) {
      this.skipWhitespace();

      if (closeChar && this.peekChar(closeChar)) {
        break;
      }

      const fieldStart = this.index;
      const nameStart = this.index;
      const rawName = this.expectIdentifier("Expected field name.");

      if (!rawName) {
        if (closeChar && this.peekChar(closeChar)) {
          break;
        }
        this.skipLine();
        continue;
      }

      const optional = this.peekChar("?");
      if (optional) {
        this.index++;
      }

      const fieldName = rawName;
      const nameSpan = spanFromOffsets(this.source, nameStart, this.index);
      this.skipWhitespace();

      if (!this.expectChar(":", "Expected ':' after field name.")) {
        this.skipLine();
        continue;
      }

      this.skipWhitespace();
      const typeStart = this.index;
      const type = this.parseType();

      if (!type) {
        this.skipLine();
        continue;
      }

      fields.push({
        name: fieldName,
        optional,
        type,
        span: spanFromOffsets(this.source, fieldStart, this.index),
        nameSpan,
        typeSpan: spanFromOffsets(this.source, typeStart, this.index),
      });

      this.skipWhitespace();
    }

    return fields;
  }

  private parseType(): TypeNode | null {
    return this.parseUnionType();
  }

  private parseUnionType(): TypeNode | null {
    const typeStart = this.index;
    const first = this.parsePostfixType();

    if (!first) {
      return null;
    }

    const members: TypeNode[] = [first];

    this.skipWhitespace();

    while (this.peekChar("|")) {
      this.index++;
      this.skipWhitespace();

      const next = this.parsePostfixType();
      if (!next) {
        break;
      }

      members.push(next);
      this.skipWhitespace();
    }

    if (members.length === 1) {
      return first;
    }

    return {
      kind: "union",
      types: members,
      span: spanFromOffsets(this.source, typeStart, this.index),
    };
  }

  private parsePostfixType(): TypeNode | null {
    const typeStart = this.index;
    let node = this.parsePrimaryType();

    if (!node) {
      return null;
    }

    this.skipWhitespace();

    while (this.matchLiteral("[]")) {
      node = {
        kind: "array",
        element: node,
        span: spanFromOffsets(this.source, typeStart, this.index),
      };
      this.skipWhitespace();
    }

    return node;
  }

  private parsePrimaryType(): TypeNode | null {
    const typeStart = this.index;
    this.skipWhitespace();

    const literal = this.readTypeStringLiteral();
    if (literal !== null) {
      return {
        kind: "literal",
        value: literal,
        span: spanFromOffsets(this.source, typeStart, this.index),
      };
    }

    if (this.peekChar("[")) {
      this.index++;
      this.skipWhitespace();
      const elements: TypeNode[] = [];

      if (!this.peekChar("]")) {
        while (!this.eof()) {
          const element = this.parseUnionType();
          if (!element) {
            break;
          }

          elements.push(element);
          this.skipWhitespace();

          if (this.peekChar(",")) {
            this.index++;
            this.skipWhitespace();
            continue;
          }

          break;
        }
      }

      if (!this.expectChar("]", "Expected ']' to close tuple type.")) {
        return null;
      }

      return {
        kind: "tuple",
        elements,
        span: spanFromOffsets(this.source, typeStart, this.index),
      };
    }

    if (this.peekChar("{")) {
      this.index++;
      const fields = this.parseFields("}");
      this.expectChar("}", "Expected '}' to close inline struct.");

      return {
        kind: "inline-struct",
        fields,
        span: spanFromOffsets(this.source, typeStart, this.index),
      };
    }

    for (const generic of ["map", "list"] as const) {
      if (this.matchKeyword(generic)) {
        return this.parseGenericType(generic, typeStart);
      }
    }

    const identStart = this.index;
    const ident = this.readQualifiedName();

    if (!ident) {
      this.error("Expected type.", typeStart, typeStart + 1);
      return null;
    }

    const simpleName = ident.includes(".") ? ident.split(".").pop()! : ident;

    if (isScalarType(simpleName)) {
      return {
        kind: "primitive",
        name: simpleName,
        span: spanFromOffsets(this.source, identStart, this.index),
      };
    }

    return {
      kind: "reference",
      name: ident,
      span: spanFromOffsets(this.source, identStart, this.index),
    };
  }

  private parseGenericType(
    kind: "map" | "list",
    typeStart: number
  ): TypeNode | null {
    this.skipWhitespace();

    if (!this.expectChar("<", `Expected '<' after ${kind}.`)) {
      return null;
    }

    this.skipWhitespace();

    if (kind === "map") {
      const key = this.parseUnionType();
      if (!key) {
        return null;
      }

      this.skipWhitespace();
      this.expectChar(",", "Expected ',' between map key and value types.");
      this.skipWhitespace();

      const value = this.parseUnionType();
      if (!value) {
        return null;
      }

      this.skipWhitespace();
      this.expectChar(">", "Expected '>' to close map type.");

      return {
        kind: "map",
        key,
        value,
        span: spanFromOffsets(this.source, typeStart, this.index),
      };
    }

    const element = this.parseUnionType();
    if (!element) {
      return null;
    }

    this.skipWhitespace();
    this.expectChar(">", `Expected '>' to close ${kind} type.`);

    return {
      kind,
      element,
      span: spanFromOffsets(this.source, typeStart, this.index),
    };
  }

  private readTypeStringLiteral(): string | null {
    const quote = this.source[this.index];

    if (quote !== '"' && quote !== "'") {
      return null;
    }

    this.index++;
    const start = this.index;

    while (!this.eof() && this.source[this.index] !== quote) {
      this.index++;
    }

    const value = this.source.slice(start, this.index);

    if (this.peekChar(quote)) {
      this.index++;
    }

    return value;
  }

  private expectIdentifier(message: string): string | null {
    const start = this.index;
    const ident = this.readIdentifier();

    if (!ident) {
      this.error(message, start, Math.min(start + 1, this.source.length));
      return null;
    }

    return ident;
  }

  private expectChar(char: string, message: string): boolean {
    if (this.peekChar(char)) {
      this.index++;
      return true;
    }

    this.error(message, this.index, Math.min(this.index + 1, this.source.length));
    return false;
  }

  private readIdentifier(): string | null {
    const rest = this.source.slice(this.index);
    const match = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)/);

    if (!match?.[1]) {
      return null;
    }

    this.index += match[1].length;
    return match[1];
  }

  private matchKeyword(keyword: string): boolean {
    const start = this.index;
    const ident = this.readIdentifier();

    if (ident !== keyword) {
      this.index = start;
      return false;
    }

    return true;
  }

  private peekKeyword(keyword: string): boolean {
    const start = this.index;
    const ident = this.readIdentifier();
    this.index = start;
    return ident === keyword;
  }

  private matchLiteral(literal: string): boolean {
    if (this.source.startsWith(literal, this.index)) {
      this.index += literal.length;
      return true;
    }

    return false;
  }

  private peekChar(char: string): boolean {
    return this.source[this.index] === char;
  }

  private skipWhitespace(): void {
    while (!this.eof()) {
      const ch = this.source[this.index];

      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        this.index++;
        continue;
      }

      if (ch === "/" && this.source[this.index + 1] === "/") {
        while (!this.eof() && this.source[this.index] !== "\n") {
          this.index++;
        }
        continue;
      }

      break;
    }
  }

  private skipLine(): void {
    while (!this.eof() && this.source[this.index] !== "\n") {
      this.index++;
    }
  }

  private skipUntil(char: string): void {
    while (!this.eof() && !this.peekChar(char)) {
      this.index++;
    }
  }

  private skipUntilNextDeclaration(): void {
    while (!this.eof()) {
      if (
        this.peekKeyword("enum") ||
        this.peekKeyword("struct") ||
        this.peekKeyword("service") ||
        this.peekKeyword("package")
      ) {
        return;
      }

      this.index++;
    }
  }

  private error(message: string, start: number, end: number): void {
    this.diagnostics.push({
      message,
      range: offsetRange(this.source, start, Math.max(end, start + 1)),
      severity: "error",
    });
  }

  private eof(): boolean {
    return this.index >= this.source.length;
  }
}

function collectReferenceDiagnostics(
  document: DocumentNode,
  diagnostics: ParseDiagnostic[],
  resolveType: (name: string) => boolean = () => true
): void {
  const defined = new Map<string, Range>();

  for (const decl of document.declarations) {
    const qualified = document.packageName
      ? `${document.packageName}.${decl.name}`
      : decl.name;
    defined.set(decl.name, decl.nameSpan.range);
    defined.set(qualified, decl.nameSpan.range);
  }

  const checkType = (type: TypeNode): void => {
    visitTypeNodes(type, node => {
      if (node.kind !== "reference") {
        return;
      }

      const simple = node.name.includes(".")
        ? node.name.split(".").pop()!
        : node.name;

      if (
        !resolveType(node.name) &&
        !defined.has(node.name) &&
        !isScalarType(simple)
      ) {
        diagnostics.push({
          message: `Unknown type '${node.name}'.`,
          range: node.span.range,
          severity: "error",
        });
      }
    });
  };

  const seen = new Set<string>();

  for (const decl of document.declarations) {
    if (seen.has(decl.name)) {
      diagnostics.push({
        message: `Duplicate declaration '${decl.name}'.`,
        range: decl.nameSpan.range,
        severity: "error",
      });
    } else {
      seen.add(decl.name);
    }

    if (decl.kind === "struct") {
      const fieldNames = new Set<string>();

      for (const field of decl.fields) {
        if (fieldNames.has(field.name)) {
          diagnostics.push({
            message: `Duplicate field '${field.name}' in struct '${decl.name}'.`,
            range: field.nameSpan.range,
            severity: "error",
          });
        } else {
          fieldNames.add(field.name);
        }

        checkType(field.type);
      }
    }

    if (decl.kind === "service") {
      const methodNames = new Set<string>();

      for (const method of decl.methods) {
        if (methodNames.has(method.name)) {
          diagnostics.push({
            message: `Duplicate method '${method.name}' in service '${decl.name}'.`,
            range: method.nameSpan.range,
            severity: "error",
          });
        } else {
          methodNames.add(method.name);
        }

        for (const param of method.params) {
          checkType(param.type);
        }

        checkType(method.returnType);
      }
    }
  }
}

export function parseDocument(
  source: string,
  options?: { resolveType?: (name: string) => boolean }
): ParseResult {
  const result = new Parser(source).parse();
  collectReferenceDiagnostics(
    result.document,
    result.diagnostics,
    options?.resolveType
  );
  return result;
}

export function parseDocumentSyntax(source: string): ParseResult {
  return new Parser(source).parse();
}

export { typeToString };

export function collectSymbols(document: DocumentNode): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];

  for (const decl of document.declarations) {
    if (decl.kind === "enum") {
      symbols.push({
        kind: "enum",
        name: decl.name,
        range: decl.nameSpan.range,
        detail: `enum ${decl.name}`,
      });

      for (const value of decl.values) {
        symbols.push({
          kind: "enum-value",
          name: value.name,
          range: value.span.range,
          containerName: decl.name,
        });
      }
    }

    if (decl.kind === "struct") {
      symbols.push({
        kind: "struct",
        name: decl.name,
        range: decl.nameSpan.range,
        detail: `struct ${decl.name}`,
      });

      for (const field of decl.fields) {
        symbols.push({
          kind: "field",
          name: field.name,
          range: field.nameSpan.range,
          detail: `${field.name}${field.optional ? "?" : ""}: ${typeToString(field.type)}`,
          containerName: decl.name,
        });
      }
    }

    if (decl.kind === "service") {
      symbols.push({
        kind: "service",
        name: decl.name,
        range: decl.nameSpan.range,
        detail: `service ${decl.name}`,
      });

      for (const method of decl.methods) {
        const httpPrefix = method.httpMethod
          ? `@${method.httpMethod.toLowerCase()} `
          : "";
        const params = method.params
          .map(p => `${p.name}: ${typeToString(p.type)}`)
          .join(", ");

        symbols.push({
          kind: "method",
          name: method.name,
          range: method.nameSpan.range,
          detail: `${httpPrefix}${method.name}(${params}) => ${typeToString(method.returnType)}`,
          containerName: decl.name,
        });
      }
    }
  }

  return symbols;
}

export function findSymbolAtPosition(
  document: DocumentNode,
  position: Position
): SymbolInfo | null {
  const symbols = collectSymbols(document);

  for (const symbol of symbols) {
    if (positionInRange(position, symbol.range)) {
      return symbol;
    }
  }

  for (const decl of document.declarations) {
    if (positionInRange(position, decl.nameSpan.range)) {
      return {
        kind: decl.kind,
        name: decl.name,
        range: decl.nameSpan.range,
      };
    }

    if (decl.kind === "struct") {
      for (const field of decl.fields) {
        if (positionInRange(position, field.typeSpan.range)) {
          const ref = typeReferenceAt(field.type, position);
          if (ref) {
            return ref;
          }
        }
      }
    }

    if (decl.kind === "service") {
      for (const method of decl.methods) {
        if (positionInRange(position, method.returnTypeSpan.range)) {
          const ref = typeReferenceAt(method.returnType, position);
          if (ref) {
            return ref;
          }
        }

        for (const param of method.params) {
          if (positionInRange(position, param.typeSpan.range)) {
            const ref = typeReferenceAt(param.type, position);
            if (ref) {
              return ref;
            }
          }
        }
      }
    }
  }

  return null;
}

function typeReferenceAt(
  type: TypeNode,
  position: Position
): SymbolInfo | null {
  let found: SymbolInfo | null = null;

  visitTypeNodes(type, node => {
    if (!found && node.kind === "reference" && positionInRange(position, node.span.range)) {
      found = {
        kind: "struct",
        name: node.name,
        range: node.span.range,
      };
    }
  });

  return found;
}

export function findDefinition(
  document: DocumentNode,
  position: Position
): Range | null {
  const symbol = findSymbolAtPosition(document, position);

  if (!symbol) {
    return null;
  }

  for (const decl of document.declarations) {
    if (decl.name === symbol.name) {
      return decl.nameSpan.range;
    }
  }

  return null;
}

export function positionInRange(position: Position, range: Range): boolean {
  if (position.line < range.start.line || position.line > range.end.line) {
    return false;
  }

  if (position.line === range.start.line && position.character < range.start.character) {
    return false;
  }

  if (position.line === range.end.line && position.character > range.end.character) {
    return false;
  }

  return true;
}

export function formatDocument(source: string): string {
  const { document } = parseDocumentSyntax(source);
  const lines: string[] = [];

  if (document.packageName) {
    lines.push(`package ${document.packageName}`);
    lines.push("");
  }

  for (const decl of document.declarations) {
    if (decl.kind === "enum") {
      lines.push(`enum ${decl.name} {`);
      for (const value of decl.values) {
        lines.push(`    ${value.name}`);
      }
      lines.push("}");
      lines.push("");
    }

    if (decl.kind === "struct") {
      lines.push(`struct ${decl.name} {`);
      for (const field of decl.fields) {
        lines.push(
          `    ${field.name}${field.optional ? "?" : ""}: ${typeToString(field.type)}`
        );
      }
      lines.push("}");
      lines.push("");
    }

    if (decl.kind === "service") {
      lines.push(`service ${decl.name} {`);

      for (const method of decl.methods) {
        const decorator = method.httpMethod
          ? `@${method.httpMethod.toLowerCase()} `
          : "";
        lines.push(`    ${decorator}${method.name}(`);
        if (method.params.length > 0) {
          for (const param of method.params) {
            lines.push(`        ${param.name}: ${typeToString(param.type)}`);
          }
        }
        lines.push(`    ) => ${typeToString(method.returnType)}`);
      }

      lines.push("}");
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}
