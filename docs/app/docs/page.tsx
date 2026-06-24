import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { FlowSteps } from "@/components/flow-steps";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Introduction",
};

export default function IntroductionPage() {
  return (
    <DocsPage
      title="Introduction"
      description="SRPC is an RPC framework for agentic development — contract-first services on Express with typed params, structured envelopes, and predictable errors."
    >
      <DocsSection title="What SRPC is">
        <p>
          SRPC is built for agentic development: you define an explicit,
          machine-readable API surface in contract files, generate shared
          TypeScript types, and implement handlers that agents invoke through a
          single HTTP endpoint — <code>/srpc</code> — with a versioned request
          envelope and structured success/error responses.
        </p>
        <DocsList
          items={[
            "Contract-first — services, methods, and types agents can discover",
            "Codegen — srpc-core emits interfaces, enums, and service metadata",
            "Typed handlers — defineService() wires each method to a function",
            "Stable protocol — versioned envelope with message + detail errors",
            "Express integration — createSrpcRouter() mounts GET/POST/PUT/PATCH/DELETE",
          ]}
        />
      </DocsSection>

      <DocsSection title="Why contracts for agents">
        <p>
          Agents work best with explicit capabilities, not inferred REST shapes.
          A contract file names every service and method, declares parameter and
          return types, and records HTTP verbs — giving both humans and agents a
          single source of truth for what can be called and what comes back.
        </p>
      </DocsSection>

      <DocsSection title="Monorepo layout">
        <p>
          The example app shows the recommended backend project structure:
        </p>
        <CodeBlock title="example/">
          {`contract/           # .ctr contract files (one package per file)
generated/          # srpc-types.ts from codegen
services/           # defineService() handler implementations
services/index.ts   # aggregate all services into an array
index.ts            # Express app + createSrpcRouter`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="End-to-end workflow">
        <FlowSteps
          steps={[
            {
              title: "Write contracts",
              description:
                "Define structs, enums, and services in contract/*.ctr. Use the VS Code extension for live diagnostics.",
            },
            {
              title: "Generate types",
              description:
                "Run srpc generate to produce generated/srpc-types.ts with interfaces, enums, and SrpcServiceMeta.",
            },
            {
              title: "Implement handlers",
              description:
                "Use defineService(UserService, { ... }) to map each contract method to a typed function.",
            },
            {
              title: "Mount the router",
              description:
                "Pass your services array to createSrpcRouter({ services, logger: true, docs: { contractDir } }).",
            },
            {
              title: "Call /srpc",
              description:
                "Clients send { srpc, service, method, params } as JSON (POST) or query params (GET).",
            },
          ]}
        />
      </DocsSection>

      <DocsSection title="Quick start">
        <p>
          For install steps, package overview, CLI, and VS Code setup, see the{" "}
          <Link href="/docs/setup" className="text-accent-bright hover:underline">
            Full setup guide
          </Link>
          . To run the example server:
        </p>
        <CodeBlock title="terminal">
          {`cd example
bun install
bun run dev`}
        </CodeBlock>
        <p>
          The server listens on <strong>http://localhost:3100</strong> with RPC at{" "}
          <code>/srpc</code>, docs at <code>/docs</code>, playground at{" "}
          <code>/playground</code>, and the contract API at{" "}
          <code>/api/contracts</code>.
        </p>
      </DocsSection>

      <DocsSection title="Next steps">
        <DocsList
          items={[
            "Install everything → Full setup guide",
            "Contract file format → Writing contracts",
            "Browse docs & internal APIs → System docs & APIs",
            "Protect docs, playground & API → DevTools authentication",
            "Remote package sync → Contract CLI",
            "Editor tooling → VS Code extension",
            "Wire up handlers → Implementing handlers",
          ]}
        />
        <p className="mt-4">
          <Link href="/docs/setup" className="text-accent-bright hover:underline">
            Start with the full setup guide →
          </Link>
        </p>
      </DocsSection>
    </DocsPage>
  );
}
