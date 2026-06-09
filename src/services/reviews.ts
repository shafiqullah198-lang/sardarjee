import { apiClient } from "./api";
import type { ApiReview } from "./types";

export interface ReviewPayload {
  product: number;
  rating: number;
  guest_name: string;
  review_text: string;
  image?: File | null;
}

export async function fetchReviews(productId?: number): Promise<ApiReview[]> {
  const { data } = await apiClient.get<ApiReview[]>("/reviews/approved/", { params: productId ? { product: productId } : undefined });
  return data;
}

export async function fetchApprovedReviews(): Promise<ApiReview[]> {
  const { data } = await apiClient.get<ApiReview[]>("/reviews/approved/");
  return data;
}

export async function createReview(payload: ReviewPayload): Promise<ApiReview> {
  const form = new FormData();
  form.append("product", String(payload.product));
  form.append("rating", String(payload.rating));
  form.append("guest_name", payload.guest_name);
  form.append("review_text", payload.review_text);
  if (payload.image) form.append("image", payload.image);

  const { data } = await apiClient.post<ApiReview>("/reviews/create/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export interface ReviewEligibility {
  can_review: boolean;
  has_review: boolean;
  review: ApiReview | null;
}

export async function fetchReviewEligibility(productId: number): Promise<ReviewEligibility> {
  const { data } = await apiClient.get<ReviewEligibility>(`/reviews/eligibility/${productId}/`);
  return data;
}
