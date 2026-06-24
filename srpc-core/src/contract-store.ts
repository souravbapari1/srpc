import * as fs from "fs";
import * as path from "path";
import { parseDocument, parseDocumentSyntax } from "../../srpc-vscode/server/src/parser.ts";
import { buildContractDocs, type ContractDocsStore } from "./contract-docs.ts";
import { scanContractFiles, type ContractFile } from "./scan.ts";

export interface ContractDiagnostic {
  message: string;
  severity: "error" | "warning";
}

export interface ContractValidationResult {
  valid: boolean;
  diagnostics: ContractDiagnostic[];
}

export interface ContractSourceEntry {
  package: string;
  file: string;
  source: string;
}

export interface CreateContractInput {
  package: string;
  source: string;
  file?: string;
}

export interface UpdateContractInput {
  source: string;
}

export interface ContractStore {
  contractDir: string;
  docs: ContractDocsStore;
  listSources(): ContractSourceEntry[];
  getSource(packageName: string): ContractSourceEntry | undefined;
  validateSource(
    source: string,
    options?: { package?: string; file?: string; excludePackage?: string }
  ): ContractValidationResult;
  createContract(input: CreateContractInput): ContractSourceEntry;
  updateContract(packageName: string, input: UpdateContractInput): ContractSourceEntry;
  deleteContract(packageName: string): void;
  refresh(): void;
}

export interface CreateContractStoreOptions {
  contractDir: string;
}

const BUILTIN_TYPES = new Set([
  "string",
  "int",
  "float",
  "boolean",
  "date",
  "datetime",
  "bytes",
  "any",
]);

export function createContractStore(
  options: CreateContractStoreOptions
): ContractStore {
  const contractDir = path.resolve(options.contractDir);

  let docs = buildContractDocs({ contractDir });

  function refresh(): void {
    docs = buildContractDocs({ contractDir });
  }

  function listSources(): ContractSourceEntry[] {
    return scanContractFiles(contractDir).map(file => ({
      package: packageFromFile(file),
      file: file.relativePath,
      source: file.source,
    }));
  }

  function getSource(packageName: string): ContractSourceEntry | undefined {
    const pkg = docs.getPackage(packageName);
    if (!pkg) {
      return undefined;
    }

    const absolutePath = path.join(contractDir, pkg.file);
    return {
      package: packageName,
      file: pkg.file,
      source: fs.readFileSync(absolutePath, "utf8"),
    };
  }

  function createContract(input: CreateContractInput): ContractSourceEntry {
    const relativePath = sanitizeContractFile(input.file ?? `${input.package}.ctr`);
    const absolutePath = path.join(contractDir, relativePath);

    if (fs.existsSync(absolutePath)) {
      throw contractError(
        "file_exists",
        `Contract file already exists at ${relativePath}`
      );
    }

    if (docs.getPackage(input.package)) {
      throw contractError(
        "package_exists",
        `Package '${input.package}' already exists`
      );
    }

    const validation = validateSource(input.source, {
      package: input.package,
      file: relativePath,
    });
    if (!validation.valid) {
      throw contractValidationError(validation.diagnostics);
    }

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, normalizeSource(input.source), "utf8");
    refresh();

    return {
      package: input.package,
      file: relativePath,
      source: normalizeSource(input.source),
    };
  }

  function updateContract(
    packageName: string,
    input: UpdateContractInput
  ): ContractSourceEntry {
    const existing = getSource(packageName);
    if (!existing) {
      throw contractError("not_found", `Package '${packageName}' not found`);
    }

    const validation = validateSource(input.source, {
      package: packageName,
      file: existing.file,
      excludePackage: packageName,
    });
    if (!validation.valid) {
      throw contractValidationError(validation.diagnostics);
    }

    const absolutePath = path.join(contractDir, existing.file);
    fs.writeFileSync(absolutePath, normalizeSource(input.source), "utf8");
    refresh();

    return {
      package: packageName,
      file: existing.file,
      source: normalizeSource(input.source),
    };
  }

  function deleteContract(packageName: string): void {
    const existing = getSource(packageName);
    if (!existing) {
      throw contractError("not_found", `Package '${packageName}' not found`);
    }

    fs.unlinkSync(path.join(contractDir, existing.file));
    refresh();
  }

  function validateSource(
    source: string,
    options: { package?: string; file?: string; excludePackage?: string } = {}
  ): ContractValidationResult {
    const files = scanContractFiles(contractDir).filter(file => {
      if (!options.excludePackage) {
        return true;
      }

      return packageFromFile(file) !== options.excludePackage;
    });

    if (options.file) {
      files.push({
        absolutePath: path.join(contractDir, options.file),
        relativePath: options.file,
        source,
      });
    } else if (options.package) {
      files.push({
        absolutePath: path.join(contractDir, `${options.package}.ctr`),
        relativePath: `${options.package}.ctr`,
        source,
      });
    }

    const diagnostics = validateContractFiles(files);
    return {
      valid: diagnostics.every(diagnostic => diagnostic.severity !== "error"),
      diagnostics,
    };
  }

  return {
    get contractDir() {
      return contractDir;
    },
    get docs() {
      return docs;
    },
    listSources,
    getSource,
    validateSource,
    createContract,
    updateContract,
    deleteContract,
    refresh,
  };
}

