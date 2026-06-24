import type { ContractDocsStore } from "../../src/contract-docs.ts";
import type { MethodDoc, ServiceDoc } from "../../src/contract-docs.ts";
import { buildTypeLinkIndex, collectContractTypeRefs } from "./type-links.ts";

export interface ContractGraphNode {
  id: string;
  label: string;
  group: "package" | "service";
  package: string;
  title: string;
  href?: string;
  /** Service nodes: number of RPC methods. */
  methodCount?: number;
  /** Service nodes: short HTTP method summary for labels. */
  methodsSummary?: string;
}

export interface ContractGraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashes?: boolean;
  title?: string;
}

export interface ContractGraph {
  nodes: ContractGraphNode[];
  edges: ContractGraphEdge[];
  stats: {
    packages: number;
    services: number;
    packageLinks: number;
    serviceLinks: number;
  };
}

export interface BuildContractGraphOptions {
  includeServices?: boolean;
}

export function buildContractGraph(
  store: ContractDocsStore,
  options: BuildContractGraphOptions = {}
): ContractGraph {
  const includeServices = options.includeServices ?? true;
  const typeIndex = buildTypeLinkIndex(store);
  const nodes: ContractGraphNode[] = [];
  const edges: ContractGraphEdge[] = [];
  const packageDeps = new Map<string, number>();

  for (const summary of store.index.packages) {
    const pkg = store.getPackage(summary.name);
    if (!pkg) continue;

    nodes.push({
      id: packageNodeId(pkg.package),
      label: pkg.package,
      group: "package",
      package: pkg.package,
      title: `${pkg.services.length} services · ${pkg.structs.length} structs · ${pkg.enums.length} enums`,
      href: `/docs/${pkg.package}`,
    });

    if (includeServices) {
      for (const service of pkg.services) {
        nodes.push({
          id: serviceNodeId(pkg.package, service.name),
          label: service.name,
          group: "service",
          package: pkg.package,
          title: buildServiceTooltip(service),
          href: `/docs/${pkg.package}/${service.name}`,
          methodCount: service.methods.length,
          methodsSummary: buildMethodsSummary(service.methods),
        });

        edges.push({
          id: `contains:${pkg.package}:${service.name}`,
          from: packageNodeId(pkg.package),
          to: serviceNodeId(pkg.package, service.name),
          dashes: true,
          title: "contains",
        });
      }
    }

    recordPackageRefs(pkg.package, pkg.package, typeIndex, packageDeps, collectPackageTypeStrings(pkg, includeServices));
  }

  let edgeId = 0;
  for (const [key, count] of packageDeps.entries()) {
    const [fromPkg, toPkg] = key.split("->") as [string, string];
    edges.push({
      id: `dep:${edgeId++}`,
      from: packageNodeId(fromPkg),
      to: packageNodeId(toPkg),
      label: String(count),
      title: `${count} type reference${count === 1 ? "" : "s"}`,
    });
  }

  const serviceLinks = edges.filter(edge => edge.dashes).length;

  return {
    nodes,
    edges,
    stats: {
      packages: store.index.packages.length,
      services: store.index.totalServices,
      packageLinks: edges.length - serviceLinks,
      serviceLinks,
    },
  };
}

function collectPackageTypeStrings(
  pkg: NonNullable<ReturnType<ContractDocsStore["getPackage"]>>,
  includeServices: boolean
): string[] {
  const types: string[] = [];

  for (const struct of pkg.structs) {
    for (const field of struct.fields) {
      types.push(field.type);
    }
  }

  if (includeServices) {
    for (const service of pkg.services) {
      for (const method of service.methods) {
        for (const param of method.params) {
          types.push(param.type);
        }
        types.push(method.returnType);
      }
    }
  }

  return types;
}

function recordPackageRefs(
  sourcePackage: string,
  contextPackage: string,
  typeIndex: ReturnType<typeof buildTypeLinkIndex>,
  packageDeps: Map<string, number>,
  typeStrings: string[]
): void {
  for (const type of typeStrings) {
    for (const ref of collectContractTypeRefs(type, typeIndex, contextPackage)) {
      if (ref.package === sourcePackage) {
        continue;
      }
      const key = `${sourcePackage}->${ref.package}`;
      packageDeps.set(key, (packageDeps.get(key) ?? 0) + 1);
    }
  }
}

function packageNodeId(packageName: string): string {
  return `pkg:${packageName}`;
}

function serviceNodeId(packageName: string, serviceName: string): string {
  return `svc:${packageName}:${serviceName}`;
}

function buildMethodsSummary(methods: MethodDoc[], max = 3): string {
  if (methods.length === 0) {
    return "no methods";
  }

  const shown = methods.slice(0, max).map(method => `${method.httpMethod} ${method.name}`);
  if (methods.length > max) {
    shown.push(`+${methods.length - max}`);
  }

  return shown.join(" · ");
}

function buildServiceTooltip(service: ServiceDoc): string {
  const header = `${service.qualifiedName} — ${service.methods.length} method${service.methods.length === 1 ? "" : "s"}`;
  if (service.methods.length === 0) {
    return header;
  }

  const lines = service.methods.map(method => {
    const params = method.params.map(param => `${param.name}: ${param.type}`).join(", ");
    const signature = params ? `${method.name}(${params})` : `${method.name}()`;
    return `${method.httpMethod} ${signature} → ${method.returnType}`;
  });

  return [header, ...lines].join("\n");
}
