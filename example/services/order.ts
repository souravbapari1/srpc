import { defineService } from "srpc-core/rpc";
import { OrderService } from "../generated/srpc-types.ts";
import {
  FulfillmentStatus,
  OrderPaymentStatus,
  OrderStatus,
} from "../generated/srpc-types.ts";
import { money, nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { getCart, recalcCartTotals, store } from "./store.ts";

function buildOrderFromCart(
  cartId: string,
  userId: string,
  shippingAddressId: string,
  billingAddressId: string,
  shippingMethodId: string,
  notes?: string
) {
  const cart = requireEntity(store.carts.get(cartId), "Cart", cartId);
  const user = requireEntity(store.users.get(userId), "User", userId);
  const shippingAddress = requireEntity(
    user.addresses.find(address => address.id === shippingAddressId),
    "Address",
    shippingAddressId
  );
  const billingAddress = requireEntity(
    user.addresses.find(address => address.id === billingAddressId),
    "Address",
    billingAddressId
  );
  const shippingMethod = requireEntity(store.shippingMethods.get(shippingMethodId), "Shipping method", shippingMethodId);
  const totals = recalcCartTotals(cart);
  const timestamp = now();

  const order = {
    id: nextId("order"),
    orderNumber: `ORD-${Date.now()}`,
    userId,
    status: OrderStatus.PENDING,
    paymentStatus: OrderPaymentStatus.PENDING,
    fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
    items: cart.items.map(item => ({
      id: nextId("order-item"),
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: money(0),
      taxAmount: money(Math.floor(item.lineTotal.amount * 0.08)),
      lineTotal: item.lineTotal,
      imageUrl: item.imageUrl,
      fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
    })),
    totals: {
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      shippingTotal: shippingMethod.basePrice,
      grandTotal: money(totals.grandTotal.amount + shippingMethod.basePrice.amount - totals.shippingTotal.amount),
    },
    addresses: { shipping: shippingAddress, billing: billingAddress },
    couponCode: cart.couponCode,
    notes,
    timeline: [
      {
        id: nextId("timeline"),
        status: OrderStatus.PENDING,
        message: "Order placed",
        createdAt: timestamp,
      },
    ],
    placedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.orders.set(order.id, order);
  return order;
}

export const orderService = defineService(OrderService, {
  checkout(data) {
    const cart = requireEntity(store.carts.get(data.cartId), "Cart", data.cartId);
    const userId = requireEntity(cart.userId, "User", "anonymous");
    return buildOrderFromCart(
      data.cartId,
      userId,
      data.shippingAddressId,
      data.billingAddressId,
      data.shippingMethodId,
      data.notes
    );
  },

  getOrder({ id }) {
    return requireEntity(store.orders.get(id), "Order", id);
  },

  listOrders({ pagination, userId, status, paymentStatus, orderNumber }) {
    const all = [...store.orders.values()].filter(order => {
      if (userId && order.userId !== userId) {
        return false;
      }
      if (status && order.status !== status) {
        return false;
      }
      if (paymentStatus && order.paymentStatus !== paymentStatus) {
        return false;
      }
      if (orderNumber && order.orderNumber !== orderNumber) {
        return false;
      }
      return true;
    });

    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  updateOrderStatus({ orderId, status, message }) {
    const order = requireEntity(store.orders.get(orderId), "Order", orderId);
    order.status = status;
    order.updatedAt = now();
    order.timeline.push({
      id: nextId("timeline"),
      status,
      message: message ?? `Status updated to ${status}`,
      createdAt: now(),
    });
    return order;
  },

  cancelOrder({ orderId, reason }) {
    const order = requireEntity(store.orders.get(orderId), "Order", orderId);
    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = now();
    order.updatedAt = now();
    order.timeline.push({
      id: nextId("timeline"),
      status: OrderStatus.CANCELLED,
      message: reason,
      createdAt: now(),
    });
    return order;
  },

  reorder({ id }) {
    const order = requireEntity(store.orders.get(id), "Order", id);
    const cart = getCart(undefined, undefined);
    cart.userId = order.userId;
    for (const item of order.items) {
      cart.items.push({
        id: nextId("cart-item"),
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        imageUrl: item.imageUrl,
        attributes: {},
        addedAt: now(),
      });
    }
    cart.totals = recalcCartTotals(cart);
    store.carts.set(cart.id, cart);

    const addressId = order.addresses.shipping.id ?? "addr-1";
    return {
      cartId: cart.id,
      shippingAddressId: addressId,
      billingAddressId: order.addresses.billing.id ?? addressId,
      shippingMethodId: "ship-standard",
      paymentMethodId: "pm-1",
    };
  },

  getOrderTimeline({ id }) {
    const order = requireEntity(store.orders.get(id), "Order", id);
    return { events: order.timeline };
  },
});
