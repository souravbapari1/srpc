import { join } from "node:path";
import { test, expect } from "bun:test";
import { buildContractDocs } from "../src/contract-docs.ts";
import { exampleRequest } from "../rpc/docs/examples.ts";

const contractDir = join(import.meta.dir, "../../example/contract");

test("exampleRequest builds a full SRPC envelope with realistic params", () => {
  const store = buildContractDocs({ contractDir });
  const service = store.getService("analytics", "AnalyticsService");
  const method = service?.methods.find(entry => entry.name === "getDashboard");

  expect(method).toBeDefined();

  const json = exampleRequest(store, "analytics", "analytics.AnalyticsService", method!);
  expect(JSON.parse(json)).toEqual({
    srpc: "1.0",
    service: "analytics.AnalyticsService",
    method: "getDashboard",
    id: "req-1",
    params: {
      dateRange: {
        from: "2025-06-01T00:00:00.000Z",
        to: "2025-06-24T23:59:59.000Z",
      },
      storeId: "example-id",
    },
  });
});

test("exampleRequest includes nested struct fields for user lookups", () => {
  const store = buildContractDocs({ contractDir });
  const service = store.getService("user", "UserService");
  const method = service?.methods.find(entry => entry.name === "getUser");

  expect(method).toBeDefined();

  const json = exampleRequest(store, "user", "user.UserService", method!);
  expect(JSON.parse(json)).toMatchObject({
    srpc: "1.0",
    service: "user.UserService",
    method: "getUser",
    id: "req-1",
    params: {
      id: "example-id",
    },
  });
});
