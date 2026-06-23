import { test, expect } from "bun:test";
import { join } from "path";
import { pathToFileURL } from "url";
import { URI } from "vscode-uri";
import { normalizeUri, canonicalPathForUri } from "../server/src/uri";
import { getWorkspaceDiagnostics } from "../server/src/packages";
import { WorkspaceIndex } from "../server/src/workspace";

test("normalizes file://localhost URIs to file:/// URIs", () => {
  const filePath = "/tmp/example/contract/user.ctr";
  const scanned = normalizeUri(URI.file(filePath).toString(true));
  const opened = normalizeUri(URI.parse(`file://localhost${filePath}`).toString(true));

  expect(scanned).toBe(`file:///tmp/example/contract/user.ctr`);
  expect(opened).toBe(scanned);
});

test("does not report duplicates when the same file is indexed under alias URIs", () => {
  const index = new WorkspaceIndex();
  const filePath = join(import.meta.dir, "alias-user.ctr");
  const scannedUri = normalizeUri(URI.file(filePath).toString(true));
  const openedUri = normalizeUri(URI.parse(`file://localhost${filePath}`).toString(true));

  expect(canonicalPathForUri(scannedUri)).toBe(canonicalPathForUri(openedUri));

  const source = `package user

struct UserRequest {
    id: string
}

service UserService {
    @get getUser(
        data: UserRequest
    ) => UserRequest
}`;

  index.loadFile(scannedUri, source);
  index.loadFile(openedUri, source);
  index.finishLoading();

  const diagnostics = getWorkspaceDiagnostics(index);
  const messages = [...diagnostics.values()].flat().map(d => d.message);

  expect(messages.some(message => message.includes("Duplicate"))).toBe(false);
  expect(index.getAllFiles()).toHaveLength(1);
});

test("still reports duplicates across different files", () => {
  const index = new WorkspaceIndex();
  const a = pathToFileURL(join(import.meta.dir, "fixtures/a.ctr")).href;
  const b = pathToFileURL(join(import.meta.dir, "fixtures/b.ctr")).href;

  index.loadFile(a, "package a\n\nstruct Product { id: string }");
  index.loadFile(b, "package b\n\nstruct Product { name: string }");
  index.finishLoading();

  const diagnostics = getWorkspaceDiagnostics(index);
  expect(diagnostics.get(normalizeUri(a))?.some(d => d.message.includes("Duplicate struct 'Product'"))).toBe(true);
});
