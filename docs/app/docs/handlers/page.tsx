import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Implementing handlers",
};

export default function HandlersPage() {
  return (
    <DocsPage
      title="Implementing handlers"
      description="Use defineService() to wire generated contract metadata to typed handler functions with request context and error handling."
    >
      <DocsSection title="defineService()">
        <p>
          <code>defineService()</code> takes the generated service metadata
          constant (e.g. <code>UserService</code>) and an object mapping each
          method name to a handler function. It returns a{" "}
          <code>DefinedService</code> with the runtime key, handlers, and HTTP
          verb registry.
        </p>
        <CodeBlock title="services/user.ts" language="typescript">
          {`import { defineService } from "srpc-core/rpc";
import type { SrpcHandlerContext } from "srpc-core/rpc";
import { UserService } from "../generated/srpc-types.ts";

export const userService = defineService(UserService, {
  async getUser({ id }, ctx: SrpcHandlerContext) {
    return requireEntity(store.users.get(id), "User", id);
  },

  createUser({ email, profile, preferences }) {
    return createUserFromRegister(email, profile, preferences);
  },
});`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Handler signature">
        <p>Every handler has the shape:</p>
        <CodeBlock language="typescript">
          {`(params, ctx) => result | Promise<result>`}
        </CodeBlock>
        <DocsList
          items={[
            "params — typed from the contract method's parameter struct",
            "ctx — SrpcHandlerContext with headers, request, and helpers",
            "result — must match the contract return type",
          ]}
        />
      </DocsSection>

      <DocsSection title="Request context">
        <p>
          <code>SrpcHandlerContext</code> gives handlers access to the incoming
          HTTP request without coupling to Express directly:
        </p>
        <DocsList
          items={[
            "ctx.getBearerToken() — parse Authorization: Bearer <token>",
            "ctx.getHeader(name) — read any request header",
            "ctx.requestId — SRPC id from the client payload",
            "ctx.service / ctx.method — resolved RPC target",
            "ctx.ip — client IP from Express",
            "ctx.request — full Express Request (cookies, auth middleware, etc.)",
          ]}
        />
        <CodeBlock title="services/user.ts" language="typescript">
          {`async getUser({ id }, ctx: SrpcHandlerContext) {
  await delay(1000);
  console.log(\`getUser id=\${id} token=\${ctx.getBearerToken() ?? "none"}\`);
  return requireEntity(store.users.get(id), "User", id);
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="CRUD handler patterns">
        <p>The example user service demonstrates common patterns:</p>
        <CodeBlock title="services/user.ts" language="typescript">
          {`listUsers({ pagination, role, status, query }) {
  const all = [...store.users.values()].filter(user => {
    if (role && user.role !== role) return false;
    if (status && user.status !== status) return false;
    if (query) {
      const haystack = \`\${user.email} \${user.profile.firstName}\`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  return {
    items: paginate(all, pagination),
    meta: paginationMeta(pagination, all.length),
  };
},

updateUser({ userId, profile }) {
  const user = requireEntity(store.users.get(userId), "User", userId);
  user.profile = profile;
  user.updatedAt = now();
  return user;
},

deleteUser({ id }) {
  store.users.delete(id);
  return empty();
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Multiple services in one file">
        <p>
          Export separate <code>defineService()</code> results for each contract
          service in the same file:
        </p>
        <CodeBlock title="services/user.ts" language="typescript">
          {`export const authService = defineService(AuthService, {
  register(data) {
    const user = createUserFromRegister(data.email, data.profile, data.preferences);
    return createLoginResponse(user);
  },

  login({ email }) {
    const user = requireEntity(
      [...store.users.values()].find(item => item.email === email),
      "User",
      email
    );
    return createLoginResponse(user);
  },

  logout() {
    return empty();
  },
});`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Error handling">
        <p>
          Throw <code>new Error("message")</code> from a handler to return an{" "}
          <code>INTERNAL_ERROR</code> response. The error message becomes the{" "}
          <code>detail</code> field; clients see a generic user-friendly{" "}
          <code>message</code>.
        </p>
        <CodeBlock title="error response">
          {`{
  "srpc": "1.0",
  "error": {
    "code": -32603,
    "message": "Something went wrong while processing your request.",
    "detail": "User 'user-99' not found"
  }
}`}
        </CodeBlock>
        <p>
          Use helper functions like <code>requireEntity()</code> to throw
          consistent not-found errors. Validation failures should also throw
          with a clear message — SRPC catches all handler exceptions and wraps
          them in the error envelope.
        </p>
      </DocsSection>

      <DocsSection title="Returning contract-shaped objects">
        <p>
          Handlers must return objects matching the contract return type. SRPC
          wraps the result in a success envelope automatically — do not return
          the envelope yourself.
        </p>
        <DocsList
          items={[
            "Single entity — return the struct directly",
            "List endpoints — return { items, meta } matching ListResponse",
            "Delete/logout — return { success: true } for EmptyResponse",
            "Auth — return LoginResponse with tokens and user",
          ]}
        />
      </DocsSection>

      <DocsSection title="Next steps">
        <p>
          Learn how requests are validated and dispatched on the{" "}
          <Link href="/docs/protocol" className="text-accent-bright hover:underline">
            Protocol & errors
          </Link>{" "}
          page.
        </p>
      </DocsSection>
    </DocsPage>
  );
}
