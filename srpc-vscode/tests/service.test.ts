import { test, expect } from "bun:test";
import { parseDocument } from "../server/src/parser";

test("parses service with braces", () => {
  const source = `package products

struct Product {
    id: string
}

service ProductService {
    getProduct(
        id: string
    ) => Product
}
`;

  const { document, diagnostics } = parseDocument(source, {
    resolveType: () => true,
  });
  const errors = diagnostics.filter(d => d.severity === "error");

  expect(errors).toEqual([]);
  expect(document.declarations.some(d => d.kind === "service" && d.name === "ProductService")).toBe(true);
});

test("parses HTTP method decorators on service methods", () => {
  const source = `package user

struct User {
    id: string
}

struct UserRequest {
    id: string
}

service UserService {
    @get getUser(
        data: UserRequest
    ) => User

    @post createUser(
        data: UserRequest
    ) => User

    @put updateUser(
        data: UserRequest
    ) => User

    @delete deleteUser(
        data: UserRequest
    ) => User
}
`;

  const { document, diagnostics } = parseDocument(source, {
    resolveType: () => true,
  });
  const errors = diagnostics.filter(d => d.severity === "error");

  expect(errors).toEqual([]);

  const service = document.declarations.find(
    decl => decl.kind === "service" && decl.name === "UserService"
  );

  expect(service?.kind).toBe("service");

  if (service?.kind !== "service") {
    return;
  }

  expect(service.methods.map(method => [method.name, method.httpMethod])).toEqual([
    ["getUser", "GET"],
    ["createUser", "POST"],
    ["updateUser", "PUT"],
    ["deleteUser", "DELETE"],
  ]);
});

test("reports unknown HTTP method decorator", () => {
  const { diagnostics } = parseDocument(`service Api {
    @fetch listItems() => string
}`);

  expect(
    diagnostics.some(d => d.message.includes("Unknown HTTP method decorator"))
  ).toBe(true);
});

test("reports missing braces on service", () => {
  const { diagnostics } = parseDocument(`service ProductService
    getProduct(id: string) => string
`);

  expect(diagnostics.some(d => d.message.includes("Expected '{' after service name"))).toBe(true);
});
