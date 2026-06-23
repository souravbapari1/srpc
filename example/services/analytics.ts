import { defineService } from "srpc-core/rpc";
import { AnalyticsService, ReportService } from "../generated/srpc-types.ts";
import { money, empty } from "./helpers.ts";
import { store } from "./store.ts";

export const analyticsService = defineService(AnalyticsService, {
  getDashboard() {
    const orders = [...store.orders.values()];
    const revenue = orders.reduce((sum, order) => sum + order.totals.grandTotal.amount, 0);
    const products = [...store.products.values()];

    return {
      sales: {
        totalRevenue: money(revenue || 2999),
        totalOrders: orders.length || 1,
        averageOrderValue: money(orders.length ? Math.floor(revenue / orders.length) : 2999),
        conversionRate: 0.032,
        returningCustomerRate: 0.18,
      },
      topProducts: products.slice(0, 5).map(product => ({
        productId: product.id,
        title: product.title,
        unitsSold: 12,
        revenue: money(product.variants[0]?.price.amount ?? 0),
      })),
      topCategories: [...store.categories.values()].map(category => ({
        categoryId: category.id,
        name: category.name,
        revenue: money(12000),
        orderCount: 8,
      })),
      customers: {
        newCustomers: store.users.size,
        activeCustomers: [...store.users.values()].filter(user => user.status === "ACTIVE").length,
        churnedCustomers: 0,
      },
      lowStockCount: [...store.stock.values()].filter(level => level.quantityAvailable <= level.reorderPoint).length,
      pendingOrders: orders.filter(order => order.status === "PENDING").length,
      pendingReviews: [...store.reviews.values()].filter(review => review.status === "PENDING").length,
    };
  },

  getRevenueReport({ dateRange }) {
    void dateRange;
    return {
      points: [
        { label: "Mon", revenue: money(4200), orderCount: 3 },
        { label: "Tue", revenue: money(5100), orderCount: 4 },
        { label: "Wed", revenue: money(3800), orderCount: 2 },
      ],
      total: money(13100),
    };
  },

  getTopProducts() {
    return [...store.products.values()].map(product => ({
      productId: product.id,
      title: product.title,
      unitsSold: 10,
      revenue: money(product.variants[0]?.price.amount ?? 0),
    }));
  },

  getCustomerStats() {
    return {
      newCustomers: store.users.size,
      activeCustomers: store.users.size,
      churnedCustomers: 0,
    };
  },
});

export const reportService = defineService(ReportService, {
  exportOrders() {
    return empty();
  },

  exportInventory() {
    return empty();
  },

  exportCustomers() {
    return empty();
  },
});
