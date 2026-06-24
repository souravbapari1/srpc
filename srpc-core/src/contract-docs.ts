import type {
  DeclarationNode,
  MethodNode,
  ServiceNode,
} from "../../srpc-vscode/server/src/ast.ts";
import { parseDocumentSyntax } from "../../srpc-vscode/server/src/parser.ts";
import { scanContractFiles } from "./scan.ts";
import { fieldToContract, typeNodeToContract } from "./type-format.ts";

export interface ContractDocsOptions {
  contractDir: string;
}

export interface ContractDocsIndex {
  contractDir: string;
  packages: ContractPackageSummary[];
  totalServices: number;
  totalMethods: number;
  totalStructs: number;
  totalEnums: number;
}

export interface ServiceListing extends ServiceDoc {
  package: string;
}

export interface StructListing extends StructDoc {
  package: string;
}

export interface EnumListing extends EnumDoc {
  package: string;
}

export interface ContractPackageSummary {
  name: string;
  file: string;
  structs: number;
  enums: number;
  services: number;
}

export interface ContractPackageDocs {
  package: string;
  file: string;
  structs: StructDoc[];
  enums: EnumDoc[];
  services: ServiceDoc[];
}

export interface StructDoc {
  name: string;
  qualifiedName: string;
  fields: FieldDoc[];
}

export interface FieldDoc {
  name: string;
  type: string;
  optional: boolean;
}

export interface EnumDoc {
  name: string;
  qualifiedName: string;
  values: string[];
}

export interface ServiceDoc {
  name: string;
  qualifiedName: string;
  methods: MethodDoc[];
}

export interface MethodDoc {
  name: string;
  httpMethod: string;
  params: ParamDoc[];
  returnType: string;
  implemented?: boolean;
}

export interface ParamDoc {
  name: string;
  type: string;
}

interface PackageEntry {
  name: string;
  file: string;
  structs: StructDoc[];
  enums: EnumDoc[];
  services: ServiceDoc[];
}

export interface ContractDocsStore {
  index: ContractDocsIndex;
  getPackage(packageName: string): ContractPackageDocs | undefined;
  getService(packageName: string, serviceName: string): ServiceDoc | undefined;
  getStruct(packageName: string, structName: string): StructDoc | undefined;
  getEnum(packageName: string, enumName: string): EnumDoc | undefined;
  getAllServices(): ServiceListing[];
  getAllStructs(): StructListing[];
  getAllEnums(): EnumListing[];
}

export interface BuildContractDocsOptions extends ContractDocsOptions {
  /** Mark methods that have registered handlers as implemented. */
  implementedMethods?: Record<string, Set<string>>;
}

