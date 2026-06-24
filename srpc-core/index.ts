export { generateFromContracts, type GenerateOptions, type GenerateResult } from "./src/codegen.ts";
export { scanContractFiles, type ContractFile } from "./src/scan.ts";
export { typeNodeToTs } from "./src/ts-type.ts";
export { typeNodeToContract } from "./src/type-format.ts";
export {
  buildContractDocs,
  implementedMethodsFromServices,
  type BuildContractDocsOptions,
  type ContractDocsIndex,
  type ContractDocsStore,
  type ContractPackageDocs,
  type ContractPackageSummary,
  type EnumDoc,
  type EnumListing,
  type FieldDoc,
  type MethodDoc,
  type ParamDoc,
  type ServiceDoc,
  type ServiceListing,
  type StructDoc,
  type StructListing,
} from "./src/contract-docs.ts";
export {
  createContractStore,
  ContractStoreError,
  type ContractDiagnostic,
  type ContractSourceEntry,
  type ContractStore,
  type ContractValidationResult,
  type CreateContractInput,
  type CreateContractStoreOptions,
  type UpdateContractInput,
} from "./src/contract-store.ts";

/** @deprecated use generateFromContracts */
export { generateTypes } from "./src/struck.ts";

export * from "./rpc/index.ts";
