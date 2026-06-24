import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "System docs & APIs",
};

export default function SystemDocsPage() {
  return (
    <DocsPage
      title="System docs & APIs"
      description="Built-in contract documentation and the internal contract API — how to browse, query, sync, and integrate SRPC contracts outside of /srpc RPC calls."
    >
      <DocsSection title="Overview">
        <p>
          When you enable <code>docs</code> on <code>createSrpcRouter()</code>, the
          server exposes two complementary surfaces on top of your{" "}
          <code>.ctr</code> files:
        </p>
        <DocsList
          items={[
            "Contract docs (/docs) — human-readable HTML for browsing packages, types, and services, plus JSON for agents and tools",
            "Contract API (/api/contracts) — read/write HTTP API for listing, validating, and syncing contract packages",
          ]}
        />
        <p>
          Both are generated from the same contract directory. They do not execute
          RPC handlers — they describe and manage the contract layer only. RPC
          traffic still goes through{" "}
          <Link href="/docs/protocol" className="text-accent-bright hover:underline">
            /srpc
          </Link>
          .
        </p>
      </DocsSection>

      <DocsSection title="Enable on the server">
        <CodeBlock title="index.ts" language="typescript">
          {`app.use(
  createSrpcRouter({
    services,
    logger: true,
    docs: {
      contractDir: "./contract",
      // optional overrides:
      // path: "/docs",
      // contractsApi: { apiKey: process.env.SRPC_API_KEY },
    },
  })
);`}
        </CodeBlock>
        <DocsList
          items={[
            "docs: true — scan ./contract from the working directory",
            "docs.contractDir — custom folder of .ctr / .rpc files",
            "docs.path — change docs base path (default /docs)",
            "docs.contractsApi: false — docs only, no /api/contracts",
            "docs.contractsApi.path — change API base path (default /api/contracts)",
            "docs.contractsApi.apiKey — require Bearer token on POST, PUT, DELETE",
          ]}
        />
        <p>
          When handlers are registered, service pages annotate methods with{" "}
          <code>implemented</code> so you can see which contract methods have
          backing code.
        </p>
      </DocsSection>

      <DocsSection title="Contract docs routes">
        <p>
          Interactive HTML is served by default. Append{" "}
          <code>?format=json</code> or send <code>Accept: application/json</code>{" "}
          (without <code>text/html</code>) for machine-readable output.
        </p>
        <DocsList
          items={[
            "GET /docs — overview: packages, service counts, stats",
            "GET /docs/types — all structs and enums across packages",
            "GET /docs/visualizer — dependency graph (HTML); JSON graph with ?format=json",
            "GET /docs/:package — package overview: structs, enums, services",
            "GET /docs/:package/:service — method list, HTTP verbs, params, return types",
            "GET /docs/:package/structs — all structs in a package",
            "GET /docs/:package/enums — all enums in a package",
            "GET /docs/:package/structs/:name — single struct with fields",
            "GET /docs/:package/enums/:name — single enum with values",
          ]}
        />
        <CodeBlock title="examples">
          {`# Browse in a browser
open http://localhost:3100/docs
open http://localhost:3100/docs/user/UserService
open http://localhost:3100/docs/visualizer

# JSON for agents / CI
curl -s 'http://localhost:3100/docs?format=json'
curl -s 'http://localhost:3100/docs/user?format=json'
curl -s 'http://localhost:3100/docs/user/UserService?format=json'
curl -s 'http://localhost:3100/docs/visualizer?format=json'`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Contract API routes">
        <p>
          The contract API manages <code>.ctr</code> files on disk. Reads are open
          by default; writes can be protected with an API key.
        </p>
        <DocsList
          items={[
            "GET /api/contracts — list packages, file paths, and index metadata",
            "GET /api/contracts/:package — package source + parsed docs object",
            "GET /api/contracts/:package/source — raw contract text (text/plain)",
            "POST /api/contracts/validate — validate source without saving (200 or 422)",
            "POST /api/contracts — create a new package (201)",
            "PUT /api/contracts/:package — replace package source",
            "DELETE /api/contracts/:package — remove package (204)",
          ]}
        />
        <CodeBlock title="validate without saving">
          {`curl -s -X POST http://localhost:3100/api/contracts/validate \\
  -H 'Content-Type: application/json' \\
  -d '{
    "package": "user",
    "source": "package user\\n\\nservice UserService { ... }"
  }'`}
        </CodeBlock>
        <CodeBlock title="create or update (with API key)">
          {`curl -s -X PUT http://localhost:3100/api/contracts/user \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer $SRPC_API_KEY" \\
  -d '{ "source": "package user\\n..." }'`}
        </CodeBlock>
        <p>
          Error responses use a consistent JSON shape:{" "}
          <code>{`{ error, message, diagnostics? }`}</code>. Common codes:{" "}
          <code>not_found</code> (404), <code>validation_failed</code> (422),{" "}
          <code>unauthorized</code> (401), <code>conflict</code> (409).
        </p>
      </DocsSection>

      <DocsSection title="Use cases">
        <DocsList
          items={[
            "Onboarding — developers browse /docs to learn available services, types, and HTTP verbs before writing clients",
            "Agent discovery — agents fetch ?format=json docs or the visualizer graph to understand package dependencies and callable methods",
            "CI validation — POST /api/contracts/validate in a pipeline to block invalid contract changes before deploy",
            "Multi-repo sync — consumer repos pull packages via srpc-cli (backed by the contract API) and run local codegen",
            "Contract publishing — push updated .ctr files from a client project to the canonical server with PUT /api/contracts/:package",
            "Implementation audit — compare contract methods against registered handlers via implemented flags on /docs/:package/:service",
            "Type exploration — link from struct/enum pages to cross-package references without opening raw .ctr files",
          ]}
        />
      </DocsSection>

      <DocsSection title="Typical workflows">
        <p>
          <strong>Local development</strong> — run the example server, open{" "}
          <code>/docs</code> and <code>/docs/visualizer</code>, edit contracts in
          VS Code, validate with <code>srpc package validate</code>.
        </p>
        <CodeBlock title="terminal">
          {`cd example && bun run dev
open http://localhost:3100/docs/visualizer
srpc package validate user`}
        </CodeBlock>
        <p>
          <strong>Consumer project</strong> — pull contracts from a remote SRPC
          server, generate types, implement handlers against shared contracts.
        </p>
        <CodeBlock title="terminal">
          {`SRPC_URL=https://api.example.com bun run contracts:pull
bun run generate`}
        </CodeBlock>
        <p>
          <strong>Contract owner</strong> — protect writes with{" "}
          <code>SRPC_API_KEY</code>, push changes from CI or a maintainer machine.
        </p>
        <CodeBlock title="terminal">
          {`SRPC_API_KEY=secret SRPC_URL=https://api.example.com \\
  bun run contracts:push -- user common`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Cursor MCP integration">
        <p>
          The <code>srpc-mcp</code> package exposes contract docs and APIs as{" "}
          <a
            href="https://cursor.com/docs/mcp"
            className="text-accent-bright hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            MCP tools
          </a>{" "}
          so agents can list packages, read full contract source, inspect services,
          and fetch the dependency graph without manual copy-paste.
        </p>
        <CodeBlock title=".cursor/mcp.json">
          {`{
  "mcpServers": {
    "srpc": {
      "command": "bun",
      "args": ["\${workspaceFolder}/srpc-mcp/index.ts"],
      "env": {
        "SRPC_URL": "http://localhost:3100",
        "SRPC_CONTRACT_DIR": "\${workspaceFolder}/example/contract"
      }
    }
  }
}`}
        </CodeBlock>
        <DocsList
          items={[
            "srpc_list_packages — discover all packages",
            "srpc_get_package — structs, enums, services (optional includeSource)",
            "srpc_get_service — full method documentation",
            "srpc_get_contract_source — raw .ctr text",
            "srpc_list_types / srpc_get_struct / srpc_get_enum — type reference",
            "srpc_get_dependency_graph — package link graph",
            "srpc_validate_contract — validate source via server API",
          ]}
        />
        <p>
          Set <code>SRPC_URL</code> for a live server, or <code>SRPC_CONTRACT_DIR</code>{" "}
          to read contracts offline. See <code>srpc-mcp/README.md</code> for details.
        </p>
      </DocsSection>

      <DocsSection title="How the pieces connect">
        <DocsList
          items={[
            "srpc-vscode — edit contracts with diagnostics in the editor",
            "srpc-mcp — MCP tools for agents to read contracts and docs",
            "srpc-cli — codegen + package pull/push/validate via /api/contracts",
            "/docs — browse and share API surface with humans and agents",
            "/api/contracts — programmatic contract storage and validation",
            "/srpc — execute implemented service methods at runtime",
          ]}
        />
      </DocsSection>

      <DocsSection title="Next steps">
        <p>
          Mount and configure the server on{" "}
          <Link href="/docs/server" className="text-accent-bright hover:underline">
            Building the server
          </Link>
          , sync packages with the{" "}
          <Link href="/docs/cli" className="text-accent-bright hover:underline">
            Contract CLI
          </Link>
          , and call live handlers via{" "}
          <Link href="/docs/protocol" className="text-accent-bright hover:underline">
            Protocol & errors
          </Link>
          .
        </p>
      </DocsSection>
    </DocsPage>
  );
}
