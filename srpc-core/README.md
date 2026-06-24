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
