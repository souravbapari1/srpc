import { defineService } from "srpc-core/rpc";
import { CouponService, PromotionService } from "../generated/srpc-types.ts";
import { CouponStatus, DiscountType } from "../generated/srpc-types.ts";
import { empty, money, nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { getCart, recalcCartTotals, store } from "./store.ts";

export const couponService = defineService(CouponService, {
  validateCoupon({ code, cartId }) {
    const coupon = [...store.coupons.values()].find(item => item.code === code);
    if (!coupon || coupon.status !== CouponStatus.ACTIVE) {
      return { valid: false, message: "Invalid coupon" };
    }

    const cart = requireEntity(store.carts.get(cartId), "Cart", cartId);
    const totals = recalcCartTotals(cart);
    let discountAmount = 0;

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = Math.floor(totals.subtotal.amount * (coupon.discountValue / 100));
    } else if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
      discountAmount = coupon.discountValue;
    }

    return {
      valid: true,
      coupon,
      discountAmount: money(discountAmount),
    };
  },

  getCoupon({ id }) {
    return requireEntity(store.coupons.get(id), "Coupon", id);
  },

  listCoupons({ pagination, status, query }) {
    const all = [...store.coupons.values()].filter(coupon => {
      if (status && coupon.status !== status) {
        return false;
      }
      if (query && !coupon.code.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });

    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  createCoupon(data) {
    const coupon = {
      id: nextId("coupon"),
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      status: CouponStatus.ACTIVE,
      minOrderAmount: data.minOrderAmount,
      usageLimit: data.usageLimit,
      usageCount: 0,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      createdAt: now(),
    };
    store.coupons.set(coupon.id, coupon);
    return coupon;
  },

  updateCoupon(data) {
    const existing = [...store.coupons.values()].find(coupon => coupon.code === data.code);
    if (!existing) {
      const coupon = {
        id: nextId("coupon"),
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        status: CouponStatus.ACTIVE,
        minOrderAmount: data.minOrderAmount,
        usageLimit: data.usageLimit,
        usageCount: 0,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        createdAt: now(),
      };
      store.coupons.set(coupon.id, coupon);
      return coupon;
    }

    Object.assign(existing, {
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount,
      usageLimit: data.usageLimit,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    });
    return existing;
  },

  deleteCoupon({ id }) {
    store.coupons.delete(id);
    return empty();
  },
});

export const promotionService = defineService(PromotionService, {
  listPromotions(pagination) {
    const all = [...store.promotions.values()];
    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  getPromotion({ id }) {
    return requireEntity(store.promotions.get(id), "Promotion", id);
  },

  createPromotion(data) {
    const promotion = {
      id: nextId("promo"),
      name: data.name,
      target: data.target,
      targetIds: data.targetIds,
      discountType: data.discountType,
      discountValue: data.discountValue,
      isActive: true,
      priority: data.priority ?? 1,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      createdAt: now(),
    };
    store.promotions.set(promotion.id, promotion);
    return promotion;
  },

  updatePromotion(data) {
    const existing = [...store.promotions.values()].find(promotion => promotion.name === data.name);
    if (!existing) {
      const promotion = {
        id: nextId("promo"),
        name: data.name,
        target: data.target,
        targetIds: data.targetIds,
        discountType: data.discountType,
        discountValue: data.discountValue,
        isActive: true,
        priority: data.priority ?? 1,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        createdAt: now(),
      };
      store.promotions.set(promotion.id, promotion);
      return promotion;
    }

    Object.assign(existing, {
      target: data.target,
      targetIds: data.targetIds,
      discountType: data.discountType,
      discountValue: data.discountValue,
      priority: data.priority ?? existing.priority,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    });
    return existing;
  },

  deletePromotion({ id }) {
    store.promotions.delete(id);
    return empty();
  },

  getActivePromotions() {
    const all = [...store.promotions.values()].filter(promotion => promotion.isActive);
    return {
      items: all,
      meta: paginationMeta({ page: 1, pageSize: all.length || 1 }, all.length),
    };
  },
});
