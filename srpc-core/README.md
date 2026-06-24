# srpc-core

Read SRPC contract files (`.ctr`, `.rpc`) and generate TypeScript types for your codebase.

`srpc-core` is the library/runtime package. CLI workflows now live in `srpc-cli`.

## Generate types

Use the programmatic API from your app or from `srpc-cli`.

## Programmatic API

```typescript
import { generateFromContracts } from "srpc-core";

const result = generateFromContracts({
  contractDir: "contract",
  outputFile: "generated/srpc-types.ts",
});

console.log(result.filesRead);
console.log(result.errors);
```

## Built-in HTTP tooling

`srpc-core/rpc` can expose more than the `/srpc` endpoint. When enabled, it can also mount:

- HTML contract docs at `/docs`
- contract read/write API at `/api/contracts`
- a browser request tester at `/playground`

Example:

```typescript
createSrpcRouter({
  services,
  docs: { contractDir: "./contract" },
  playground: { contractDir: "./contract" },
});
```

## Output

| Contract | TypeScript |
|----------|------------|
| `struct` | `export interface` |
| `enum` | `export enum` |
| `service` | `export interface` with method signatures |

Qualified references like `products.Product` map to `Product` (global unique names).

## Tests

```bash
bun test
```

## RPC (Express)

Custom HTTP RPC transport lives in `rpc/`. See [rpc/README.md](./rpc/README.md).

```bash
bun run rpc:server   # start example server on :3100
bun run rpc:client   # call user.UserService/getUser
```
