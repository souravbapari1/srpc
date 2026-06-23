import type { EmptyResponse, Money, PaginationMeta, PaginationRequest } from "../generated/srpc-types.ts";
import { CurrencyCode } from "../generated/srpc-types.ts";

let idSeq = 0;

export function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function now(): Date {
  return new Date();
}

export function money(amount: number, currency: CurrencyCode = CurrencyCode.USD): Money {
  return { amount, currency };
}

export function empty(): EmptyResponse {
  return { success: true };
}

export function paginate<T>(items: T[], pagination: PaginationRequest): T[] {
  const start = (pagination.page - 1) * pagination.pageSize;
  return items.slice(start, start + pagination.pageSize);
}

export function paginationMeta(
  pagination: PaginationRequest,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / pagination.pageSize));
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalItems,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}

export function requireEntity<T>(entity: T | undefined, name: string, id: string): T {
  if (!entity) {
    throw new Error(`${name} not found: ${id}`);
  }

  return entity;
}
