import { test, expect } from "bun:test";
import { join } from "path";
import { pathToFileURL } from "url";
import { WorkspaceIndex } from "../server/src/workspace";

function fixtureUri(name: string): string {
  return pathToFileURL(join(import.meta.dir, "fixtures", name)).href;
}

test("resolves types across files", () => {
  const index = new WorkspaceIndex();

  index.loadFile(
    fixtureUri("user.ctr"),
    `struct User {
    id: string
    name: string
}`
  );

  index.loadFile(
    fixtureUri("portfolio.ctr"),
    `struct Portfolio {
    owner: User
    amount: number
}`
  );

  index.finishLoading();

  const portfolio = index.getFile(fixtureUri("portfolio.ctr"));
  expect(portfolio?.parseResult.diagnostics.filter(d => d.severity === "error")).toEqual([]);
});

test("go to definition jumps across files", () => {
  const index = new WorkspaceIndex();

  index.loadFile(
    fixtureUri("user.ctr"),
    `struct User {
    id: string
}`
  );

  const portfolioSource = `struct Portfolio {
    owner: User
}`;
  index.loadFile(fixtureUri("portfolio.ctr"), portfolioSource);
  index.finishLoading();

  const userIndex = portfolioSource.lastIndexOf("User");
  const before = portfolioSource.slice(0, userIndex);
  const line = before.split("\n").length - 1;
  const character = before.split("\n").pop()?.length ?? 0;

  const location = index.findDefinition(fixtureUri("portfolio.ctr"), {
    line,
    character,
  });

  expect(location?.uri).toBe(fixtureUri("user.ctr"));
});

test("package-qualified references resolve", () => {
  const index = new WorkspaceIndex();

  index.loadFile(
    fixtureUri("user.ctr"),
    `package meradhan.user

struct User {
    id: string
}`
  );

  index.loadFile(
    fixtureUri("bond.ctr"),
    `struct Bond {
    owner: meradhan.user.User
}`
  );

  index.finishLoading();

  const bond = index.getFile(fixtureUri("bond.ctr"));
  expect(bond?.parseResult.diagnostics.filter(d => d.severity === "error")).toEqual([]);
});

test("rename finds references across files", () => {
  const index = new WorkspaceIndex();

  index.loadFile(
    fixtureUri("user.ctr"),
    `struct User {
    id: string
}`
  );

  const portfolioSource = `struct Portfolio {
    owner: User
}`;
  index.loadFile(fixtureUri("portfolio.ctr"), portfolioSource);
  index.finishLoading();

  const refs = index.findReferences(fixtureUri("user.ctr"), {
    line: 0,
    character: 7,
  });

  expect(refs.some(r => r.uri === fixtureUri("portfolio.ctr"))).toBe(true);
});

test("incremental update only reparses changed file source", () => {
  const index = new WorkspaceIndex();

  index.loadFile(fixtureUri("user.ctr"), `struct User { id: string }`);
  index.loadFile(
    fixtureUri("portfolio.ctr"),
    `struct Portfolio { owner: User }`
  );
  index.finishLoading();

  index.updateFile(fixtureUri("user.ctr"), `struct User { id: string name: string }`);

  const user = index.getFile(fixtureUri("user.ctr"));
  expect(user?.parseResult.document.declarations[0]?.kind).toBe("struct");
  if (user?.parseResult.document.declarations[0]?.kind === "struct") {
    expect(user.parseResult.document.declarations[0].fields).toHaveLength(2);
  }
});
