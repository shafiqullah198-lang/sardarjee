import { apiClient } from "./api";
import type { ApiTrackedOrder } from "./types";

export async function fetchOrders() {
  const { data } = await apiClient.get("/orders/");
  return data;
}

export async function fetchOrder(orderId: number | string) {
  const { data } = await apiClient.get(`/orders/${orderId}/`);
  return data;
}

export async function trackOrder(query: string): Promise<ApiTrackedOrder> {
  const { data } = await apiClient.get<ApiTrackedOrder>("/track-order/", {
    params: { q: query },
  });
  return data;
}
