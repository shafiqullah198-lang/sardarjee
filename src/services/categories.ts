import { apiClient, safeRequest } from "./api";
import type { ApiCategory, PaginatedResponse } from "./types";

export async function fetchCategories(): Promise<PaginatedResponse<ApiCategory>> {
  const { data } = await apiClient.get<PaginatedResponse<ApiCategory>>(
    "/categories/",
  );
  return data;
}

export async function fetchCategoryBySlug(slug: string): Promise<ApiCategory> {
  const { data } = await apiClient.get<ApiCategory>(`/categories/${slug}/`);
  return data;
}

export async function fetchCategoriesList(): Promise<ApiCategory[]> {
  const data = await safeRequest(() => fetchCategories());
  return data?.results ?? [];
}
