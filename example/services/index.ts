import { analyticsService, reportService } from "./analytics.ts";
import { cartService } from "./cart.ts";
import { brandService, categoryService, productService } from "./catalog.ts";
import { inventoryService } from "./inventory.ts";
import { notificationService } from "./notification.ts";
import { orderService } from "./order.ts";
import { paymentMethodService, paymentService } from "./payment.ts";
import { couponService, promotionService } from "./promotion.ts";
import { reviewService } from "./review.ts";
import { shippingService } from "./shipping.ts";
import { authService, userService } from "./user.ts";
import { wishlistService } from "./wishlist.ts";

export default [
  analyticsService,
  reportService,
  cartService,
  productService,
  categoryService,
  brandService,
  inventoryService,
  notificationService,
  orderService,
  paymentService,
  paymentMethodService,
  couponService,
  promotionService,
  reviewService,
  shippingService,
  userService,
  authService,
  wishlistService,
];

export {
  analyticsService,
  reportService,
  cartService,
  productService,
  categoryService,
  brandService,
  inventoryService,
  notificationService,
  orderService,
  paymentService,
  paymentMethodService,
  couponService,
  promotionService,
  reviewService,
  shippingService,
  userService,
  authService,
  wishlistService,
};
