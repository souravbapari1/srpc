import { defineService } from "srpc-core/rpc";
import { BrandService, CategoryService, ProductService } from "../generated/srpc-types.ts";
import {
  ProductStatus,
  ProductVisibility,
} from "../generated/srpc-types.ts";
import { empty, money, nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { getProduct, getProductBySlug, store } from "./store.ts";

function filterProducts(request: {
  query?: string;
  categoryId?: string;
  brandId?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
}) {
  return [...store.products.values()].filter(product => {
    if (request.query && !product.title.toLowerCase().includes(request.query.toLowerCase())) {
      return false;
    }
    if (request.categoryId && !product.categoryIds.includes(request.categoryId)) {
      return false;
    }
    if (request.brandId && product.brandId !== request.brandId) {
      return false;
    }
    if (request.status && product.status !== request.status) {
      return false;
    }
    const price = product.variants[0]?.price.amount ?? 0;
    if (request.minPrice !== undefined && price < request.minPrice) {
      return false;
    }
    if (request.maxPrice !== undefined && price > request.maxPrice) {
      return false;
    }
    if (request.tags?.length && !request.tags.some(tag => product.tags.includes(tag))) {
      return false;
    }
    return true;
  });
}

export const productService = defineService(ProductService, {
  listProducts({ pagination, ...filters }) {
    const items = paginate(filterProducts(filters), pagination);
    const total = filterProducts(filters).length;
    return { items, meta: paginationMeta(pagination, total) };
  },

  getProduct({ id }) {
    return requireEntity(getProduct(id), "Product", id);
  },

  getProductBySlug({ slug }) {
    return requireEntity(getProductBySlug(slug), "Product", slug);
  },

  createProduct(data) {
    const timestamp = now();
    const product = {
      id: nextId("product"),
      slug: data.slug,
      title: data.title,
      description: data.description,
      brandId: data.brandId,
      categoryIds: data.categoryIds,
      tags: data.tags ?? [],
      status: ProductStatus.DRAFT,
      visibility: ProductVisibility.HIDDEN,
      variants: data.variants,
      images: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.products.set(product.id, product);
    return product;
  },

  updateProduct({ id, ...patch }) {
    const product = requireEntity(store.products.get(id), "Product", id);
    const updated = {
      ...product,
      ...patch,
      categoryIds: patch.categoryIds ?? product.categoryIds,
      tags: patch.tags ?? product.tags,
      updatedAt: now(),
    };
    store.products.set(id, updated);
    return updated;
  },

  deleteProduct({ id }) {
    store.products.delete(id);
    return empty();
  },

  searchProducts({ pagination, ...filters }) {
    const items = paginate(filterProducts(filters), pagination);
    const total = filterProducts(filters).length;
    return { items, meta: paginationMeta(pagination, total) };
  },

  publishProduct({ id }) {
    const product = requireEntity(store.products.get(id), "Product", id);
    const updated = {
      ...product,
      status: ProductStatus.ACTIVE,
      visibility: ProductVisibility.PUBLIC,
      publishedAt: now(),
      updatedAt: now(),
    };
    store.products.set(id, updated);
    return updated;
  },

  archiveProduct({ id }) {
    const product = requireEntity(store.products.get(id), "Product", id);
    const updated = { ...product, status: ProductStatus.ARCHIVED, updatedAt: now() };
    store.products.set(id, updated);
    return updated;
  },
});

export const categoryService = defineService(CategoryService, {
  listCategories(pagination) {
    const all = [...store.categories.values()];
    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  getCategoryTree() {
    const roots = [...store.categories.values()].filter(category => !category.parentId);
    return { roots };
  },

  getCategory({ id }) {
    return requireEntity(store.categories.get(id), "Category", id);
  },

  createCategory(data) {
    const timestamp = now();
    const category = {
      id: nextId("category"),
      slug: data.slug,
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      sortOrder: store.categories.size + 1,
      isActive: true,
      productCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.categories.set(category.id, category);
    return category;
  },

  updateCategory({ id, ...patch }) {
    const category = requireEntity(store.categories.get(id), "Category", id);
    const updated = { ...category, ...patch, updatedAt: now() };
    store.categories.set(id, updated);
    return updated;
  },

  deleteCategory({ id }) {
    store.categories.delete(id);
    return empty();
  },
});

export const brandService = defineService(BrandService, {
  listBrands(pagination) {
    const all = [...store.brands.values()];
    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  getBrand({ id }) {
    return requireEntity(store.brands.get(id), "Brand", id);
  },

  createBrand(data) {
    const timestamp = now();
    const brand = {
      id: nextId("brand"),
      slug: data.slug,
      name: data.name,
      description: data.description,
      websiteUrl: data.websiteUrl,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.brands.set(brand.id, brand);
    return brand;
  },

  updateBrand({ id, ...patch }) {
    const brand = requireEntity(store.brands.get(id), "Brand", id);
    const updated = { ...brand, ...patch, updatedAt: now() };
    store.brands.set(id, updated);
    return updated;
  },

  deleteBrand({ id }) {
    store.brands.delete(id);
    return empty();
  },
});
