# example

SRPC e-commerce example — contracts, codegen, server, and client.

## Setup

```bash
bun install
bun run generate
```

## Run

```bash
bun run start
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
