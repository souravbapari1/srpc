import { defineService } from "srpc-core/rpc";
import { CartService } from "../generated/srpc-types.ts";
import { CartStatus } from "../generated/srpc-types.ts";
import { empty, nextId, now, requireEntity } from "./helpers.ts";
import { getCart, getProduct, recalcCartTotals, store } from "./store.ts";

function touchCart(cartId: string) {
  const cart = requireEntity(store.carts.get(cartId), "Cart", cartId);
  cart.updatedAt = now();
  cart.totals = recalcCartTotals(cart);
  return cart;
}

export const cartService = defineService(CartService, {
  getCart({ cartId, sessionId }) {
    return getCart(cartId, sessionId);
  },

  addItem({ cartId, sessionId, productId, variantId, quantity }) {
    const cart = cartId ? requireEntity(store.carts.get(cartId), "Cart", cartId) : getCart(undefined, sessionId);
    const product = requireEntity(getProduct(productId), "Product", productId);
    const variant = requireEntity(
      product.variants.find(item => item.id === variantId),
      "Variant",
      variantId
    );

    const existing = cart.items.find(item => item.variantId === variantId);
    if (existing) {
      existing.quantity += quantity;
      existing.lineTotal = { ...variant.price, amount: variant.price.amount * existing.quantity };
    } else {
      cart.items.push({
        id: nextId("cart-item"),
        productId,
        variantId,
        sku: variant.sku,
        title: `${product.title} - ${variant.title}`,
        quantity,
        unitPrice: variant.price,
        lineTotal: { ...variant.price, amount: variant.price.amount * quantity },
        imageUrl: product.images[0]?.url,
        attributes: variant.attributes,
        addedAt: now(),
      });
    }

    cart.updatedAt = now();
    cart.totals = recalcCartTotals(cart);
    store.carts.set(cart.id, cart);
    return cart;
  },

  updateItem({ cartId, itemId, quantity }) {
    const cart = touchCart(cartId);
    const item = requireEntity(cart.items.find(entry => entry.id === itemId), "Cart item", itemId);
    item.quantity = quantity;
    item.lineTotal = { ...item.unitPrice, amount: item.unitPrice.amount * quantity };
    cart.totals = recalcCartTotals(cart);
    return cart;
  },

  removeItem({ cartId, itemId }) {
    const cart = touchCart(cartId);
    cart.items = cart.items.filter(item => item.id !== itemId);
    cart.totals = recalcCartTotals(cart);
    return cart;
  },

  clearCart({ id }) {
    const cart = touchCart(id);
    cart.items = [];
    cart.couponCode = undefined;
    cart.totals = recalcCartTotals(cart);
    return cart;
  },

  applyCoupon({ cartId, couponCode }) {
    const cart = touchCart(cartId);
    const coupon = [...store.coupons.values()].find(item => item.code === couponCode);
    if (!coupon) {
      throw new Error(`Coupon not found: ${couponCode}`);
    }
    cart.couponCode = couponCode;
    cart.totals = recalcCartTotals(cart);
    return cart;
  },

  removeCoupon({ id }) {
    const cart = touchCart(id);
    cart.couponCode = undefined;
    cart.totals = recalcCartTotals(cart);
    return cart;
  },

  mergeCart({ sessionCartId, userId }) {
    const sessionCart = requireEntity(store.carts.get(sessionCartId), "Cart", sessionCartId);
    let userCart = [...store.carts.values()].find(cart => cart.userId === userId && cart.status === CartStatus.ACTIVE);
    if (!userCart) {
      userCart = getCart(undefined, undefined);
      userCart.userId = userId;
    }

    for (const item of sessionCart.items) {
      const existing = userCart.items.find(entry => entry.variantId === item.variantId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.lineTotal = { ...existing.unitPrice, amount: existing.unitPrice.amount * existing.quantity };
      } else {
        userCart.items.push({ ...item, id: nextId("cart-item") });
      }
    }

    sessionCart.status = CartStatus.MERGED;
    userCart.updatedAt = now();
    userCart.totals = recalcCartTotals(userCart);
    store.carts.set(userCart.id, userCart);
    return userCart;
  },

  estimateTotals({ id }) {
    const cart = requireEntity(store.carts.get(id), "Cart", id);
    return recalcCartTotals(cart);
  },
});
