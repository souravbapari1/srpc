import type { ContractDocsStore, MethodDoc } from "../../src/contract-docs.ts";
import { buildMethodParamsSample } from "../sample-values.ts";

export function exampleRequest(
  store: ContractDocsStore,
  packageName: string,
  service: string,
  method: MethodDoc
): string {
  return JSON.stringify(
    {
      srpc: "1.0",
      service,
      method: method.name,
      id: "req-1",
      params: buildMethodParamsSample(store, packageName, method),
    },
    null,
    2
  );
}
