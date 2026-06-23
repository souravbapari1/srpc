export { generateFromContracts, type GenerateOptions, type GenerateResult } from "./src/codegen.ts";
export { scanContractFiles, type ContractFile } from "./src/scan.ts";
export { typeNodeToTs } from "./src/ts-type.ts";

/** @deprecated use generateFromContracts */
export { generateTypes } from "./src/struck.ts";

export * from "./rpc/index.ts";
