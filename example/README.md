# example

SRPC e-commerce example — contracts, codegen, server, and client.

## Setup

```bash
bun install
bun run generate
```

Copy `.env.example` to `.env` if you use the contract CLI against this server.

## Run

```bash
bun run dev      # generate + watch server
bun run start    # run server once
```

Server endpoints (default `http://localhost:3100`):

- RPC: `/srpc`
- Docs: `/docs`
- Contract API: `/api/contracts`

## SRPC CLI

This app uses `srpc-cli` with **package** as the primary unit for contract work.

```bash
# Regenerate TypeScript types from local contracts
bun run generate

# List packages on the running server
bun run contracts:list

# Pull all packages into ./contract
bun run contracts:pull

# Pull one package
bun run contracts:get -- user --dir ./contract

# Push all local packages to the server
bun run contracts:push

# Push one package (reads ./contract/user.ctr by default)
bun run contracts:push -- user --dir ./contract

# Validate a package against the remote contract workspace
bun run contracts:validate -- user --dir ./contract
```

Set `SRPC_URL` (default `http://localhost:3100`) to target another SRPC server.

## Upload example code

Programmatic upload examples live in `contracts/`:

```bash
# Start the server first
bun run dev

# Upload demo.ctr using the srpc-cli client
bun run contracts:upload-example

# Same flow with raw fetch (no client helper)
bun run contracts:upload-fetch

# Same flow with axios
bun run contracts:upload-axios
```

| File | What it shows |
|------|----------------|
| `contracts/upload.ts` | `createContractsClient` — validate, create/update |
| `contracts/upload-fetch.ts` | Raw `fetch` to `/api/contracts` |
| `contracts/upload-axios.ts` | `axios` upload script (Node — reads file from disk) |
| `contracts/upload-axios.browser.ts` | Browser `File` upload with axios |
| `contracts/upload-contract-client.ts` | Shared `uploadContractFile(file)` helper |
| `contract-samples/demo.ctr` | Sample package uploaded by the scripts |

Quick CLI equivalent:

```bash
srpc package create demo --file contract-samples/demo.ctr
# or update if it already exists:
srpc package update demo --file contract-samples/demo.ctr
```

## Contract domains

| File | Package | Description |
|------|---------|-------------|
| `common.ctr` | `common` | Money, address, pagination, shared types |
| `catalog.ctr` | `catalog` | Products, categories, brands |
| `user.ctr` | `user` | Users, auth, addresses |
| `cart.ctr` | `cart` | Shopping cart & coupons |
| `order.ctr` | `order` | Checkout, orders, fulfillment |
| `payment.ctr` | `payment` | Payments, methods, refunds |
| `shipping.ctr` | `shipping` | Shipping methods, shipments, tracking |
| `inventory.ctr` | `inventory` | Warehouses, stock levels, reservations |
| `promotion.ctr` | `promotion` | Coupons & promotions |
| `review.ctr` | `review` | Product reviews & ratings |
| `wishlist.ctr` | `wishlist` | Customer wishlists |
| `notification.ctr` | `notification` | Email, SMS, push, in-app |
| `analytics.ctr` | `analytics` | Dashboard & reports |

## Layout

```
contract/          # .ctr service definitions
generated/         # srpc-core codegen output
services/user.ts   # server handlers (defineService)
rpc/user.ts        # typed client (createServiceClient)
index.ts           # Express app entry
```
