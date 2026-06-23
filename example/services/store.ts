import type {
  Address,
  Brand,
  Cart,
  CartItem,
  CartTotals,
  Category,
  Coupon,
  Notification,
  Order,
  PaymentMethod,
  PaymentTransaction,
  Product,
  ProductVariant,
  Promotion,
  Refund,
  Review,
  Shipment,
  ShippingMethod,
  StockLevel,
  StockMovement,
  User,
  Warehouse,
  Wishlist,
} from "../generated/srpc-types.ts";
import {
  CartStatus,
  CouponStatus,
  CurrencyCode,
  DiscountType,
  FulfillmentStatus,
  NotificationChannel,
  NotificationStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethodType,
  PaymentTransactionStatus,
  ProductStatus,
  ProductVisibility,
  PromotionTarget,
  RefundStatus,
  ReviewStatus,
  ShipmentStatus,
  ShippingRateType,
  UserRole,
  UserStatus,
} from "../generated/srpc-types.ts";
import { money, nextId, now } from "./helpers.ts";

export const store = {
  users: new Map<string, User>(),
  products: new Map<string, Product>(),
  categories: new Map<string, Category>(),
  brands: new Map<string, Brand>(),
  carts: new Map<string, Cart>(),
  orders: new Map<string, Order>(),
  payments: new Map<string, PaymentTransaction>(),
  refunds: new Map<string, Refund>(),
  paymentMethods: new Map<string, PaymentMethod>(),
  coupons: new Map<string, Coupon>(),
  promotions: new Map<string, Promotion>(),
  reviews: new Map<string, Review>(),
  shipments: new Map<string, Shipment>(),
  shippingMethods: new Map<string, ShippingMethod>(),
  warehouses: new Map<string, Warehouse>(),
  stock: new Map<string, StockLevel>(),
  movements: [] as StockMovement[],
  notifications: new Map<string, Notification>(),
  wishlists: new Map<string, Wishlist>(),
};

const defaultAddress = (): Address => ({
  id: "addr-1",
  label: "Home",
  line1: "123 Market St",
  city: "San Francisco",
  state: "CA",
  postalCode: "94105",
  country: "US",
  isDefault: true,
});

