import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  DidChangeWorkspaceFoldersNotification,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  Diagnostic,
  DiagnosticSeverity,
  Hover,
  MarkupKind,
  DefinitionParams,
  Location,
  DocumentFormattingParams,
  TextEdit,
  FileChangeType,
  RenameParams,
  PrepareRenameParams,
  WorkspaceEdit,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  KEYWORD_DOCS,
  type Position,
} from "./ast";
import { formatDocument } from "./parser";
import { buildCompletions } from "./completion";
import {
  buildPackageHeader,
  isContractUri,
  shouldAutoInsertPackage,
} from "./packages";
import { getHoverForSymbol } from "./workspace";
import { normalizeUri } from "./uri";
import { WorkspaceManager } from "./workspace-manager";

let autoPackageEnabled = true;

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const workspaceManager = new WorkspaceManager();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let workspaceFolders: { uri: string; name: string }[] = [];

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!capabilities.workspace?.configuration;
  hasWorkspaceFolderCapability = !!capabilities.workspace?.workspaceFolders;
  workspaceFolders = params.workspaceFolders ?? [];
  workspaceManager.setFolders(workspaceFolders);

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [":", "<", ".", '"', " "],
      },
      hoverProvider: true,
      definitionProvider: true,
      renameProvider: {
        prepareProvider: true,
      },
      documentFormattingProvider: true,
      workspace: hasWorkspaceFolderCapability
        ? {
            workspaceFolders: {
              supported: true,
              changeNotifications: true,
            },
          }
        : undefined,
    },
  } satisfies InitializeResult;
});

connection.onInitialized(async () => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }

  if (hasWorkspaceFolderCapability) {
    connection.client.register(
      DidChangeWorkspaceFoldersNotification.type,
      undefined
    );

    connection.workspace.onDidChangeWorkspaceFolders(async event => {
      const removed = new Set(
        event.removed.map(folder => normalizeUri(folder.uri))
      );

      workspaceFolders = workspaceFolders
        .filter(folder => !removed.has(normalizeUri(folder.uri)))
        .concat(
          event.added.map(folder => ({
            uri: folder.uri,
            name: folder.name,
          }))
        );

      workspaceManager.setFolders(workspaceFolders);
      await indexWorkspace();
    });
  }

  await refreshSettings();
  await indexWorkspace();
});

connection.onDidChangeConfiguration(async () => {
  await refreshSettings();
});

async function refreshSettings(): Promise<void> {
  try {
    const config = await connection.workspace.getConfiguration({
      section: "srpc",
    });
    autoPackageEnabled = config?.autoPackage !== false;
  } catch {
    autoPackageEnabled = true;
  }
}

async function indexWorkspace(): Promise<void> {
  await workspaceManager.indexAll(documents);
  publishDiagnostics();
}

function publishDiagnostics(): void {
  for (const [uri, rawDiagnostics] of workspaceManager.buildDiagnostics()) {
    const diagnostics = rawDiagnostics.map(d => ({
      severity:
        d.severity === "error"
          ? DiagnosticSeverity.Error
          : DiagnosticSeverity.Warning,
      range: d.range,
      message: d.message,
      source: "srpc",
    })) satisfies Diagnostic[];

    connection.sendDiagnostics({ uri, diagnostics });
  }
}

function syncDocument(document: TextDocument): void {
  workspaceManager.syncDocument(document);
  publishDiagnostics();
}

function ensureDocument(document: TextDocument): void {
  if (!workspaceManager.hasFile(document.uri)) {
    syncDocument(document);
  }
}

function indexForUri(uri: string) {
  return workspaceManager.getIndexForUri(uri);
}

function getOpenDocument(uri: string): TextDocument | undefined {
  const normalized = normalizeUri(uri);
  return documents.get(normalized) ?? documents.get(uri);
}

documents.onDidOpen(change => {
  syncDocument(change.document);
  void maybeAutoInsertPackage(change.document);
});

