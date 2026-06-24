import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Building the server",
};

export default function ServerPage() {
  return (
    <DocsPage
      title="Building the server"
      description="Mount the SRPC Express router, enable contract docs and the contract API, register handlers, and configure CORS and logging."
    >
      <DocsSection title="Basic setup">
        <p>
          Import your aggregated services array and pass it to{" "}
          <code>createSrpcRouter()</code>. HTTP verbs are inferred from
          contract metadata automatically.
        </p>
        <CodeBlock title="index.ts" language="typescript">
          {`import express from "express";
import { createSrpcRouter } from "srpc-core/rpc";
import services from "./services/index.ts";

const app = express();

app.use(
  createSrpcRouter({
    services,
    logger: true,
    docs: { contractDir: "./contract" },
  })
);

app.listen(3100, () => {
  console.log("SRPC server listening on http://localhost:3100");
  console.log("Contract docs at http://localhost:3100/docs");
  console.log("Contract API at http://localhost:3100/api/contracts");
});`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Contract docs & API">
        <p>
          Enable <code>docs</code> to serve contract documentation and the
          internal contract API alongside RPC. See{" "}
          <Link href="/docs/system" className="text-accent-bright hover:underline">
            System docs & APIs
          </Link>{" "}
          for every route, JSON output, use cases, and sync workflows.
        </p>
      </DocsSection>

      <DocsSection title="Service aggregation">
        <p>
          Collect every <code>defineService()</code> result into a single array.
          The example app exports 18 services from one index file:
        </p>
        <CodeBlock title="services/index.ts" language="typescript">
          {`import { authService, userService } from "./user.ts";
import { productService, categoryService, brandService } from "./catalog.ts";
// ... other services

export default [
  productService,
  categoryService,
  brandService,
  userService,
  authService,
  // ...
];`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="CORS middleware">
        <p>
          SRPC does not handle CORS itself. Add middleware before the router for
          browser clients. Handle OPTIONS preflight explicitly:
        </p>
        <CodeBlock title="index.ts" language="typescript">
          {`app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.use(createSrpcRouter({ services, logger: true, docs: { contractDir: "./contract" } }));`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="JSON body parsing">
        <p>
          SRPC applies <code>express.json()</code> only on SRPC routes — not
          globally. You do not need <code>app.use(express.json())</code> for RPC
          calls. The router registers:
        </p>
        <DocsList
          items={[
            "GET /srpc — query-string envelope (no JSON body parser)",
            "POST /srpc — express.json() then handler",
            "PUT, PATCH, DELETE /srpc — express.json() then handler",
          ]}
        />
      </DocsSection>

      <DocsSection title="Request logging">
        <p>
          Pass <code>logger: true</code> to enable colorful console logs for
          every RPC request and response, including duration and error details:
        </p>
        <CodeBlock title="terminal output">
          {`→ GET user.UserService.getUser id=user-1
← user.UserService.getUser 200 12ms

→ POST user.UserService.createUser
← user.UserService.createUser 400 3ms METHOD_NOT_ALLOWED`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Next steps">
        <p>
          Implement handler logic with{" "}
          <Link href="/docs/handlers" className="text-accent-bright hover:underline">
            defineService()
          </Link>
          , sync contracts with the{" "}
          <Link href="/docs/cli" className="text-accent-bright hover:underline">
            Contract CLI
          </Link>
          , and understand the wire format on{" "}
          <Link href="/docs/protocol" className="text-accent-bright hover:underline">
            Protocol & errors
          </Link>
          .
        </p>
      </DocsSection>
    </DocsPage>
  );
}
