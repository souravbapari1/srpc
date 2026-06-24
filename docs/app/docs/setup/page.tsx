import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { FlowSteps } from "@/components/flow-steps";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Full setup guide",
};

export default function SetupPage() {
  return (
    <DocsPage
      title="Full setup guide"
      description="Everything you need to run SRPC locally: packages, the example server, contract docs, the CLI, and the VS Code extension."
    >
      <DocsSection title="Prerequisites">
        <DocsList
          items={[
            "Bun 1.1+ (recommended) or Node.js 20+",
            "TypeScript 5+ for handler implementations",
            "VS Code 1.85+ (optional, for contract editing)",
          ]}
        />
      </DocsSection>

      <DocsSection title="Repository packages">
        <p>
          SRPC is a monorepo. Each package has a focused role in the contract-first
          workflow:
        </p>
        <CodeBlock title="packages">
          {`srpc-core/     Parser integration, codegen, Express RPC router, docs & contract API
srpc-cli/      srpc command — generate types and sync packages over HTTP
srpc-client/   Typed HTTP client (createServiceClient)
srpc-vscode/   VS Code extension + language server for .ctr / .rpc
example/       E-commerce demo — contracts, handlers, server
docs/          This documentation site`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Quick start (example app)">
        <p>
          The fastest way to see SRPC end-to-end is the included example server:
        </p>
        <CodeBlock title="terminal">
          {`cd example
bun install
cp .env.example .env    # optional — SRPC_URL and SRPC_CONTRACT_DIR
bun run dev`}
        </CodeBlock>
        <p>When the server starts you get:</p>
        <DocsList
          items={[
            "RPC endpoint — http://localhost:3100/srpc",
            "Contract docs — http://localhost:3100/docs (HTML + JSON via ?format=json)",
            "Contract API — http://localhost:3100/api/contracts (read/write packages)",
            "Visualizer — http://localhost:3100/docs/visualizer",
          ]}
        />
      </DocsSection>

      <DocsSection title="New project from scratch">
        <FlowSteps
          steps={[
            {
              title: "Create layout",
              description:
                "Add contract/, generated/, services/, and index.ts. One .ctr file per package is the usual pattern.",
            },
            {
              title: "Install dependencies",
              description:
                "Add srpc-core, srpc-cli, express, and optionally srpc-client for typed callers.",
            },
            {
              title: "Write contracts",
              description:
                "Define structs, enums, and services in contract/*.ctr. Install the VS Code extension for live diagnostics.",
            },
            {
              title: "Generate types",
              description:
                "Run srpc generate (or srpc-core generate) to emit generated/srpc-types.ts.",
            },
            {
              title: "Implement handlers",
              description:
                "Map each service with defineService() in services/*.ts and export an array from services/index.ts.",
            },
            {
              title: "Mount the router",
              description:
                "Use createSrpcRouter({ services, logger: true, docs: { contractDir: './contract' } }).",
            },
          ]}
        />
        <p className="mt-4">Minimal package.json scripts:</p>
        <CodeBlock title="package.json">
          {`{
  "scripts": {
    "dev": "bun run generate && bun run --watch index.ts",
    "generate": "srpc generate --contract-dir ./contract --out ./generated/srpc-types.ts",
    "start": "bun run index.ts"
  },
  "dependencies": {
    "express": "^5.2.1",
    "srpc-cli": "file:../srpc-cli",
    "srpc-core": "file:../srpc-core"
  }
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Server with docs and contract API">
        <p>
          Enable contract docs and the HTTP contract API by passing{" "}
          <code>docs</code> to <code>createSrpcRouter()</code>:
        </p>
        <CodeBlock title="index.ts" language="typescript">
          {`app.use(
  createSrpcRouter({
    services,
    logger: true,
    docs: {
      contractDir: "./contract",
      // Optional: protect writes to /api/contracts
      // contractsApi: { apiKey: process.env.SRPC_API_KEY },
    },
  })
);`}
        </CodeBlock>
        <p>
          See{" "}
          <Link href="/docs/system" className="text-accent-bright hover:underline">
            System docs & APIs
          </Link>{" "}
          for all routes and use cases, and{" "}
          <Link href="/docs/server" className="text-accent-bright hover:underline">
            Building the server
          </Link>{" "}
          for CORS, logging, and router options.
        </p>
      </DocsSection>

      <DocsSection title="Contract CLI">
        <p>
          <code>srpc-cli</code> generates types and syncs contract packages with a
          running server. Copy <code>example/.env.example</code> and set{" "}
          <code>SRPC_URL</code> and <code>SRPC_CONTRACT_DIR</code>.
        </p>
        <CodeBlock title="terminal">
          {`bun run contracts:list
bun run contracts:pull          # download all packages to ./contract
bun run contracts:push          # upload local packages to the server
bun run contracts:validate -- user`}
        </CodeBlock>
        <p>
          Full command reference on the{" "}
          <Link href="/docs/cli" className="text-accent-bright hover:underline">
            Contract CLI
          </Link>{" "}
          page.
        </p>
      </DocsSection>

      <DocsSection title="VS Code extension">
        <p>
          Install from the marketplace (<code>srpc.srpc-vscode</code>) or build from
          source in <code>srpc-vscode/</code>. The language server provides
          autocomplete, cross-file type resolution, and duplicate-name detection
          while you edit contracts.
        </p>
        <CodeBlock title="terminal">
          {`cd srpc-vscode
bun install
bun run compile
bunx @vscode/vsce package --allow-missing-repository
# Extensions → Install from VSIX`}
        </CodeBlock>
        <p>
          Details on settings and development workflow:{" "}
          <Link href="/docs/vscode" className="text-accent-bright hover:underline">
            VS Code extension
          </Link>
          .
        </p>
      </DocsSection>

      <DocsSection title="Recommended dev workflow">
        <DocsList
          items={[
            "Edit contract/*.ctr with the VS Code extension open",
            "Run bun run generate after contract changes",
            "Implement or update handlers in services/",
            "bun run dev — regenerates types and watches the server",
            "Browse /docs on the running server to verify services and types",
            "Use srpc package push/pull to sync contracts across machines or repos",
          ]}
        />
      </DocsSection>

      <DocsSection title="Environment variables">
        <CodeBlock title=".env">
          {`# Server
PORT=3100
SRPC_API_KEY=your-secret          # optional — required for contract API writes

# CLI (example app)
SRPC_URL=http://localhost:3100
SRPC_CONTRACT_DIR=./contract`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Next steps">
        <DocsList
          items={[
            "Contract syntax → Writing contracts",
            "Type system → Types reference",
            "HTTP decorators → Defining services",
            "Handler patterns → Implementing handlers",
          ]}
        />
      </DocsSection>
    </DocsPage>
  );
}
