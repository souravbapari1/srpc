import { test, expect } from "bun:test";
import { join } from "path";
import { generateFromContracts } from "../src/codegen.ts";
import { typeNodeToTs } from "../src/ts-type.ts";
import { scanContractFiles } from "../src/scan.ts";

const contractDir = join(import.meta.dir, "../../example/contract");

test("scans contract files", () => {
  const files = scanContractFiles(contractDir);
  expect(files.length).toBeGreaterThanOrEqual(10);
  expect(files.some(file => file.relativePath.endsWith("user.ctr"))).toBe(true);
  expect(files.some(file => file.relativePath.endsWith("catalog.ctr"))).toBe(true);
});

test("maps contract types to typescript", () => {
  expect(typeNodeToTs({ kind: "primitive", name: "int", span: span() })).toBe("number");
  expect(
    typeNodeToTs({
      kind: "reference",
      name: "catalog.Product",
      span: span(),
    })
  ).toBe("Product");
});

test("generates interfaces and services from workspace contracts", () => {
  const outputFile = join(import.meta.dir, "../.tmp/srpc-types.ts");

  const result = generateFromContracts({
    contractDir,
    outputFile,
  });

  expect(result.errors).toEqual([]);
  expect(result.filesRead).toContain("user.ctr");
  expect(result.filesRead).toContain("catalog.ctr");

  const source = Bun.file(outputFile);
  return source.text().then(text => {
    expect(text).toContain("export interface User {");
    expect(text).toContain("export interface Product {");
    expect(text).toContain("export interface UserService {");
    expect(text).toContain("getUser(data: UserRequest): User;");
    expect(text).toContain('getUser: { httpMethod: "GET" }');
    expect(text).toContain('createUser: { httpMethod: "POST" }');
    expect(text).toContain('updateUser: { httpMethod: "PUT" }');
    expect(text).toContain('deleteUser: { httpMethod: "DELETE" }');
    expect(text).toContain("favoriteProductIds: string[];");
    expect(text).toContain("export type SrpcServiceInterfaces");
    expect(text).toContain('package: "user"');
    expect(text).toContain(
      'export const UserService = __srpcServices.UserService as SrpcServiceMeta<UserService, "UserService">'
    );
  });
});

function span() {
  return {
    range: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    },
  };
}
