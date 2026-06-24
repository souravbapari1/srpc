import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "DevTools authentication",
};

export default function AuthPage() {
  return (
    <DocsPage
      title="DevTools authentication"
      description="Protect /docs, /playground, and /api/contracts with a shared API key and HTTP Basic auth — configure once on the server, then use the CLI, curl, or your browser."
    >
      <DocsSection title="What is protected">
        <p>
          SRPC devtools are optional surfaces for browsing and managing contracts.
          When you enable <code>auth</code>, these routes require credentials:
        </p>
        <DocsList
          items={[
            "/docs — contract documentation and visualizer",
            "/playground — browser request tester for /srpc calls",
            "/api/contracts — contract API used by srpc-cli",
          ]}
        />
        <p>
          RPC traffic on <code>/srpc</code> is <strong>not</strong> protected by
          devtools auth. Use your own Express middleware if RPC endpoints need
          authentication.
        </p>
      </DocsSection>

      <DocsSection title="Quick setup">
        <p>
          Define auth once with <code>createDevToolsAuth()</code> and pass it to{" "}
          <code>createSrpcRouter()</code>. The same config applies to docs,
          playground, and the contract API — set <code>auth</code> once on the
          router.
        </p>
        <CodeBlock title="index.ts" language="typescript">
          {`import {
  createDevToolsAuth,
  createSrpcRouter,
  readDevToolsAuthFromEnv,
} from "srpc-core/rpc";

// Option A — from environment variables (recommended for the example app)
const auth = readDevToolsAuthFromEnv();

// Option B — inline for local development
// const auth = createDevToolsAuth({
//   apiKey: "1234567890",
//   username: "admin",
//   password: "password",
// });

app.use(
  createSrpcRouter({
    services,
    logger: true,
    auth,
    docs: { contractDir: "./contract" },
    playground: { contractDir: "./contract" },
  })
);`}
        </CodeBlock>
        <p>
          Copy <code>example/.env.example</code> to <code>.env</code> and uncomment
          the auth variables when you want protection enabled.
        </p>
      </DocsSection>

      <DocsSection title="createDevToolsAuth()">
        <p>
          Builds a single auth object from an API key and/or HTTP Basic
          credentials. Use <code>username</code> / <code>password</code> as
          shorthand for <code>basicAuth</code>.
        </p>
        <CodeBlock title="typescript" language="typescript">
          {`import { createDevToolsAuth } from "srpc-core/rpc";

const auth = createDevToolsAuth({
  apiKey: "1234567890",
  username: "admin",
  password: "password",
});

// Equivalent to:
// {
//   apiKey: "1234567890",
//   basicAuth: { username: "admin", password: "password" },
// }`}
        </CodeBlock>
        <p>
          When both API key and Basic auth are set, a request succeeds if{" "}
          <em>either</em> credential is valid.
        </p>
      </DocsSection>

      <DocsSection title="readDevToolsAuthFromEnv()">
        <p>
          Reads the same values from standard environment variables. The example
          server uses this so you can toggle auth without code changes.
        </p>
        <CodeBlock title=".env">
          {`# API key — Bearer token or X-SRPC-API-KEY header
SRPC_API_KEY=your-secret
SRPC_TOKEN=your-secret          # alias for SRPC_API_KEY

# HTTP Basic — browser login for /docs and /playground
SRPC_DOCS_USER=admin
SRPC_DOCS_PASSWORD=secret

# CLI can also use SRPC_USER / SRPC_PASSWORD (same credentials)`}
        </CodeBlock>
        <CodeBlock title="index.ts" language="typescript">
          {`import { createSrpcRouter, readDevToolsAuthFromEnv } from "srpc-core/rpc";

const auth = readDevToolsAuthFromEnv();`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Where to configure">
        <p>
          Auth is configured in exactly one place: the top-level{" "}
          <code>auth</code> option on <code>createSrpcRouter()</code>. It
          applies to <code>/docs</code>, <code>/playground</code>, and{" "}
          <code>/api/contracts</code> automatically.
        </p>
        <CodeBlock title="index.ts" language="typescript">
          {`createSrpcRouter({
  services,
  auth: createDevToolsAuth({
    apiKey: "1234567890",
    username: "admin",
    password: "password",
  }),
  docs: { contractDir: "./contract" },
  playground: { contractDir: "./contract" },
});`}
        </CodeBlock>
        <p>
          Do not set auth on <code>docs</code> or <code>playground</code> — use
          top-level <code>auth</code> only. Path options live directly on each
          feature: <code>docs.path</code>, <code>docs.contractsApiPath</code>,{" "}
          <code>playground.path</code>.
        </p>
      </DocsSection>

      <DocsSection title="Accepted credentials">
        <DocsList
          items={[
            "Authorization: Bearer <apiKey> — used by srpc-cli and curl",
            "X-SRPC-API-KEY: <apiKey> — alternative header for API key auth",
            "Authorization: Basic <base64(user:pass)> — browser login prompt on /docs and /playground",
          ]}
        />
        <CodeBlock title="curl examples">
          {`# List packages with Bearer token
curl -s http://localhost:3100/api/contracts \\
  -H "Authorization: Bearer $SRPC_API_KEY"

# Same request with dedicated header
curl -s http://localhost:3100/api/contracts \\
  -H "X-SRPC-API-KEY: $SRPC_API_KEY"

# HTTP Basic
curl -s http://localhost:3100/docs \\
  -u admin:password

# JSON docs for agents
curl -s 'http://localhost:3100/docs/user?format=json' \\
  -H "Authorization: Bearer $SRPC_API_KEY"`}
        </CodeBlock>
        <p>
          Unauthorized requests return <code>401</code> with{" "}
          <code>{`{ error: "unauthorized", message: "Invalid or missing credentials" }`}</code>.
          Browser requests to /docs with Basic auth configured show a login prompt.
        </p>
      </DocsSection>

      <DocsSection title="Playground">
        <p>
          The playground at <code>/playground</code> is a built-in browser UI for
          testing <code>/srpc</code> calls against your contracts. Enable it
          alongside docs:
        </p>
        <CodeBlock title="index.ts" language="typescript">
          {`createSrpcRouter({
  services,
  auth,
  docs: { contractDir: "./contract" },
  playground: { contractDir: "./contract" },
});`}
        </CodeBlock>
        <p>When auth is enabled:</p>
        <DocsList
          items={[
            "Open http://localhost:3100/playground — browser prompts for Basic auth if configured",
            "Or authenticate with an API key via browser devtools (less common for HTML pages)",
            "The Headers tab lets you add Authorization or custom headers for /srpc test calls",
          ]}
        />
        <p>
          Playground auth protects the HTML UI only. Your <code>/srpc</code>{" "}
          handler auth is separate — configure Express middleware on the RPC path
          if needed.
        </p>
      </DocsSection>

      <DocsSection title="Contract CLI">
        <p>
          All <code>srpc package</code> and <code>srpc remote</code> commands
          send credentials automatically when env vars or flags are set. See the{" "}
          <Link href="/docs/cli" className="text-accent-bright hover:underline">
            Contract CLI
          </Link>{" "}
          page for the full command list.
        </p>
        <CodeBlock title=".env">
          {`SRPC_URL=http://localhost:3100
SRPC_API_KEY=your-secret
SRPC_USER=admin
SRPC_PASSWORD=secret`}
        </CodeBlock>
        <CodeBlock title="terminal">
          {`# Using environment variables
bun run contracts:list
bun run contracts:push

# Using flags
srpc package list --url http://localhost:3100 --api-key your-secret
srpc package pull --user admin --password secret

# --token is an alias for --api-key
srpc package push --token your-secret`}
        </CodeBlock>
        <p>
          The CLI sends <code>Authorization: Bearer</code> when an API key is
          set, or <code>Authorization: Basic</code> when username/password are
          set. API key takes precedence if both are provided.
        </p>
      </DocsSection>

      <DocsSection title="CORS">
        <p>
          If browser clients call the contract API from another origin, allow the
          auth headers in your CORS middleware:
        </p>
        <CodeBlock title="index.ts" language="typescript">
          {`res.setHeader(
  "Access-Control-Allow-Headers",
  "Content-Type, Authorization, Accept, X-SRPC-API-KEY"
);`}
        </CodeBlock>
        <p>
          See{" "}
          <Link href="/docs/server" className="text-accent-bright hover:underline">
            Building the server
          </Link>{" "}
          for the full CORS setup.
        </p>
      </DocsSection>

      <DocsSection title="MCP and agents">
        <p>
          When using <code>srpc-mcp</code> against a protected server, pass the
          API key in the MCP server env:
        </p>
        <CodeBlock title=".cursor/mcp.json">
          {`{
  "mcpServers": {
    "srpc": {
      "command": "bun",
      "args": ["\${workspaceFolder}/srpc-mcp/index.ts"],
      "env": {
        "SRPC_URL": "http://localhost:3100",
        "SRPC_API_KEY": "your-secret",
        "SRPC_CONTRACT_DIR": "\${workspaceFolder}/example/contract"
      }
    }
  }
}`}
        </CodeBlock>
        <p>
          Agents can also fetch JSON docs directly when they have the Bearer token:
        </p>
        <CodeBlock title="terminal">
          {`curl -s 'http://localhost:3100/docs/visualizer?format=json' \\
  -H "Authorization: Bearer $SRPC_API_KEY"`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Typical workflows">
        <p>
          <strong>Local dev (open)</strong> — leave auth unset. Docs, playground,
          and contract API are accessible without credentials.
        </p>
        <p>
          <strong>Shared staging server</strong> — set API key + Basic auth so
          teammates browse /docs in the browser and CI uses the API key for
          push/pull.
        </p>
        <CodeBlock title="terminal">
          {`# Server .env
SRPC_API_KEY=staging-secret
SRPC_DOCS_USER=team
SRPC_DOCS_PASSWORD=staging-pass

# Developer machine — pull contracts
SRPC_URL=https://staging.example.com \\
SRPC_API_KEY=staging-secret \\
  bun run contracts:pull`}
        </CodeBlock>
        <p>
          <strong>CI pipeline</strong> — validate or push contracts with only the
          API key (no interactive Basic auth needed).
        </p>
        <CodeBlock title="terminal">
          {`SRPC_API_KEY=\${{ secrets.SRPC_API_KEY }} \\
SRPC_URL=https://api.example.com \\
  srpc package validate user`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Next steps">
        <DocsList
          items={[
            "All devtools routes → System docs & APIs",
            "Server setup and CORS → Building the server",
            "CLI commands and scripts → Contract CLI",
            "Example app env file → example/.env.example",
          ]}
        />
      </DocsSection>
    </DocsPage>
  );
}
