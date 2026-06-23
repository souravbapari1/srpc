import { defineService } from "srpc-core/rpc";
import { WishlistService } from "../generated/srpc-types.ts";
import { empty, nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { getCart, getProduct, store } from "./store.ts";

export const wishlistService = defineService(WishlistService, {
  listWishlists({ pagination, userId }) {
    const all = [...store.wishlists.values()].filter(wishlist => wishlist.userId === userId);
    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  getWishlist({ id }) {
    return requireEntity(store.wishlists.get(id), "Wishlist", id);
  },

  createWishlist({ userId, name, isPublic }) {
    const timestamp = now();
    const wishlist = {
      id: nextId("wishlist"),
      userId,
      name,
      isDefault: false,
      isPublic: isPublic ?? false,
      items: [],
      itemCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.wishlists.set(wishlist.id, wishlist);
    return wishlist;
  },

  addItem({ wishlistId, productId, variantId }) {
    const wishlist = requireEntity(store.wishlists.get(wishlistId), "Wishlist", wishlistId);
    const product = requireEntity(getProduct(productId), "Product", productId);
    const variant = variantId
      ? product.variants.find(item => item.id === variantId)
      : product.variants.find(item => item.isDefault) ?? product.variants[0];

    wishlist.items.push({
      id: nextId("wish-item"),
      productId,
      variantId: variant?.id,
      title: product.title,
      imageUrl: product.images[0]?.url,
      price: variant?.price ?? product.variants[0]!.price,
      addedAt: now(),
    });
    wishlist.itemCount = wishlist.items.length;
    wishlist.updatedAt = now();
    return wishlist;
  },

  removeItem({ wishlistId, itemId }) {
    const wishlist = requireEntity(store.wishlists.get(wishlistId), "Wishlist", wishlistId);
    wishlist.items = wishlist.items.filter(item => item.id !== itemId);
    wishlist.itemCount = wishlist.items.length;
    wishlist.updatedAt = now();
    return wishlist;
  },

  moveItemToCart({ wishlistId, itemId, cartId }) {
    const wishlist = requireEntity(store.wishlists.get(wishlistId), "Wishlist", wishlistId);
    const item = requireEntity(wishlist.items.find(entry => entry.id === itemId), "Wishlist item", itemId);
    const cart = cartId ? requireEntity(store.carts.get(cartId), "Cart", cartId) : getCart();

    if (item.variantId) {
      const product = requireEntity(getProduct(item.productId), "Product", item.productId);
      const variant = requireEntity(
        product.variants.find(entry => entry.id === item.variantId),
        "Variant",
        item.variantId
      );
      cart.items.push({
        id: nextId("cart-item"),
        productId: item.productId,
        variantId: item.variantId,
        sku: variant.sku,
        title: item.title,
        quantity: 1,
        unitPrice: variant.price,
        lineTotal: variant.price,
        imageUrl: item.imageUrl,
        attributes: variant.attributes,
        addedAt: now(),
      });
    }

    wishlist.items = wishlist.items.filter(entry => entry.id !== itemId);
    wishlist.itemCount = wishlist.items.length;
    wishlist.updatedAt = now();
    cart.updatedAt = now();
    return cart;
  },

  deleteWishlist({ id }) {
    store.wishlists.delete(id);
    return empty();
  },
});
