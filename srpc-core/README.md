# srpc-core

Read SRPC contract files (`.ctr`, `.rpc`) and generate TypeScript types for your codebase.

## Generate types

From your app (with `srpc-core` installed):

```bash
bun run generate
```

```json
{
  "scripts": {
    "generate": "srpc-core generate"
  }
}
```

Defaults: reads `contract/` and writes `generated/srpc-types.ts` relative to the current working directory.

Custom paths:

```bash
srpc-core generate --contract-dir ./contract --out ./generated/srpc-types.ts
```

From the `srpc-core` package itself (monorepo):

```bash
cd srpc-core
bun run generate
```

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
