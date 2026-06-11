import { cachedGet, safeRequest } from "./api";
import type { ApiCategory, PaginatedResponse } from "./types";

export async function fetchCategories(): Promise<PaginatedResponse<ApiCategory>> {
  return cachedGet<PaginatedResponse<ApiCategory>>(
    "/categories/",
    undefined,
    5 * 60 * 1000,
  );
}

export async function fetchCategoryBySlug(slug: string): Promise<ApiCategory> {
  const { data } = await apiClient.get<ApiCategory>(`/categories/${slug}/`);
  return data;
}

export async function fetchCategoriesList(): Promise<ApiCategory[]> {
  const data = await safeRequest(() => fetchCategories());
  return data?.results ?? [];
}
