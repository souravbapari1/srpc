import { test, expect } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import { pathToFileURL } from "url";
import { join } from "path";
import {
  buildCompletions,
  getCompletionContext,
} from "../server/src/completion";
import { WorkspaceIndex } from "../server/src/workspace";

function doc(uri: string, content: string) {
  return TextDocument.create(uri, "srpc", 1, content);
}

const pageUri = pathToFileURL(join(import.meta.dir, "../../contract/page.ctr")).href;
const usersUri = pathToFileURL(join(import.meta.dir, "../../contract/users.ctr")).href;

test("suggests struct when typing str at top level", () => {
  const index = new WorkspaceIndex();
  const document = doc(pageUri, "");
  const items = buildCompletions(document, { line: 0, character: 3 }, index);

  expect(items.some(i => i.label === "struct")).toBe(true);
});

test("suggests primitives and workspace structs after colon", () => {
  const index = new WorkspaceIndex();
  index.loadFile(usersUri, `struct User { id: string }`);
  index.finishLoading();

  const source = "struct Article {\n    author: \n}";
  const document = doc(pageUri, source);
  const items = buildCompletions(document, { line: 1, character: 12 }, index);

  expect(items.some(i => i.label === "string")).toBe(true);
  expect(items.some(i => i.label === "User")).toBe(true);
  expect(items.some(i => i.label === "datetime")).toBe(true);
});

test("filters types by prefix", () => {
  const index = new WorkspaceIndex();
  const source = "struct Page {\n    createdAt: date\n}";
  const document = doc(pageUri, source);
  const items = buildCompletions(document, { line: 1, character: 18 }, index);
  const labels = items.map(i => i.label);

  expect(labels).toContain("datetime");
  expect(labels).not.toContain("string");
});

test("detects type context inside struct", () => {
  const document = doc(pageUri, "struct Page {\n    title: \n}");
  const context = getCompletionContext(
    document,
    { line: 1, character: 11 },
    { declarations: [] }
  );

  expect(context).toBe("type");
});

test("flags unknown type errors", () => {
  const index = new WorkspaceIndex();
  index.loadFile(
    pageUri,
    `struct Page {
    author: UnknownType
}`
  );
  index.finishLoading();

  const diagnostics = index.validateFile(pageUri);
  expect(diagnostics.some(d => d.message.includes("Unknown type 'UnknownType'"))).toBe(true);
});
