import { test, expect } from "bun:test";
import {
  createServiceClient,
  SrpcError,
  type SrpcServiceMeta,
} from "../src/index.ts";

interface User {
  id: string;
  name: string;
}

interface UserService {
  getUser(data: { id: string }): User;
  createUser(data: { id: string }): User;
}

const userMeta: SrpcServiceMeta<UserService> = {
  package: "user",
  service: "UserService",
  methods: {
    getUser: { httpMethod: "GET" as const },
    createUser: { httpMethod: "POST" as const },
  },
};

test("createServiceClient exposes typed methods", () => {
  const user = createServiceClient(userMeta, { baseUrl: "http://localhost:3100" });

  expect(typeof user.getUser).toBe("function");
});

test("SrpcError carries code and message", () => {
  const error = new SrpcError(-32603, "failed", { detail: true });

  expect(error.name).toBe("SrpcError");
  expect(error.code).toBe(-32603);
  expect(error.data).toEqual({ detail: true });
});
