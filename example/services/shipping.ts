import { defineService } from "srpc-core/rpc";
import { ShippingService } from "../generated/srpc-types.ts";
import { ShipmentStatus } from "../generated/srpc-types.ts";
import { nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { store } from "./store.ts";

export const shippingService = defineService(ShippingService, {
  listMethods(pagination) {
    const all = [...store.shippingMethods.values()];
    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  quoteShipping({ methodIds, address }) {
    void address;
    const methods = methodIds?.length
      ? methodIds
          .map(id => store.shippingMethods.get(id))
          .filter((method): method is NonNullable<typeof method> => Boolean(method))
      : [...store.shippingMethods.values()];

    const quotes = methods.map(method => {
      const delivery = new Date();
      delivery.setDate(delivery.getDate() + method.estimatedDaysMax);
      return {
        methodId: method.id,
        methodName: method.name,
        price: method.basePrice,
        estimatedDeliveryAt: delivery,
      };
    });

    return { quotes };
  },

  createShipment({ orderId, methodId, itemIds }) {
    const order = requireEntity(store.orders.get(orderId), "Order", orderId);
    const timestamp = now();
    const shipment = {
      id: nextId("shipment"),
      orderId,
      methodId,
      status: ShipmentStatus.LABEL_CREATED,
      trackingNumber: `TRK-${Date.now()}`,
      carrier: "DemoCarrier",
      items: order.items
        .filter(item => itemIds.includes(item.id))
        .map(item => ({
          orderItemId: item.id,
          quantity: item.quantity,
          sku: item.sku,
        })),
      events: [
        {
          id: nextId("tracking"),
          status: ShipmentStatus.LABEL_CREATED,
          message: "Label created",
          occurredAt: timestamp,
        },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.shipments.set(shipment.id, shipment);
    return shipment;
  },

  getShipment({ id }) {
    return requireEntity(store.shipments.get(id), "Shipment", id);
  },

  listShipments({ pagination, orderId, status }) {
    const all = [...store.shipments.values()].filter(shipment => {
      if (orderId && shipment.orderId !== orderId) {
        return false;
      }
      if (status && shipment.status !== status) {
        return false;
      }
      return true;
    });

    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  updateShipmentStatus({ shipmentId, status, message, location }) {
    const shipment = requireEntity(store.shipments.get(shipmentId), "Shipment", shipmentId);
    shipment.status = status;
    shipment.updatedAt = now();
    if (status === ShipmentStatus.IN_TRANSIT) {
      shipment.shippedAt = now();
    }
    if (status === ShipmentStatus.DELIVERED) {
      shipment.deliveredAt = now();
    }
    shipment.events.push({
      id: nextId("tracking"),
      status,
      message: message ?? `Status updated to ${status}`,
      location,
      occurredAt: now(),
    });
    return shipment;
  },

  trackShipment({ id }) {
    return requireEntity(store.shipments.get(id), "Shipment", id);
  },
});
