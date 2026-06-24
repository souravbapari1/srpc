import { CodeBlock } from "@/components/code-block";
import { FlowSteps } from "@/components/flow-steps";
import { TypeReferenceTable } from "@/components/type-reference-table";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Protocol & errors",
};

const errorCodes = [
  {
    name: "PARSE_ERROR (-32700)",
    description: "Malformed JSON or query params",
    example: "Invalid params JSON in GET query",
  },
  {
    name: "INVALID_REQUEST (-32600)",
    description: "Missing or invalid envelope fields",
    example: "srpc !== '1.0' or missing service/method",
  },
  {
    name: "METHOD_NOT_FOUND (-32601)",
    description: "Method does not exist on the service",
    example: "getUserx on user.UserService",
  },
  {
    name: "SERVICE_NOT_FOUND (-32602)",
    description: "Service key not registered",
    example: "unknown.FooService",
  },
  {
    name: "METHOD_NOT_ALLOWED (-32604)",
    description: "HTTP verb does not match contract decorator",
    example: "GET used for @post createUser",
  },
  {
    name: "INTERNAL_ERROR (-32603)",
    description: "Handler threw or uncaught server exception",
    example: "throw new Error('User not found')",
  },
];

export default function ProtocolPage() {
  return (
    <DocsPage
      title="Protocol & errors"
      description="How SRPC requests and responses are structured, how dispatch works internally, and what each error code means."
    >
      <DocsSection title="Request envelope">
        <p>
          Every RPC call sends a versioned envelope. The service key is{" "}
          <code>package.ServiceName</code> and method is the contract method
          name.
        </p>
        <CodeBlock title="POST /srpc — request body">
          {`{
  "srpc": "1.0",
  "service": "user.UserService",
  "method": "getUser",
  "id": "optional-request-id",
  "params": { "id": "user-1" }
}`}
        </CodeBlock>
        <DocsList
          items={[
            "srpc — protocol version, currently '1.0'",
            "service — fully qualified service key",
            "method — method name from the contract",
            "id — optional client correlation id, echoed in the response",
            "params — method arguments object (matches contract param struct)",
          ]}
        />
      </DocsSection>

      <DocsSection title="GET vs POST transport">
        <p>
          <code>@get</code> methods use query-string transport. All other verbs
          send JSON in the request body.
        </p>
        <CodeBlock title="GET /srpc?srpc=1.0&service=...&method=...&params=...">
          {`GET /srpc?srpc=1.0
    &service=user.UserService
    &method=getUser
    &id=req-1
    &params={"id":"user-1"}`}
        </CodeBlock>
        <p>
          The <code>params</code> query value is a URL-encoded JSON string.
          POST/PUT/PATCH/DELETE methods send the full envelope as JSON in the
          body.
        </p>
      </DocsSection>

      <DocsSection title="Success response">
        <p>
          On success, SRPC returns HTTP 200 with the result wrapped in a success
          envelope:
        </p>
        <CodeBlock title="success response">
          {`{
  "srpc": "1.0",
  "id": "req-1",
  "result": {
    "id": "user-1",
    "email": "alice@example.com",
    "status": "ACTIVE"
  }
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Error response">
        <p>
          SRPC errors include a user-friendly <code>message</code> and a
          developer-facing <code>detail</code> with the technical reason:
        </p>
        <CodeBlock title="error response">
          {`{
  "srpc": "1.0",
  "id": "req-1",
  "error": {
    "code": -32604,
    "message": "This request must use POST, not GET.",
    "detail": "Method 'createUser' on 'user.UserService' must be called with HTTP POST, received GET."
  }
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Error codes">
        <TypeReferenceTable title="SRPC error codes" rows={errorCodes} />
      </DocsSection>

      <DocsSection title="Dispatch flow">
        <p>When a request hits <code>/srpc</code>, the handler runs this sequence:</p>
        <FlowSteps
          steps={[
            {
              title: "Read payload",
              description:
                "GET requests parse query params via parseSrpcRequestFromQuery. Other verbs read req.body (JSON).",
            },
            {
              title: "Validate envelope",
              description:
                "Check srpc version, service, and method fields. Return INVALID_REQUEST if malformed.",
            },
            {
              title: "Validate HTTP verb",
              description:
                "Compare incoming HTTP method against contract metadata. Return METHOD_NOT_ALLOWED on mismatch.",
            },
            {
              title: "Lookup service and handler",
              description:
                "Find the service registry entry and method handler. Return SERVICE_NOT_FOUND or METHOD_NOT_FOUND.",
            },
            {
              title: "Execute handler",
              description:
                "Call handler(params, ctx). On success, wrap result in buildSuccess(). On throw, return INTERNAL_ERROR.",
            },
            {
              title: "Send response",
              description:
                "Return JSON with HTTP 200 (success) or 400 (SRPC error). Uncaught exceptions return HTTP 500.",
            },
          ]}
        />
      </DocsSection>

      <DocsSection title="HTTP status mapping">
        <DocsList
          items={[
            "200 — successful RPC call (result in body)",
            "400 — SRPC protocol error (error object in body)",
            "500 — uncaught exception outside handler error wrapping",
            "204 — OPTIONS preflight (handled by your CORS middleware, not SRPC)",
          ]}
        />
      </DocsSection>

      <DocsSection title="Handler errors vs protocol errors">
        <p>
          Protocol errors (wrong verb, unknown service) are generated by the
          SRPC runtime before your handler runs. Handler errors come from{" "}
          <code>throw new Error(...)</code> inside your business logic and
          always map to <code>INTERNAL_ERROR</code> with your message in{" "}
          <code>detail</code>.
        </p>
        <CodeBlock title="services/user.ts" language="typescript">
          {`login({ email }) {
  const user = requireEntity(
    [...store.users.values()].find(item => item.email === email),
    "User",
    email  // throws → INTERNAL_ERROR with detail "User 'x' not found"
  );
  return createLoginResponse(user);
}`}
        </CodeBlock>
      </DocsSection>
    </DocsPage>
  );
}
