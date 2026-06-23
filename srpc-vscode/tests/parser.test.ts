import { test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { parseDocument, formatDocument, findDefinition } from "../server/src/parser";

const catalogContract = readFileSync(
  join(import.meta.dir, "../../example/contract/catalog.ctr"),
  "utf8"
);

test("parses catalog.ctr without errors", () => {
  const { document, diagnostics } = parseDocument(catalogContract, {
    resolveType: () => true,
  });
  const errors = diagnostics.filter(d => d.severity === "error");

  expect(errors).toEqual([]);
  expect(document.declarations.length).toBeGreaterThan(0);
  expect(document.declarations.some(d => d.kind === "struct" && d.name === "Product")).toBe(true);
});

test("rejects import statements", () => {
  const { diagnostics } = parseDocument(`import "./other.ctr"

struct User {
    id: string
}`);

  expect(
    diagnostics.some(d =>
      d.message.includes("Import statements are not needed")
    )
  ).toBe(true);
});

test("reports missing colon", () => {
  const { diagnostics } = parseDocument(`struct User {
    id string
}`);

  expect(diagnostics.some(d => d.message.includes("':'"))).toBe(true);
});

test("go to definition resolves User reference", () => {
  const source = `struct User {
    id: string
}

service UserService {
    getUser(
        userId: string
    ) => User
}
`;

  const { document } = parseDocument(source, { resolveType: () => true });
  const userIndex = source.lastIndexOf("User");
  const before = source.slice(0, userIndex);
  const line = before.split("\n").length - 1;
  const character = before.split("\n").pop()?.length ?? 0;

  const range = findDefinition(document, { line, character });
  expect(range).not.toBeNull();
});

test("formats document", () => {
  const input = `struct User{
id:string
}`;
  const output = formatDocument(input);

  expect(output).toContain("struct User {");
  expect(output).toContain("id: string");
});
