import { defineService } from "srpc-core/rpc";
import { PaymentMethodService, PaymentService } from "../generated/srpc-types.ts";
import {
  PaymentTransactionStatus,
  RefundStatus,
} from "../generated/srpc-types.ts";
import { empty, money, nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { store } from "./store.ts";

export const paymentService = defineService(PaymentService, {
  authorize({ orderId, methodId, amount }) {
    const order = requireEntity(store.orders.get(orderId), "Order", orderId);
    const payment = {
      id: nextId("payment"),
      orderId,
      userId: order.userId,
      methodId,
      amount,
      status: PaymentTransactionStatus.AUTHORIZED,
      gatewayReference: `gw-${Date.now()}`,
      authorizedAt: now(),
      createdAt: now(),
    };
    store.payments.set(payment.id, payment);
    return payment;
  },

  capture({ paymentId, amount }) {
    const payment = requireEntity(store.payments.get(paymentId), "Payment", paymentId);
    payment.status = PaymentTransactionStatus.CAPTURED;
    payment.capturedAt = now();
    if (amount) {
      payment.amount = amount;
    }
    return payment;
  },

  voidPayment({ id }) {
    const payment = requireEntity(store.payments.get(id), "Payment", id);
    payment.status = PaymentTransactionStatus.VOIDED;
    return payment;
  },

  getPayment({ id }) {
    return requireEntity(store.payments.get(id), "Payment", id);
  },

  listPayments({ pagination, userId, orderId, status }) {
    const all = [...store.payments.values()].filter(payment => {
      if (userId && payment.userId !== userId) {
        return false;
      }
      if (orderId && payment.orderId !== orderId) {
        return false;
      }
      if (status && payment.status !== status) {
        return false;
      }
      return true;
    });

    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  createRefund({ paymentId, amount, reason }) {
    const payment = requireEntity(store.payments.get(paymentId), "Payment", paymentId);
    const refund = {
      id: nextId("refund"),
      paymentId,
      orderId: payment.orderId,
      amount,
      status: RefundStatus.COMPLETED,
      reason,
      processedAt: now(),
      createdAt: now(),
    };
    store.refunds.set(refund.id, refund);
    payment.status = PaymentTransactionStatus.REFUNDED;
    return refund;
  },

  getRefund({ id }) {
    return requireEntity(store.refunds.get(id), "Refund", id);
  },
});

export const paymentMethodService = defineService(PaymentMethodService, {
  listMethods({ id: userId }) {
    const all = [...store.paymentMethods.values()].filter(method => method.userId === userId);
    return {
      items: all,
      meta: paginationMeta({ page: 1, pageSize: all.length || 1 }, all.length),
    };
  },

  addMethod(data) {
    const method = {
      id: nextId("pm"),
      userId: data.userId,
      type: data.type,
      label: data.label,
      last4: data.token.slice(-4),
      isDefault: data.isDefault ?? false,
      createdAt: now(),
    };
    if (method.isDefault) {
      for (const existing of store.paymentMethods.values()) {
        if (existing.userId === data.userId) {
          existing.isDefault = false;
        }
      }
    }
    store.paymentMethods.set(method.id, method);
    return method;
  },

  removeMethod({ id }) {
    store.paymentMethods.delete(id);
    return empty();
  },

  setDefaultMethod({ id }) {
    const method = requireEntity(store.paymentMethods.get(id), "Payment method", id);
    for (const existing of store.paymentMethods.values()) {
      existing.isDefault = existing.userId === method.userId && existing.id === id;
    }
    return method;
  },
});
