import { apiClient, safeRequest } from "./api";
import type { ApiCareerOpportunity, ApiHomeContent } from "./types";

export async function fetchHomeContent(): Promise<ApiHomeContent> {
  const { data } = await apiClient.get<ApiHomeContent>("/cms/home/");
  return data;
}

export async function fetchHomeContentSafe(): Promise<ApiHomeContent | null> {
  return safeRequest(() => fetchHomeContent());
}

export async function fetchCareerOpportunities(): Promise<ApiCareerOpportunity[]> {
  const { data } = await apiClient.get<ApiCareerOpportunity[]>("/careers/");
  return data;
}

/** Newsletter API not yet exposed on backend — reserved for Phase 3+. */
export async function subscribeNewsletter(email: string): Promise<boolean> {
  try {
    await apiClient.post("/cms/newsletter/", { email });
    return true;
  } catch {
    return false;
  }
}