export class ContractStoreError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly diagnostics: ContractDiagnostic[] = []
  ) {
    super(message);
    this.name = "ContractStoreError";
  }
}

function contractError(code: string, message: string): ContractStoreError {
  return new ContractStoreError(code, message);
}

function contractValidationError(
  diagnostics: ContractDiagnostic[]
): ContractStoreError {
  const message = diagnostics.map(diagnostic => diagnostic.message).join("; ");
  return new ContractStoreError("validation_failed", message, diagnostics);
}

function sanitizeContractFile(fileName: string): string {
  const base = path.basename(fileName);
  if (!/\.(ctr|rpc)$/i.test(base)) {
    throw contractError("invalid_file", "Contract file must end with .ctr or .rpc");
  }

  return base.replace(/[^A-Za-z0-9._-]/g, "_");
}

function normalizeSource(source: string): string {
  return source.endsWith("\n") ? source : `${source}\n`;
}

function packageFromFile(file: ContractFile): string {
  const { document } = parseDocumentSyntax(file.source);
  return document.packageName ?? fileNameToPackage(file.relativePath);
}

function fileNameToPackage(relativePath: string): string {
  const base = relativePath.replace(/\\/g, "/").split("/").pop() ?? relativePath;
  return base.replace(/\.(ctr|rpc)$/i, "");
}

function validateContractFiles(files: ContractFile[]): ContractDiagnostic[] {
  const diagnostics: ContractDiagnostic[] = [];
  const globalNames = new Map<string, string>();
  const typeNames = new Set<string>();

  for (const file of files) {
    const syntax = parseDocumentSyntax(file.source);
    const packageName = packageFromFile(file);

    for (const diagnostic of syntax.diagnostics) {
      diagnostics.push({
        message: `${file.relativePath}: ${diagnostic.message}`,
        severity: diagnostic.severity,
      });
    }

    if (syntax.document.packageName) {
      registerGlobalName(
        diagnostics,
        globalNames,
        syntax.document.packageName,
        file.relativePath,
        "package"
      );
    }

    for (const decl of syntax.document.declarations) {
      registerGlobalName(
        diagnostics,
        globalNames,
        decl.name,
        file.relativePath,
        decl.kind
      );

      if (decl.kind === "struct" || decl.kind === "enum") {
        typeNames.add(decl.name);
        typeNames.add(`${packageName}.${decl.name}`);
      }
    }
  }

  const resolveType = (name: string): boolean => {
    if (BUILTIN_TYPES.has(name)) {
      return true;
    }

    if (typeNames.has(name)) {
      return true;
    }

    const simple = name.includes(".") ? name.split(".").pop()! : name;
    return BUILTIN_TYPES.has(simple) || typeNames.has(simple);
  };

  for (const file of files) {
    const result = parseDocument(file.source, { resolveType });
    for (const diagnostic of result.diagnostics) {
      diagnostics.push({
        message: `${file.relativePath}: ${diagnostic.message}`,
        severity: diagnostic.severity,
      });
    }
  }

  return diagnostics;
}

function registerGlobalName(
  diagnostics: ContractDiagnostic[],
  globalNames: Map<string, string>,
  name: string,
  file: string,
  kind: string
): void {
  const existing = globalNames.get(name);
  if (existing && existing !== file) {
    diagnostics.push({
      message: `Duplicate ${kind} '${name}' in ${file}. Also declared in ${existing}.`,
      severity: "error",
    });
    return;
  }

  globalNames.set(name, file);
}
