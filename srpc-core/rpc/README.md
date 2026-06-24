# SRPC RPC

Custom HTTP RPC layer for SRPC services using Express.

## Protocol

`POST /srpc`

```json
{
  "srpc": "1.0",
  "service": "user.UserService",
  "method": "getUser",
  "id": "optional-request-id",
  "params": { "id": "user-1" }
}
```

Success:

```json
{
  "srpc": "1.0",
  "id": "optional-request-id",
  "result": { }
}
```

Error:

```json
{
  "srpc": "1.0",
  "id": "optional-request-id",
  "error": { "code": -32601, "message": "Method not found" }
}
```

Service names use `package.ServiceName` from your contract files (`user.UserService`).

### HTTP methods on service methods

Annotate RPC methods with `@get`, `@post`, `@put`, `@patch`, or `@delete` in your `.ctr` files:

```srpc
service UserService {
    @get getUser(data: UserRequest) => User
    @post createUser(data: UserRequest) => User
}
```

Codegen emits `httpMethod` metadata. The client uses the matching HTTP verb automatically; `GET` sends params as query string, others use a JSON body.

Pass `DefinedService[]` from `defineService()` to `createSrpcRouter` — HTTP verbs are inferred from the same metadata; no manual `buildHttpMethodRegistry` setup.

## Server

```typescript
import express from "express";
import { createSrpcRouter, defineService } from "srpc-core/rpc";
import type { UserService } from "../generated/srpc-types";

const userService = defineService(UserService, {
  getUser: async (data, ctx) => {
    const token = ctx.getBearerToken();
    if (!token) throw new Error("Unauthorized");

    return { id: data.id, name: "Jane" };
  },
});

const app = express();
app.use(createSrpcRouter({ services: [userService] }));
app.listen(3100);
```

### Contract docs (project-specific)

Enable JSON docs generated from your `.ctr` / `.rpc` contracts:

```typescript
app.use(
  createSrpcRouter({
    services: [userService],
    docs: { contractDir: "./contract" },
  })
);
```

| Route | Description |
|-------|-------------|
| `GET /docs` | HTML index of all contract packages |
| `GET /docs/:package` | Structs, enums, and services in a package |
| `GET /docs/:package/:service` | Methods, HTTP verbs, params, and return types |
| `GET /playground` | Browser UI for testing SRPC methods live |

Pages are **HTML by default** in the browser. Append `?format=json` (or send `Accept: application/json`) for the JSON API.

When handlers are registered via `defineService()`, each method includes `implemented: true | false`.

Use `docs: true` to scan `./contract` from the current working directory, or pass a custom path:

```typescript
docs: { contractDir: "./contract", path: "/docs" }
```

### SRPC Playground

Enable a lightweight browser tester powered by your contract metadata:

```typescript
app.use(
  createSrpcRouter({
    services: [userService],
    docs: { contractDir: "./contract" },
    playground: { contractDir: "./contract" },
  })
);
```

The playground is served at `GET /playground` by default.

Features:

- package, service, and method selection from live contract docs
- Monaco JSON editor with contract-driven field autocomplete and validation
- schema-driven request body scaffolding
- live calls to the existing `/srpc` endpoint
- formatted JSON response output

You can customize the route:

```typescript
playground: { contractDir: "./contract", path: "/srpc-ui" }
```

See [example/](./example/) for the full project layout.

### Request context

Service handlers receive a second argument with HTTP request data:

```typescript
defineService(UserService, {
  getUser: async (data, ctx) => {
    ctx.getBearerToken();       // Authorization: Bearer <token>
    ctx.getHeader("x-tenant");  // any request header
    ctx.headers;                // raw Express headers
    ctx.requestId;              // SRPC request id from client
    ctx.ip;                     // client IP
    ctx.request;                // full Express Request (cookies, user from middleware, etc.)
  },
});
```

Run the example:

```bash
bun run rpc:server
```

## Client

Install **`srpc-client`** for frontend apps (React, Vue, Angular, Vite, Next.js, Node):

```bash
bun add srpc-client
```

Uses the browser-native [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API (works in browsers, Bun, and Node 18+).

```typescript
import { UserService } from "../generated/srpc-types";
import { createServiceClient } from "srpc-client";

const client = createServiceClient(UserService, {
  baseUrl: "http://localhost:3100",
});

await client.getUser({ id: "user-1" });
```

### Universal client (`srpc-client`)

Create one file per service. You pass `baseUrl` — the client does not read environment variables.

```typescript
// rpc/user.ts
import { UserService } from "../generated/srpc-types";
import { createServiceClient } from "srpc-client";

export const user = createServiceClient(UserService, {
  baseUrl: "http://localhost:3100",
});

await user.getUser({ id: "user-1" });
```

See [srpc-client/README.md](../../srpc-client/README.md).

Optional HTTP options:

```typescript
createServiceClient(UserService, {
  baseUrl: "http://localhost:3100",
  headers: { Authorization: "Bearer <token>" },
  timeout: 10_000,
  withCredentials: true,
  auth: { username: "user", password: "pass" },
});
```

Run the example (server must be running):

```bash
bun run rpc:client
```

### Browser

Import from **`srpc-client`** (no Express/server code in your bundle):

```typescript
import { createServiceClient } from "srpc-client";
```

The example server enables CORS for browser requests. Open the browser demo:

```bash
bun run rpc:server   # terminal 1
bun run rpc:browser  # terminal 2
```

Or bundle `rpc/example/browser-client.ts` in your frontend app (Vite, etc.).

## Layout

```
rpc/
├── protocol.ts   # SRPC envelope types (re-export from srpc-client)
├── handler.ts    # request dispatch
├── context.ts    # handler request context
├── registry.ts   # defineService, buildServiceRegistry
├── server.ts     # Express router/server
├── service-meta.ts
├── index.ts
└── example/
    ├── config.ts
    ├── server.ts
    ├── rpc/
    │   └── user.ts   # per-service client (uses srpc-client)
    └── services/
        ├── index.ts
        └── user.service.ts
```
