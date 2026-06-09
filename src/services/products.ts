import { apiClient, safeRequest } from "./api";
import type { ApiProduct, PaginatedResponse } from "./types";

export interface ProductListParams {
  q?: string;
  category?: string;
  featured?: boolean;
  trending?: boolean;
  new_arrival?: boolean;
  sale?: boolean;
  section?: "men" | "wedding" | "fabrics";
  page?: number;
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
  return query;
}

export async function fetchProducts(
  params?: ProductListParams,
): Promise<PaginatedResponse<ApiProduct>> {
  const { data } = await apiClient.get<PaginatedResponse<ApiProduct>>(
    "/products/",
    { params: buildQuery(params) },
  );
  return data;
}

export async function fetchProductBySlug(slug: string): Promise<ApiProduct> {
  const { data } = await apiClient.get<ApiProduct>(`/products/${slug}/`);
  return data;
}

export async function fetchFeaturedProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts({ featured: true }));
  return data?.results ?? [];
}

export async function fetchLatestProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts());
  return data?.results ?? [];
}

export async function fetchTrendingProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(async () => {
    const response = await apiClient.get<ApiProduct[]>("/products/trending/");
    return response.data;
  });
  return data ?? [];
}

export async function fetchNewArrivalProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts({ new_arrival: true }));
  return data?.results ?? [];
}

export async function fetchSaleProducts(): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts({ sale: true }));
  return data?.results ?? [];
}

export async function fetchSectionProducts(section: "men" | "wedding" | "fabrics"): Promise<ApiProduct[]> {
  const data = await safeRequest(() => fetchProducts({ section }));
  return data?.results ?? [];
}
