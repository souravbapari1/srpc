import { test, expect } from "bun:test";
import express from "express";
import {
  buildHttpMethodRegistryFromServices,
  buildServiceRegistry,
  createSrpcRouter,
  defineService,
  handleSrpcRequest,
  servicePath,
  SrpcErrorCode,
} from "../rpc/index.ts";
import { createServiceClient } from "srpc-client";
import { UserService } from "../../example/generated/srpc-types.ts";
import type { User } from "../../example/generated/srpc-types.ts";
import type { SrpcHandlerContext } from "../rpc/context.ts";

function mockUser(overrides: Partial<User> & { id: string; name: string }): User {
  return {
    email: "test@example.com",
    age: 1,
    isActive: true,
    dateOfBirth: new Date("2000-01-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
    products: [],
    ...overrides,
  };
}

function userHandlers() {
  return {
    getUser: ({ id }: { id: string }, _ctx: SrpcHandlerContext) =>
      mockUser({ id, name: "Test" }),
    createUser: ({ id }: { id: string }, _ctx: SrpcHandlerContext) =>
      mockUser({ id, name: "Created" }),
    updateUser2: ({ id }: { id: string }, _ctx: SrpcHandlerContext) =>
      mockUser({ id, name: "Patched" }),
    updateUser: ({ id }: { id: string }, _ctx: SrpcHandlerContext) =>
      mockUser({ id, name: "Updated" }),
    deleteUser: ({ id }: { id: string }, _ctx: SrpcHandlerContext) =>
      mockUser({ id, name: "Deleted" }),
  };
}

function userServiceRegistry(): Record<
  string,
  Record<string, import("../rpc/handler.ts").ServiceMethodHandler>
> {
  return {
    [servicePath("user", "UserService")]: userHandlers() as Record<
      string,
      import("../rpc/handler.ts").ServiceMethodHandler
    >,
  };
}

test("defineService builds typed registry entry from metadata", () => {
  const user = defineService(UserService, userHandlers());

  expect(user.key).toBe("user.UserService");
  expect(user.packageName).toBe("user");
  expect(user.serviceName).toBe("UserService");
  expect(user.methodHttpMethods.getUser).toBe("GET");

  const registry = buildServiceRegistry([user]);
  expect(registry["user.UserService"]?.getUser).toBeDefined();
});

test("dispatches rpc call to registered service", async () => {
  const response = await handleSrpcRequest(
    {
      srpc: "1.0",
      service: servicePath("user", "UserService"),
      method: "getUser",
      params: { id: "42" },
    },
    {
      services: {
        [servicePath("user", "UserService")]: {
          getUser: (params: unknown, _ctx) => ({
            id: (params as { id: string }).id,
            name: "Test",
          }),
        },
      },
    }
  );

  expect("result" in response).toBe(true);

  if ("result" in response) {
    expect(response.result).toEqual({ id: "42", name: "Test" });
  }
});

test("returns service not found error", async () => {
  const response = await handleSrpcRequest(
    {
      srpc: "1.0",
      service: "missing.Service",
      method: "ping",
    },
    { services: {} }
  );

  expect("error" in response).toBe(true);

  if ("error" in response) {
    expect(response.error.code).toBe(SrpcErrorCode.SERVICE_NOT_FOUND);
  }
});

test("express endpoint handles rpc request with contract HTTP methods", async () => {
  const app = express();
  app.use(
    createSrpcRouter({
      services: [defineService(UserService, userHandlers())],
    })
  );

  const server = app.listen(0);
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }

  const client = createServiceClient(UserService, {
    baseUrl: `http://127.0.0.1:${address.port}`,
  });

  const user = await client.getUser({ id: "1" });
  server.close();

  expect(user.id).toBe("1");
  expect(user.name).toBe("Test");
});

test("rejects wrong HTTP method for decorated service method", async () => {
  const user = defineService(UserService, userHandlers());

  const response = await handleSrpcRequest(
    {
      srpc: "1.0",
      service: servicePath("user", "UserService"),
      method: "getUser",
      params: { id: "1" },
    },
    {
      services: buildServiceRegistry([user]),
      httpMethods: buildHttpMethodRegistryFromServices([user]),
    },
    { method: "POST" } as express.Request
  );

  expect("error" in response).toBe(true);

  if ("error" in response) {
    expect(response.error.code).toBe(SrpcErrorCode.METHOD_NOT_ALLOWED);
    expect(response.error.message).toBe("This request must use GET, not POST.");
    expect(response.error.detail).toContain("must be called with HTTP GET");
  }
});

test("passes request headers to service handler context", async () => {
  const response = await handleSrpcRequest(
    {
      srpc: "1.0",
      id: "req-1",
      service: servicePath("user", "UserService"),
      method: "getUser",
      params: { id: "42" },
    },
    {
      services: {
        [servicePath("user", "UserService")]: {
          getUser: (_params, ctx) => ({
            token: ctx.getBearerToken(),
            requestId: ctx.requestId,
            userAgent: ctx.getHeader("user-agent"),
          }),
        },
      },
    },
    {
      headers: {
        authorization: "Bearer secret-token",
        "user-agent": "srpc-test",
      },
      get(name: string) {
        const value = this.headers[name.toLowerCase()];
        return Array.isArray(value) ? value[0] : value;
      },
      ip: "127.0.0.1",
    } as express.Request
  );

  expect("result" in response).toBe(true);

  if ("result" in response) {
    expect(response.result).toEqual({
      token: "secret-token",
      requestId: "req-1",
      userAgent: "srpc-test",
    });
  }
});

test("logger records request and response", async () => {
  const requests: unknown[] = [];
  const responses: unknown[] = [];

  await handleSrpcRequest(
    {
      srpc: "1.0",
      id: "req-log",
      service: servicePath("user", "UserService"),
      method: "getUser",
      params: { id: "1" },
    },
    {
      services: {
        [servicePath("user", "UserService")]: {
          getUser: () => ({ id: "1", name: "Logged" }),
        },
      },
      logger: {
        request(entry) {
          requests.push(entry);
        },
        response(entry) {
          responses.push(entry);
        },
      },
    },
    { method: "GET" } as express.Request
  );

  expect(requests).toHaveLength(1);
  expect(responses).toHaveLength(1);

  expect(requests[0]).toMatchObject({
    httpMethod: "GET",
    service: "user.UserService",
    method: "getUser",
    id: "req-log",
    params: { id: "1" },
  });

  expect(responses[0]).toMatchObject({
    service: "user.UserService",
    method: "getUser",
    id: "req-log",
    ok: true,
  });
});
