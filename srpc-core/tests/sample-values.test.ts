import { join } from "node:path";
import { test, expect } from "bun:test";
import { buildContractDocs } from "../src/contract-docs.ts";
import { buildMethodParamsSample } from "../rpc/sample-values.ts";

const contractDir = join(import.meta.dir, "../../example/contract");

test("buildMethodParamsSample generates realistic ping params", () => {
  const store = buildContractDocs({ contractDir });
  const service = store.getService("demo", "DemoService");
  const method = service?.methods.find(entry => entry.name === "ping");

  expect(method).toBeDefined();
  expect(buildMethodParamsSample(store, "demo", method!)).toEqual({
    message: "hello",
  });
});

test("buildMethodParamsSample generates nested dashboard params", () => {
  const store = buildContractDocs({ contractDir });
  const service = store.getService("analytics", "AnalyticsService");
  const method = service?.methods.find(entry => entry.name === "getDashboard");

  expect(method).toBeDefined();
  expect(buildMethodParamsSample(store, "analytics", method!)).toEqual({
    dateRange: {
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-24T23:59:59.000Z",
    },
    storeId: "example-id",
  });
});

test("buildMethodParamsSample fills money structs with valid values", () => {
  const store = buildContractDocs({ contractDir });
  const money = store.getStruct("common", "Money");

  expect(money).toBeDefined();
  const sample = buildMethodParamsSample(store, "common", {
    name: "sample",
    httpMethod: "POST",
    params: [{ name: "data", type: "common.Money" }],
    returnType: "common.Money",
  });

  expect(sample).toEqual({
    amount: 1999,
    currency: "USD",
  });
});
