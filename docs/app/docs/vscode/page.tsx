import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

const MARKETPLACE_URL =
  "https://marketplace.visualstudio.com/items?itemName=srpc.srpc-vscode";

export const metadata = {
  title: "VS Code extension",
};

export default function VscodePage() {
  return (
    <DocsPage
      title="VS Code extension"
      description="Language support for .ctr and .rpc contract files — syntax, diagnostics, cross-file types, and formatting via a built-in language server."
    >
      <DocsSection title="Install">
        <DocsList
          items={[
            "Marketplace — search SRPC or install srpc.srpc-vscode",
            "From source — build a .vsix in srpc-vscode/ and use Install from VSIX",
            "Development — open the repo and press F5 for an Extension Development Host",
          ]}
        />
        <p>
          <a
            href={MARKETPLACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-bright hover:underline"
          >
            Open in VS Code Marketplace →
          </a>
        </p>
      </DocsSection>

      <DocsSection title="Build from source">
        <CodeBlock title="terminal">
          {`cd srpc-vscode
bun install
bun run compile
bunx @vscode/vsce package --allow-missing-repository`}
        </CodeBlock>
        <p>
          In VS Code: <strong>Extensions → … → Install from VSIX</strong> and select
          the generated file.
        </p>
      </DocsSection>

      <DocsSection title="Development">
        <CodeBlock title="terminal">
          {`cd srpc-vscode
bun install
bun run watch    # rebuild client + server on change
bun test tests/  # parser, workspace, completion tests`}
        </CodeBlock>
        <p>
          Open the repository root in VS Code and press <strong>F5</strong> to launch
          a window with the extension loaded. Edit files in{" "}
          <code>example/contract/</code> to exercise cross-file resolution.
        </p>
      </DocsSection>

      <DocsSection title="Features">
        <DocsList
          items={[
            "Syntax highlighting and document formatting for .ctr and .rpc",
            "Autocomplete for keywords, primitives, and workspace types",
            "Hover documentation for symbols",
            "Real-time diagnostics — syntax, unknown types, duplicate names",
            "Go to definition and rename across all contract files",
            "Cross-file type resolution without import statements",
            "Auto package — unique package line in new empty files",
            "Optional file icons for contract files",
          ]}
        />
      </DocsSection>

      <DocsSection title="Settings">
        <DocsList
          items={[
            "srpc.autoPackage (default true) — insert a unique package declaration in new files",
            "srpc.enableFileIcons (default true) — SRPC icons for .ctr / .rpc",
          ]}
        />
        <p>
          For file icons: <strong>File → Preferences → File Icon Theme → SRPC File Icons</strong>.
        </p>
      </DocsSection>

      <DocsSection title="Global naming rules">
        <p>
          Package, struct, enum, and service names share one namespace across the
          entire contract folder. The extension flags duplicates before you run
          codegen or push to the server.
        </p>
        <CodeBlock title="contract/">
          {`user.ctr       # package user — User, UserService
products.ctr   # package products — Product

# user.ctr can reference products.Product without imports`}
        </CodeBlock>
        <p>
          Naming rules are documented in depth on{" "}
          <Link href="/docs/contracts" className="text-accent-bright hover:underline">
            Writing contracts
          </Link>
          .
        </p>
      </DocsSection>

      <DocsSection title="How it fits the stack">
        <DocsList
          items={[
            "srpc-vscode — edit and validate contracts in the editor",
            "srpc-cli / srpc-core — generate TypeScript from contracts",
            "srpc-core server — serve RPC, docs, and contract API",
            "srpc-client — call services from other apps",
          ]}
        />
        <p>
          Start with the{" "}
          <Link href="/docs/setup" className="text-accent-bright hover:underline">
            Full setup guide
          </Link>{" "}
          for a complete local workflow.
        </p>
      </DocsSection>
    </DocsPage>
  );
}
