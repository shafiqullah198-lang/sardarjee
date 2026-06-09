import { apiClient } from "./api";

export interface CheckoutPayload {
  shipping_name: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_city: string;
  shipping_country?: string;
  payment_provider?: string;
  payment_screenshot?: File | null;
  items: {
    product_id: number;
    variant_id?: number;
    color_variant_id?: number;
    quantity: number;
  }[];
  notes?: string;
}

export interface CheckoutResponse {
  order_id: number;
  order_number: string;
  tracking_id: string;
}

export async function createCheckout(payload: CheckoutPayload): Promise<CheckoutResponse> {
  const form = new FormData();
  form.append("shipping_name", payload.shipping_name);
  form.append("shipping_phone", payload.shipping_phone);
  form.append("shipping_line1", payload.shipping_line1);
  form.append("shipping_city", payload.shipping_city);
  form.append("shipping_country", payload.shipping_country ?? "Pakistan");
  form.append("payment_provider", payload.payment_provider ?? "cash");
  form.append("items", JSON.stringify(payload.items));
  if (payload.notes) form.append("notes", payload.notes);
  if (payload.payment_screenshot) form.append("payment_screenshot", payload.payment_screenshot);
  const { data } = await apiClient.post<CheckoutResponse>("/checkout/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
