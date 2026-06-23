import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { pathToFileURL } from "url";
import { findWorkspaceFolderForUri } from "../server/src/uri";
import { scanWorkspaceFolder } from "../server/src/workspace";
import { WorkspaceManager } from "../server/src/workspace-manager";

function fileUri(...segments: string[]): string {
  return pathToFileURL(join(...segments)).href;
}

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "srpc-ws-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

test("findWorkspaceFolderForUri picks the deepest matching folder", () => {
  const folders = [
    { uri: fileUri("/workspace"), name: "workspace" },
    { uri: fileUri("/workspace/example"), name: "example" },
  ];

  const uri = fileUri("/workspace/example/contract/user.ctr");
  expect(findWorkspaceFolderForUri(uri, folders)).toBe(
    fileUri("/workspace/example")
  );
});

test("scanWorkspaceFolder only indexes contract directories when present", async () => {
  const root = join(tempDir, "project");
  const contractDir = join(root, "contract");
  const srcDir = join(root, "src");

  mkdirSync(contractDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });

  writeFileSync(join(contractDir, "user.ctr"), "struct User {}");
  writeFileSync(join(srcDir, "ignored.ctr"), "struct Ignored {}");

  const uris = await scanWorkspaceFolder(fileUri(root));
  const paths = uris.map(uri => uri.split("/").pop());

  expect(paths).toContain("user.ctr");
  expect(paths).not.toContain("ignored.ctr");
});

test("duplicate type names in separate workspace folders do not conflict", () => {
  const projectA = join(tempDir, "project-a", "contract");
  const projectB = join(tempDir, "project-b", "contract");

  mkdirSync(projectA, { recursive: true });
  mkdirSync(projectB, { recursive: true });

  const uriA = join(projectA, "user.ctr");
  const uriB = join(projectB, "user.ctr");

  writeFileSync(uriA, "package a\n\nstruct User { id: string }");
  writeFileSync(uriB, "package b\n\nstruct User { id: string }");

  const manager = new WorkspaceManager();
  manager.setFolders([
    { uri: fileUri(tempDir, "project-a"), name: "project-a" },
    { uri: fileUri(tempDir, "project-b"), name: "project-b" },
  ]);

  const indexA = manager.getIndexForUri(fileUri(uriA));
  const indexB = manager.getIndexForUri(fileUri(uriB));

  indexA.loadFile(fileUri(uriA), "package a\n\nstruct User { id: string }");
  indexB.loadFile(fileUri(uriB), "package b\n\nstruct User { id: string }");
  indexA.finishLoading();
  indexB.finishLoading();

  const diagnosticsA = indexA.getPackageValidationDiagnostics();
  const diagnosticsB = indexB.getPackageValidationDiagnostics();

  const messagesA = [...diagnosticsA.values()].flat().map(d => d.message);
  const messagesB = [...diagnosticsB.values()].flat().map(d => d.message);

  expect(messagesA.some(m => m.includes("Duplicate"))).toBe(false);
  expect(messagesB.some(m => m.includes("Duplicate"))).toBe(false);
});

test("types do not resolve across separate workspace folders", () => {
  const projectA = join(tempDir, "project-a", "contract");
  const projectB = join(tempDir, "project-b", "contract");

  mkdirSync(projectA, { recursive: true });
  mkdirSync(projectB, { recursive: true });

  const userUri = fileUri(projectA, "user.ctr");
  const bondUri = fileUri(projectB, "bond.ctr");

  const manager = new WorkspaceManager();
  manager.setFolders([
    { uri: fileUri(tempDir, "project-a"), name: "project-a" },
    { uri: fileUri(tempDir, "project-b"), name: "project-b" },
  ]);

  const indexA = manager.getIndexForUri(userUri);
  const indexB = manager.getIndexForUri(bondUri);

  indexA.loadFile(
    userUri,
    `struct User {
    id: string
}`
  );

  const bondSource = `struct Bond {
    owner: User
}`;
  indexB.loadFile(bondUri, bondSource);
  indexA.finishLoading();
  indexB.finishLoading();

  const userIndex = bondSource.lastIndexOf("User");
  const before = bondSource.slice(0, userIndex);
  const line = before.split("\n").length - 1;
  const character = before.split("\n").pop()?.length ?? 0;

  const location = indexB.findDefinition(bondUri, { line, character });

  expect(location).toBeNull();
});

test("duplicate type names in separate contract folders of one workspace do not conflict", () => {
  const monorepo = join(tempDir, "monorepo");
  const contractA = join(monorepo, "example", "contract");
  const contractB = join(monorepo, "demo", "contract");

  mkdirSync(contractA, { recursive: true });
  mkdirSync(contractB, { recursive: true });

  const uriA = join(contractA, "user.ctr");
  const uriB = join(contractB, "user.ctr");

  writeFileSync(uriA, "package example.user\n\nstruct User { id: string }");
  writeFileSync(uriB, "package demo.user\n\nstruct User { id: string }");

  const manager = new WorkspaceManager();
  manager.setFolders([{ uri: fileUri(monorepo), name: "monorepo" }]);

  const indexA = manager.getIndexForUri(fileUri(uriA));
  const indexB = manager.getIndexForUri(fileUri(uriB));

  expect(indexA).not.toBe(indexB);

  indexA.loadFile(
    fileUri(uriA),
    "package example.user\n\nstruct User { id: string }"
  );
  indexB.loadFile(
    fileUri(uriB),
    "package demo.user\n\nstruct User { id: string }"
  );
  indexA.finishLoading();
  indexB.finishLoading();

  const messagesA = [
    ...indexA.getPackageValidationDiagnostics().values(),
  ]
    .flat()
    .map(d => d.message);
  const messagesB = [
    ...indexB.getPackageValidationDiagnostics().values(),
  ]
    .flat()
    .map(d => d.message);

  expect(messagesA.some(m => m.includes("Duplicate"))).toBe(false);
  expect(messagesB.some(m => m.includes("Duplicate"))).toBe(false);
});
