import { apiPath, cachedGet, clearCachedGets, safeRequest } from "./api";
import type { ApiProduct, PaginatedResponse } from "./types";

const PRODUCT_CACHE_TTL_MS = 60 * 1000;
const PRODUCTS_PATH = apiPath("products/");

export interface ProductListParams {
  q?: string;
  category?: string;
  featured?: boolean;
  trending?: boolean;
  new_arrival?: boolean;
  sale?: boolean;
  section?: "men" | "wedding" | "fabrics";
  page?: number;
  page_size?: number;
}

export interface ProductRequestOptions {
  forceRefresh?: boolean;
}

function buildQuery(params?: ProductListParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (!params) return query;
  if (params.q) query.q = params.q;
  if (params.category) query.category = params.category;
  if (params.featured) query.featured = "true";
  if (params.trending) query.trending = "true";
  if (params.new_arrival) query.new_arrival = "true";
  if (params.sale) query.sale = "true";
  if (params.section) query.section = params.section;
  if (params.page) query.page = String(params.page);
  if (params.page_size) query.page_size = String(params.page_size);
  return query;
}

export async function fetchProducts(
  params?: ProductListParams,
  options?: ProductRequestOptions,
): Promise<PaginatedResponse<ApiProduct>> {
  if (options?.forceRefresh) {
    clearCachedGets(PRODUCTS_PATH);
  }
  return cachedGet<PaginatedResponse<ApiProduct>>(
    PRODUCTS_PATH,
    { params: buildQuery(params) },
    PRODUCT_CACHE_TTL_MS,
  );
}

export async function fetchProductBySlug(slug: string): Promise<ApiProduct> {
  return cachedGet<ApiProduct>(apiPath(`products/${slug}/`), undefined, PRODUCT_CACHE_TTL_MS);
}

export async function fetchProductById(id: number | string): Promise<ApiProduct> {
  return cachedGet<ApiProduct>(apiPath(`products/${id}/`), undefined, PRODUCT_CACHE_TTL_MS);
}

export async function fetchFeaturedProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts({ featured: true, page_size: 8 }));
  return data?.results ?? [];
}

export async function fetchLatestProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts({ page_size: 8 }));
  return data?.results ?? [];
}

export async function fetchTrendingProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(async () => {
    return cachedGet<ApiProduct[]>(apiPath("products/trending/"), undefined, PRODUCT_CACHE_TTL_MS);
  });
  return data ?? [];
}

export async function fetchProductsSafe(params?: ProductListParams): Promise<PaginatedResponse<ApiProduct> | null> {
  return safeRequest(() => fetchProducts(params));
}

export async function fetchProductsSafeFresh(params?: ProductListParams): Promise<PaginatedResponse<ApiProduct> | null> {
  return safeRequest(() => fetchProducts(params, { forceRefresh: true }));
}

export async function fetchNewArrivalProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts({ new_arrival: true, page_size: 8 }));
  return data?.results ?? [];
}

export async function fetchSaleProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts({ sale: true, page_size: 8 }));
  return data?.results ?? [];
}

export async function fetchSectionProducts(section: "men" | "wedding" | "fabrics"): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts({ section }));
  return data?.results ?? [];
}

export function clearProductCache(): void {
  clearCachedGets(PRODUCTS_PATH);
}
