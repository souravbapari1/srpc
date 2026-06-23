import { defineService } from "srpc-core/rpc";
import { InventoryService } from "../generated/srpc-types.ts";
import { StockMovementType } from "../generated/srpc-types.ts";
import { empty, nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { store } from "./store.ts";

function filterStock(request: {
  warehouseId?: string;
  productId?: string;
  variantId?: string;
  lowStockOnly?: boolean;
}) {
  return [...store.stock.values()].filter(level => {
    if (request.warehouseId && level.warehouseId !== request.warehouseId) {
      return false;
    }
    if (request.productId && level.productId !== request.productId) {
      return false;
    }
    if (request.variantId && level.variantId !== request.variantId) {
      return false;
    }
    if (request.lowStockOnly && level.quantityAvailable > level.reorderPoint) {
      return false;
    }
    return true;
  });
}

export const inventoryService = defineService(InventoryService, {
  getStock({ id }) {
    return requireEntity(store.stock.get(id), "Stock", id);
  },

  listStock({ pagination, ...filters }) {
    const all = filterStock(filters);
    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  adjustStock({ warehouseId, variantId, quantity, type, note }) {
    const level = [...store.stock.values()].find(
      item => item.warehouseId === warehouseId && item.variantId === variantId
    );
    const stock = requireEntity(level, "Stock", `${warehouseId}:${variantId}`);

    if (type === StockMovementType.INBOUND || type === StockMovementType.ADJUSTMENT) {
      stock.quantityOnHand += quantity;
    } else {
      stock.quantityOnHand -= quantity;
    }
    stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
    stock.updatedAt = now();

    store.movements.push({
      id: nextId("movement"),
      warehouseId,
      variantId,
      type,
      quantity,
      note,
      createdAt: now(),
    });

    return stock;
  },

  reserveStock({ orderId, items }) {
    const updated: typeof store.stock extends Map<string, infer T> ? T[] : never = [];

    for (const item of items) {
      const level = [...store.stock.values()].find(entry => entry.variantId === item.variantId);
      if (!level) {
        continue;
      }
      level.quantityReserved += item.quantity;
      level.quantityAvailable = level.quantityOnHand - level.quantityReserved;
      level.updatedAt = now();
      updated.push(level);

      store.movements.push({
        id: nextId("movement"),
        warehouseId: level.warehouseId,
        variantId: item.variantId,
        type: StockMovementType.RESERVATION,
        quantity: item.quantity,
        referenceId: orderId,
        createdAt: now(),
      });
    }

    return {
      items: updated,
      meta: paginationMeta({ page: 1, pageSize: updated.length || 1 }, updated.length),
    };
  },

  releaseStock({ orderId }) {
    for (const level of store.stock.values()) {
      const reservedForOrder = store.movements.filter(
        movement =>
          movement.referenceId === orderId && movement.type === StockMovementType.RESERVATION
      );
      const qty = reservedForOrder
        .filter(movement => movement.variantId === level.variantId)
        .reduce((sum, movement) => sum + movement.quantity, 0);
      if (qty > 0) {
        level.quantityReserved = Math.max(0, level.quantityReserved - qty);
        level.quantityAvailable = level.quantityOnHand - level.quantityReserved;
        level.updatedAt = now();
      }
    }
    return empty();
  },

  listWarehouses(pagination) {
    const all = [...store.warehouses.values()];
    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  getWarehouse({ id }) {
    return requireEntity(store.warehouses.get(id), "Warehouse", id);
  },

  listMovements({ pagination, warehouseId, variantId }) {
    const all = store.movements.filter(movement => {
      if (warehouseId && movement.warehouseId !== warehouseId) {
        return false;
      }
      if (variantId && movement.variantId !== variantId) {
        return false;
      }
      return true;
    });
    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },
});
