import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Contract CLI",
};

export default function CliPage() {
  return (
    <DocsPage
      title="Contract CLI"
      description="srpc-cli generates TypeScript from contracts and syncs packages with a remote SRPC server over the contract API."
    >
      <DocsSection title="Install">
        <p>
          Add <code>srpc-cli</code> to your app. It depends on{" "}
          <code>srpc-core</code> for codegen.
        </p>
        <CodeBlock title="package.json">
          {`{
  "dependencies": {
    "srpc-cli": "file:../srpc-cli",
    "srpc-core": "file:../srpc-core"
  },
  "scripts": {
    "generate": "srpc generate --contract-dir ./contract --out ./generated/srpc-types.ts"
  }
}`}
        </CodeBlock>
        <p>
          The <code>srpc</code> binary is available after <code>bun install</code>.
        </p>
      </DocsSection>

      <DocsSection title="Authentication">
        <p>
          When the server has devtools auth enabled, all <code>package</code>{" "}
          commands send credentials from env vars or flags. See{" "}
          <Link href="/docs/auth" className="text-accent-bright hover:underline">
            DevTools authentication
          </Link>{" "}
          for server setup.
        </p>
        <CodeBlock title="terminal">
          {`# API key (Bearer token)
export SRPC_API_KEY=your-secret
srpc package list
srpc package push

# Or via flags
srpc package pull --api-key your-secret
srpc package push --token your-secret    # --token alias

# HTTP Basic
srpc package list --user admin --password secret
export SRPC_USER=admin SRPC_PASSWORD=secret
srpc package validate user`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Environment">
        <DocsList
          items={[
            "SRPC_URL — contract API base URL (default http://localhost:3100)",
            "SRPC_CONTRACT_DIR — default local contract folder (contract)",
            "SRPC_API_KEY / SRPC_TOKEN — Bearer token when the server requires auth",
            "SRPC_USER / SRPC_PASSWORD — HTTP Basic credentials",
            "NO_COLOR — disable ANSI colors in terminal output",
          ]}
        />
        <CodeBlock title=".env">
          {`SRPC_URL=http://localhost:3100
SRPC_CONTRACT_DIR=./contract
# SRPC_API_KEY=secret
# SRPC_USER=admin
# SRPC_PASSWORD=secret`}
        </CodeBlock>
        <p>
          Flags: <code>--url</code>, <code>--api-key</code> / <code>--token</code>,{" "}
          <code>--user</code>, <code>--password</code>.
        </p>
      </DocsSection>

      <DocsSection title="Codegen">
        <CodeBlock title="terminal">
          {`srpc generate
srpc generate --contract-dir ./contract --out ./generated/srpc-types.ts`}
        </CodeBlock>
        <p>
          Equivalent to <code>srpc-core generate</code>. Emits interfaces, enums,
          and <code>SrpcServiceMeta</code> for{" "}
          <Link href="/docs/handlers" className="text-accent-bright hover:underline">
            defineService()
          </Link>
          . See also{" "}
          <Link href="/docs/codegen" className="text-accent-bright hover:underline">
            Codegen
          </Link>
          .
        </p>
      </DocsSection>

      <DocsSection title="Package commands">
        <p>
          All remote commands use <strong>package</strong> as the unit of work.
          Local files default to <code>{`{SRPC_CONTRACT_DIR}/{package}.ctr`}</code>.
        </p>
        <CodeBlock title="terminal">
          {`srpc package list
srpc package get <package> [--dir <contract-dir>] [--out <file>]
srpc package pull [package...] [--dir <contract-dir>]
srpc package push [package...] [--dir <contract-dir>]
srpc package validate <package> [--dir <contract-dir>]
srpc package create <package> [--file <path>] [--dir <contract-dir>]
srpc package update <package> [--file <path>] [--dir <contract-dir>]
srpc package delete <package>

srpc remote ...    # alias for srpc package ...`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Example app scripts">
        <p>The included example wires common workflows as npm scripts:</p>
        <CodeBlock title="package.json">
          {`"contracts:list": "srpc package list",
"contracts:get": "srpc package get",
"contracts:pull": "srpc package pull",
"contracts:push": "srpc package push",
"contracts:validate": "srpc package validate"`}
        </CodeBlock>
        <CodeBlock title="terminal">
          {`cd example
bun run contracts:list
bun run contracts:validate -- user
bun run contracts:pull -- common`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Multi-repo workflow">
        <p>
          Point <code>SRPC_URL</code> at your main contract server. Consumer
          projects pull packages, generate types locally, and push updates back
          when contracts change.
        </p>
        <CodeBlock title="terminal">
          {`# Consumer project
SRPC_URL=https://api.example.com bun run contracts:pull
bun run generate

# Publish local contract changes
SRPC_API_KEY=secret bun run contracts:push`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Contract API endpoints">
        <p>
          The CLI talks to <code>/api/contracts</code> on your SRPC server. See{" "}
          <Link href="/docs/system" className="text-accent-bright hover:underline">
            System docs & APIs
          </Link>{" "}
          for the full endpoint reference, request examples, and use cases.
        </p>
      </DocsSection>
    </DocsPage>
  );
}
