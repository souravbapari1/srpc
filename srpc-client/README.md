# srpc-client

Universal SRPC client — call RPC methods like **`user.getUser({ id })`**.

Works in React, Next.js, Vue, Angular, Vite, Node.js, and plain browser scripts.

## Install

```bash
bun add srpc-client
```

## One client per service

Create a separate file for each contract service. You provide `baseUrl` and headers — no env magic in the client.

```typescript
// src/rpc/user.ts
import { UserService } from "../generated/srpc-types";
import { createServiceClient } from "srpc-client";

export const user = createServiceClient(UserService, {
  baseUrl: "http://localhost:3100",
  headers: { Authorization: "Bearer <token>" },
});
```

## Call RPC methods

```typescript
import { user } from "./rpc/user";

await user.getUser({ id: "user-1" });
await user.createUser({ id: "user-2" });
```

HTTP verbs (`GET`, `POST`, `PUT`, …) follow your `@get` / `@post` decorators in `.ctr` files.

## Test

```bash
bun test
```
