import { test, expect } from "bun:test";
import { join } from "path";
import { pathToFileURL } from "url";
import {
  packageNameFromFilePath,
  suggestUniquePackageName,
  getPackageDiagnostics,
  getWorkspaceDiagnostics,
  buildPackageHeader,
} from "../server/src/packages";
import { WorkspaceIndex } from "../server/src/workspace";

test("derives package name from file name", () => {
  expect(packageNameFromFilePath("/contract/products.ctr")).toBe("products");
  expect(packageNameFromFilePath("/contract/User-Service.ctr")).toBe("user_service");
});

test("suggests unique package name when base is taken", () => {
  const index = new WorkspaceIndex();
  const usersUri = pathToFileURL(join(import.meta.dir, "../contract/users.ctr")).href;
  const productsUri = pathToFileURL(join(import.meta.dir, "../contract/products.ctr")).href;

  index.loadFile(
    usersUri,
  `package products

struct User {
    id: string
}`
  );
  index.finishLoading();

  const suggested = suggestUniquePackageName(index, productsUri);
  expect(suggested).not.toBe("products");
  expect(suggested.startsWith("products")).toBe(true);
});

test("reports duplicate package names", () => {
  const index = new WorkspaceIndex();
  const a = pathToFileURL(join(import.meta.dir, "fixtures/a.ctr")).href;
  const b = pathToFileURL(join(import.meta.dir, "fixtures/b.ctr")).href;

  index.loadFile(a, "package shared\n\nstruct A { id: string }");
  index.loadFile(b, "package shared\n\nstruct B { id: string }");
  index.finishLoading();

  const diagnostics = getPackageDiagnostics(index);
  expect(diagnostics.get(a)?.some(d => d.message.includes("Duplicate package 'shared'"))).toBe(true);
  expect(diagnostics.get(b)?.some(d => d.message.includes("Duplicate package 'shared'"))).toBe(true);
});

test("reports duplicate struct names across files", () => {
  const index = new WorkspaceIndex();
  const a = pathToFileURL(join(import.meta.dir, "fixtures/a.ctr")).href;
  const b = pathToFileURL(join(import.meta.dir, "fixtures/b.ctr")).href;

  index.loadFile(a, "package a\n\nstruct Product { id: string }");
  index.loadFile(b, "package b\n\nstruct Product { name: string }");
  index.finishLoading();

  const diagnostics = getWorkspaceDiagnostics(index);
  expect(diagnostics.get(a)?.some(d => d.message.includes("Duplicate struct 'Product'"))).toBe(true);
  expect(diagnostics.get(b)?.some(d => d.message.includes("Duplicate struct 'Product'"))).toBe(true);
});

test("reports duplicate service names across files", () => {
  const index = new WorkspaceIndex();
  const a = pathToFileURL(join(import.meta.dir, "fixtures/a.ctr")).href;
  const b = pathToFileURL(join(import.meta.dir, "fixtures/b.ctr")).href;

  index.loadFile(
    a,
    "package a\n\nservice Api {\n    ping() => string\n}"
  );
  index.loadFile(
    b,
    "package b\n\nservice Api {\n    pong() => string\n}"
  );
  index.finishLoading();

  const diagnostics = getWorkspaceDiagnostics(index);
  expect(diagnostics.get(a)?.some(d => d.message.includes("Duplicate service 'Api'"))).toBe(true);
  expect(diagnostics.get(b)?.some(d => d.message.includes("Duplicate service 'Api'"))).toBe(true);
});

test("builds package header", () => {
  expect(buildPackageHeader("products")).toBe("package products\n\n");
});
