import * as path from "path";
import { workspace, ExtensionContext, window } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    path.join("server", "out", "server.js")
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "srpc" },
      { scheme: "file", pattern: "**/*.ctr" },
      { scheme: "file", pattern: "**/*.rpc" },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.{ctr,rpc}"),
    },
  };

  client = new LanguageClient(
    "srpcLanguageServer",
    "SRPC Language Server",
    serverOptions,
    clientOptions
  );

  void client.start().catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    void window.showErrorMessage(`SRPC language server failed to start: ${message}`);
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }

  return client.stop();
}