export function buildContractDocs(
  options: BuildContractDocsOptions
): ContractDocsStore {
  const contractDir = options.contractDir;
  const files = scanContractFiles(contractDir);
  const packages = new Map<string, PackageEntry>();

  for (const file of files) {
    const { document } = parseDocumentSyntax(file.source);
    const packageName =
      document.packageName ?? fileNameToPackage(file.relativePath);
    const qualifiedPrefix = packageName;

    let entry = packages.get(packageName);
    if (!entry) {
      entry = {
        name: packageName,
        file: file.relativePath,
        structs: [],
        enums: [],
        services: [],
      };
      packages.set(packageName, entry);
    }

    for (const decl of document.declarations) {
      appendDeclaration(entry, decl, qualifiedPrefix, options.implementedMethods);
    }
  }

  const sortedPackages = [...packages.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const index: ContractDocsIndex = {
    contractDir,
    packages: sortedPackages.map(pkg => ({
      name: pkg.name,
      file: pkg.file,
      structs: pkg.structs.length,
      enums: pkg.enums.length,
      services: pkg.services.length,
    })),
    totalServices: sortedPackages.reduce((n, pkg) => n + pkg.services.length, 0),
    totalMethods: sortedPackages.reduce(
      (n, pkg) => n + pkg.services.reduce((m, svc) => m + svc.methods.length, 0),
      0
    ),
    totalStructs: sortedPackages.reduce((n, pkg) => n + pkg.structs.length, 0),
    totalEnums: sortedPackages.reduce((n, pkg) => n + pkg.enums.length, 0),
  };

  const allServices: ServiceListing[] = sortedPackages.flatMap(pkg =>
    pkg.services.map(service => ({
      package: pkg.name,
      ...service,
    }))
  );

  const allStructs: StructListing[] = sortedPackages.flatMap(pkg =>
    pkg.structs.map(struct => ({
      package: pkg.name,
      ...struct,
    }))
  );

  const allEnums: EnumListing[] = sortedPackages.flatMap(pkg =>
    pkg.enums.map(enumDoc => ({
      package: pkg.name,
      ...enumDoc,
    }))
  );

  return {
    index,
    getAllServices() {
      return allServices;
    },
    getAllStructs() {
      return allStructs;
    },
    getAllEnums() {
      return allEnums;
    },
    getPackage(packageName: string) {
      const pkg = packages.get(packageName);
      if (!pkg) {
        return undefined;
      }

      return {
        package: pkg.name,
        file: pkg.file,
        structs: pkg.structs,
        enums: pkg.enums,
        services: pkg.services,
      };
    },
    getService(packageName: string, serviceName: string) {
      const pkg = packages.get(packageName);
      return pkg?.services.find(service => service.name === serviceName);
    },
    getStruct(packageName: string, structName: string) {
      const pkg = packages.get(packageName);
      return pkg?.structs.find(struct => struct.name === structName);
    },
    getEnum(packageName: string, enumName: string) {
      const pkg = packages.get(packageName);
      return pkg?.enums.find(enumDoc => enumDoc.name === enumName);
    },
  };
}

function appendDeclaration(
  entry: PackageEntry,
  decl: DeclarationNode,
  packageName: string,
  implementedMethods?: Record<string, Set<string>>
): void {
  if (decl.kind === "struct") {
    entry.structs.push({
      name: decl.name,
      qualifiedName: `${packageName}.${decl.name}`,
      fields: decl.fields.map(field => ({
        name: field.name,
        type: typeNodeToContract(field.type),
        optional: field.optional,
      })),
    });
    return;
  }

  if (decl.kind === "enum") {
    entry.enums.push({
      name: decl.name,
      qualifiedName: `${packageName}.${decl.name}`,
      values: decl.values.map(value => value.name),
    });
    return;
  }

  entry.services.push(serviceToDoc(decl, packageName, implementedMethods));
}

function serviceToDoc(
  service: ServiceNode,
  packageName: string,
  implementedMethods?: Record<string, Set<string>>
): ServiceDoc {
  const qualifiedName = `${packageName}.${service.name}`;
  const implemented = implementedMethods?.[qualifiedName];

  return {
    name: service.name,
    qualifiedName,
    methods: service.methods.map(method =>
      methodToDoc(method, implemented)
    ),
  };
}

function methodToDoc(
  method: MethodNode,
  implemented?: Set<string>
): MethodDoc {
  return {
    name: method.name,
    httpMethod: method.httpMethod ?? "POST",
    params: method.params.map(param => ({
      name: param.name,
      type: typeNodeToContract(param.type),
    })),
    returnType: typeNodeToContract(method.returnType),
    ...(implemented
      ? { implemented: implemented.has(method.name) }
      : {}),
  };
}

function fileNameToPackage(relativePath: string): string {
  const base = relativePath.replace(/\\/g, "/").split("/").pop() ?? relativePath;
  return base.replace(/\.(ctr|rpc)$/i, "");
}

export function implementedMethodsFromServices(
  services: Array<{ key: string; handlers: Record<string, unknown> }>
): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {};

  for (const service of services) {
    map[service.key] = new Set(Object.keys(service.handlers));
  }

  return map;
}
