import type { ContractDocsStore } from "../../src/contract-docs.ts";

export interface PageContext {
  store: ContractDocsStore;
  activePackage?: string;
  activeService?: string;
  activeTypes?: boolean;
  activeVisualizer?: boolean;
  activeTypeKind?: "struct" | "enum";
  activeTypeName?: string;
}

export interface TypeLinkRef {
  kind: "struct" | "enum";
  package: string;
  name: string;
  qualifiedName: string;
}