export function defaultUser(id = "user-1"): User {
  const timestamp = now();
  return {
    id,
    email: `${id}@example.com`,
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    profile: {
      firstName: "Jane",
      lastName: "Doe",
      displayName: "Jane Doe",
    },
    preferences: {
      locale: "en-US",
      currency: CurrencyCode.USD,
      marketingEmails: false,
      smsNotifications: false,
      pushNotifications: true,
    },
    addresses: [defaultAddress()],
    defaultAddressId: "addr-1",
    favoriteProductIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function seedProduct(): Product {
  const timestamp = now();
  const variant: ProductVariant = {
    id: "variant-1",
    sku: "TEE-BLK-M",
    title: "Black / M",
    price: money(2999),
    attributes: { color: "black", size: "M" },
    imageIds: ["img-1"],
    isDefault: true,
  };

  return {
    id: "product-1",
    slug: "classic-tee",
    title: "Classic Tee",
    description: "Soft cotton everyday tee.",
    shortDescription: "Everyday cotton tee",
    brandId: "brand-1",
    categoryIds: ["category-1"],
    tags: ["apparel", "basics"],
    status: ProductStatus.ACTIVE,
    visibility: ProductVisibility.PUBLIC,
    variants: [variant],
    images: [
      {
        id: "img-1",
        url: "https://example.com/tee.jpg",
        alt: "Classic tee",
      },
    ],
    publishedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function seedCategory(): Category {
  const timestamp = now();
  return {
    id: "category-1",
    slug: "apparel",
    name: "Apparel",
    description: "Clothing and accessories",
    sortOrder: 1,
    isActive: true,
    productCount: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function seedBrand(): Brand {
  const timestamp = now();
  return {
    id: "brand-1",
    slug: "srpc-wear",
    name: "SRPC Wear",
    description: "Demo brand",
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function seedCoupon(): Coupon {
  return {
    id: "coupon-1",
    code: "SAVE10",
    description: "10% off",
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    status: CouponStatus.ACTIVE,
    minOrderAmount: money(2000),
    usageCount: 0,
    createdAt: now(),
  };
}

function seedPromotion(): Promotion {
  return {
    id: "promo-1",
    name: "Spring Sale",
    target: PromotionTarget.CART,
    targetIds: [],
    discountType: DiscountType.PERCENTAGE,
    discountValue: 15,
    isActive: true,
    priority: 1,
    createdAt: now(),
  };
}

function seedShippingMethod(): ShippingMethod {
  return {
    id: "ship-standard",
    code: "STANDARD",
    name: "Standard Shipping",
    rateType: ShippingRateType.FLAT,
    basePrice: money(599),
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    isActive: true,
    supportedCountries: ["US"],
  };
}

function seedWarehouse(): Warehouse {
  return {
    id: "warehouse-1",
    code: "SF-01",
    name: "San Francisco Warehouse",
    address: defaultAddress(),
    isActive: true,
    createdAt: now(),
  };
}

function seedStock(): StockLevel {
  return {
    id: "stock-1",
    warehouseId: "warehouse-1",
    productId: "product-1",
    variantId: "variant-1",
    sku: "TEE-BLK-M",
    quantityOnHand: 100,
    quantityReserved: 0,
    quantityAvailable: 100,
    reorderPoint: 10,
    updatedAt: now(),
  };
}

function seedReview(): Review {
  const timestamp = now();
  return {
    id: "review-1",
    productId: "product-1",
    userId: "user-1",
    rating: 5,
    title: "Great tee",
    body: "Comfortable and fits well.",
    status: ReviewStatus.APPROVED,
    helpfulCount: 2,
    images: [],
    verifiedPurchase: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function seedWishlist(): Wishlist {
  const timestamp = now();
  return {
    id: "wishlist-1",
    userId: "user-1",
    name: "Favorites",
    isDefault: true,
    isPublic: false,
    items: [
      {
        id: "wish-1",
        productId: "product-1",
        variantId: "variant-1",
        title: "Classic Tee",
        price: money(2999),
        addedAt: timestamp,
      },
    ],
    itemCount: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function seedPaymentMethod(): PaymentMethod {
  return {
    id: "pm-1",
    userId: "user-1",
    type: PaymentMethodType.CARD,
    label: "Visa ending 4242",
    last4: "4242",
    brand: "visa",
    expiryMonth: 12,
    expiryYear: 2028,
    isDefault: true,
    createdAt: now(),
  };
}

export function recalcCartTotals(cart: Cart): CartTotals {
  const subtotal = cart.items.reduce((sum, item) => sum + item.lineTotal.amount, 0);
  const discountTotal = cart.couponCode === "SAVE10" ? Math.floor(subtotal * 0.1) : 0;
  const taxTotal = Math.floor((subtotal - discountTotal) * 0.08);
  const shippingTotal = cart.items.length > 0 ? 599 : 0;
  const grandTotal = subtotal - discountTotal + taxTotal + shippingTotal;

  return {
    subtotal: money(subtotal),
    discountTotal: money(discountTotal),
    taxTotal: money(taxTotal),
    shippingTotal: money(shippingTotal),
    grandTotal: money(grandTotal),
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function createEmptyCart(id?: string, userId?: string, sessionId?: string): Cart {
  const timestamp = now();
  const cart: Cart = {
    id: id ?? nextId("cart"),
    userId,
    sessionId,
    status: CartStatus.ACTIVE,
    items: [],
    totals: money(0) as unknown as CartTotals,
    currency: CurrencyCode.USD,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  cart.totals = recalcCartTotals(cart);
  store.carts.set(cart.id, cart);
  return cart;
}

export function getProduct(id: string): Product | undefined {
  return store.products.get(id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return [...store.products.values()].find(product => product.slug === slug);
}

export function getCart(cartId?: string, sessionId?: string): Cart {
  if (cartId) {
    const cart = store.carts.get(cartId);
    if (cart) {
      return cart;
    }
  }

  if (sessionId) {
    const cart = [...store.carts.values()].find(item => item.sessionId === sessionId);
    if (cart) {
      return cart;
    }
  }

  return createEmptyCart(undefined, undefined, sessionId);
}

let seeded = false;

export function ensureSeeded(): void {
  if (seeded) {
    return;
  }

  seeded = true;

  const user = defaultUser();
  const product = seedProduct();

  store.users.set(user.id, user);
  store.products.set(product.id, product);
  store.categories.set("category-1", seedCategory());
  store.brands.set("brand-1", seedBrand());
  store.coupons.set("coupon-1", seedCoupon());
  store.promotions.set("promo-1", seedPromotion());
  store.shippingMethods.set("ship-standard", seedShippingMethod());
  store.warehouses.set("warehouse-1", seedWarehouse());
  store.stock.set("stock-1", seedStock());
  store.reviews.set("review-1", seedReview());
  store.wishlists.set("wishlist-1", seedWishlist());
  store.paymentMethods.set("pm-1", seedPaymentMethod());
  createEmptyCart("cart-1", "user-1");
}

ensureSeeded();