async function maybeAutoInsertPackage(document: TextDocument): Promise<void> {
  if (!autoPackageEnabled) {
    return;
  }

  if (!isContractUri(document.uri)) {
    return;
  }

  if (!shouldAutoInsertPackage(document.getText())) {
    return;
  }

  const packageName = indexForUri(document.uri).suggestPackageName(
    document.uri
  );

  await connection.workspace.applyEdit({
    edit: {
      changes: {
        [document.uri]: [
          TextEdit.insert(
            { line: 0, character: 0 },
            buildPackageHeader(packageName)
          ),
        ],
      },
    },
  });
}

documents.onDidChangeContent(change => {
  syncDocument(change.document);
});

documents.onDidClose(change => {
  workspaceManager.reloadFromDisk(change.document.uri, documents);
  publishDiagnostics();
});

connection.onDidChangeWatchedFiles(event => {
  for (const change of event.changes) {
    const uri = normalizeUri(change.uri);

    if (change.type === FileChangeType.Deleted) {
      workspaceManager.removeFile(uri);
      connection.sendDiagnostics({ uri, diagnostics: [] });
      continue;
    }

    workspaceManager.reloadFromDisk(uri, documents);
  }

  publishDiagnostics();
});

connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const document = getOpenDocument(params.textDocument.uri);
  if (!document) {
    return [];
  }

  ensureDocument(document);

  return buildCompletions(
    document,
    params.position as Position,
    indexForUri(document.uri)
  );
});

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const uri = normalizeUri(params.textDocument.uri);
  const hover = getHoverForSymbol(
    indexForUri(uri),
    uri,
    params.position as Position
  );

  if (!hover) {
    const document = getOpenDocument(uri);
    const word = document ? getWordAtPosition(document, params.position) : null;

    if (word && KEYWORD_DOCS[word]) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: KEYWORD_DOCS[word],
        },
      };
    }

    return null;
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: hover,
    },
  };
});

connection.onDefinition((params: DefinitionParams): Location | null => {
  const uri = normalizeUri(params.textDocument.uri);
  const document = getOpenDocument(uri);

  if (document) {
    ensureDocument(document);
  }

  const location = indexForUri(uri).findDefinition(
    uri,
    params.position as Position
  );

  if (!location) {
    return null;
  }

  return {
    uri: location.uri,
    range: location.range,
  };
});

connection.onPrepareRename((params: PrepareRenameParams) => {
  const uri = normalizeUri(params.textDocument.uri);
  const location = indexForUri(uri).findDefinition(
    uri,
    params.position as Position
  );

  if (!location) {
    return null;
  }

  return location.range;
});

connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
  const uri = normalizeUri(params.textDocument.uri);
  const references = indexForUri(uri).findReferences(
    uri,
    params.position as Position
  );

  if (references.length === 0) {
    return null;
  }

  const changes: Record<string, TextEdit[]> = {};

  for (const ref of references) {
    changes[ref.uri] ??= [];
    changes[ref.uri].push(TextEdit.replace(ref.range, params.newName));
  }

  return { changes };
});

connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] => {
  const document = getOpenDocument(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const formatted = formatDocument(document.getText());
  const fullRange = {
    start: document.positionAt(0),
    end: document.positionAt(document.getText().length),
  };

  return [TextEdit.replace(fullRange, formatted)];
});

function getWordAtPosition(
  document: TextDocument,
  position: { line: number; character: number }
): string | null {
  const line = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line, character: Number.MAX_SAFE_INTEGER },
  });

  const before = line.slice(0, position.character);
  const after = line.slice(position.character);
  const startMatch = before.match(/[A-Za-z_][A-Za-z0-9_.]*$/);
  const endMatch = after.match(/^[A-Za-z0-9_.]*/);

  const word = `${startMatch?.[0] ?? ""}${endMatch?.[0] ?? ""}`;
  return word || null;
}

documents.listen(connection);
connection.listen();
