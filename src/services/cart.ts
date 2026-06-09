import { apiClient } from "./api";

export interface CartItemPayload {
  variant_id: number;
  quantity: number;
}

export async function fetchCart() {
  const { data } = await apiClient.get("/cart/");
  return data;
}

export async function addToCart(payload: CartItemPayload) {
  const { data } = await apiClient.post("/cart/items/", payload);
  return data;
}

export async function updateCartItem(itemId: number, quantity: number) {
  const { data } = await apiClient.patch(`/cart/items/${itemId}/`, {
    quantity,
  });
  return data;
}

export async function removeCartItem(itemId: number): Promise<void> {
  await apiClient.delete(`/cart/items/${itemId}/`);
}
