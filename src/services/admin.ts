import { apiClient } from "./api";
import type {
  ApiHomepageBanner,
  ApiHomepageDisplaySettings,
  ApiHomepageStat,
  ApiHomepageStory,
  ApiProduct,
  ApiCareerOpportunity,
  ApiReview,
  ApiTrackedOrder,
} from "./types";

export interface AdminDashboard {
  total_sales: number;
  pos_sales: number;
  total_orders: number;
  total_products: number;
  customers: number;
  approved_reviews: number;
  average_rating: number;
  low_stock: number;
  low_stock_products: {
    product: string;
    sku: string;
    quantity: number;
    threshold: number;
  }[];
  recent_orders: ApiTrackedOrder[];
  sales_chart: { label: string; total: number }[];
}

export interface InventoryRow {
  id: number;
  product: string;
  sku: string;
  quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
}

export interface InventoryMove {
  id: number;
  order_number?: string;
  from_status?: string;
  to_status?: string;
  sku?: string;
  movement_type?: string;
  quantity?: number;
  note: string;
  created_at: string;
}

export interface SaleRecord {
  id: number;
  number: string;
  source: "website" | "pos";
  customer: string;
  payment_status: string;
  payment_method: string;
  grand_total: string;
  original_total: string;
  refunded_amount: string;
  refunded_at: string | null;
  status: string;
  created_at: string;
}

export interface AdminHomepage {
  hero: ApiHomepageBanner | null;
  stats: ApiHomepageStat[];
  story: ApiHomepageStory | null;
  display_settings: ApiHomepageDisplaySettings;
  reviews: ApiReview[];
}

export interface AdminPageParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  payment?: string;
  date?: string;
  source?: string;
  movement_type?: string;
  history_search?: string;
  ordering?: string;
  records_page?: number;
}

export interface AdminPaginated<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
}

export async function fetchAdminDashboard(params?: { days?: number }): Promise<AdminDashboard> {
  const { data } = await apiClient.get<AdminDashboard>("/admin/dashboard/", { params });
  return data;
}

export async function fetchAdminProducts(params?: AdminPageParams): Promise<AdminPaginated<ApiProduct>> {
  const { data } = await apiClient.get<AdminPaginated<ApiProduct>>("/admin/products/", { params });
  return data;
}

export async function saveAdminProduct(form: FormData, id?: number): Promise<ApiProduct> {
  const { data } = await apiClient.request<ApiProduct>({
    url: id ? `/admin/products/${id}/` : "/admin/products/",
    method: id ? "PATCH" : "POST",
    data: form,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteAdminProduct(id: number): Promise<void> {
  await apiClient.delete(`/admin/products/${id}/`);
}

export async function fetchInventory(params?: AdminPageParams): Promise<{
  records: InventoryRow[];
  records_count: number;
  records_page: number;
  records_page_size: number;
  records_total_pages: number;
  history_count: number;
  history_page: number;
  history_page_size: number;
  history_total_pages: number;
  history: InventoryMove[];
}> {
  const { data } = await apiClient.get<{
    records: InventoryRow[];
    records_count: number;
    records_page: number;
    records_page_size: number;
    records_total_pages: number;
    history_count: number;
    history_page: number;
    history_page_size: number;
    history_total_pages: number;
    history: InventoryMove[];
  }>("/admin/inventory/", { params });
  return data;
}

export async function moveStock(payload: { variant_id: number; movement_type: string; quantity: number; note?: string }) {
  const { data } = await apiClient.post("/admin/inventory/move/", payload);
  return data;
}

export async function fetchAdminOrders(params?: AdminPageParams): Promise<AdminPaginated<ApiTrackedOrder>> {
  const { data } = await apiClient.get<AdminPaginated<ApiTrackedOrder>>("/admin/orders/", { params });
  return data;
}

export async function updateAdminOrder(id: number, payload: Record<string, unknown>): Promise<ApiTrackedOrder> {
  const { data } = await apiClient.patch<ApiTrackedOrder>(`/admin/orders/${id}/`, payload);
  return data;
}

export async function createPosSale(payload: Record<string, unknown>): Promise<ApiTrackedOrder> {
  const { data } = await apiClient.post<ApiTrackedOrder>("/admin/pos/sales/", payload);
  return data;
}

export async function fetchSales(params?: AdminPageParams): Promise<AdminPaginated<SaleRecord>> {
  const { data } = await apiClient.get<AdminPaginated<SaleRecord>>("/admin/sales/", { params });
  return data;
}

export async function fetchSaleInvoice(idOrNumber: number | string): Promise<ApiTrackedOrder> {
  const numericId = typeof idOrNumber === "number" || /^\d+$/.test(String(idOrNumber));
  const url = numericId
    ? `/admin/sales/${idOrNumber}/invoice/`
    : `/admin/sales/by-number/${encodeURIComponent(String(idOrNumber))}/invoice/`;
  const { data } = await apiClient.get<ApiTrackedOrder>(url);
  return data;
}

export async function refundSale(id: number, payload?: { reason?: string; status?: "returned" | "cancelled" }) {
  const { data } = await apiClient.post(`/admin/sales/${id}/refund/`, payload ?? {});
  return data;
}

export async function fetchOrderEvents(params?: AdminPageParams): Promise<AdminPaginated<InventoryMove>> {
  const { data } = await apiClient.get<AdminPaginated<InventoryMove>>("/admin/order-events/", { params });
  return data;
}

export async function fetchAdminReviews(params?: AdminPageParams): Promise<AdminPaginated<ApiReview>> {
  const { data } = await apiClient.get<AdminPaginated<ApiReview>>("/admin/homepage/reviews/", { params });
  return data;
}

export async function fetchAdminCareers(params?: AdminPageParams): Promise<AdminPaginated<ApiCareerOpportunity>> {
  const { data } = await apiClient.get<AdminPaginated<ApiCareerOpportunity>>("/admin/careers/", { params });
  return data;
}

export async function saveAdminCareer(payload: Record<string, unknown>, id?: number): Promise<ApiCareerOpportunity> {
  const { data } = await apiClient.request<ApiCareerOpportunity>({
    url: id ? `/admin/careers/${id}/` : "/admin/careers/",
    method: id ? "PATCH" : "POST",
    data: payload,
  });
  return data;
}

export async function deleteAdminCareer(id: number): Promise<void> {
  await apiClient.delete(`/admin/careers/${id}/`);
}

export async function fetchAdminHomepage(): Promise<AdminHomepage> {
  const { data } = await apiClient.get<AdminHomepage>("/admin/homepage/");
  return data;
}

export async function saveHomepageHero(form: FormData): Promise<ApiHomepageBanner> {
  const { data } = await apiClient.post<ApiHomepageBanner>("/admin/homepage/hero/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function saveHomepageStory(form: FormData): Promise<ApiHomepageStory> {
  const { data } = await apiClient.post<ApiHomepageStory>("/admin/homepage/story/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function createHomepageStat(payload: Record<string, unknown>): Promise<ApiHomepageStat> {
  const { data } = await apiClient.post<ApiHomepageStat>("/admin/homepage/stats/", payload);
  return data;
}

export async function fetchAdminDashboardStats(): Promise<Record<string, number | string>> {
  const { data } = await apiClient.get<Record<string, number | string>>("/admin/dashboard/stats/");
  return data;
}

export async function updateHomepageStat(id: number, payload: Record<string, unknown>): Promise<ApiHomepageStat> {
  const { data } = await apiClient.patch<ApiHomepageStat>(`/admin/homepage/stats/${id}/`, payload);
  return data;
}

export async function deleteHomepageStat(id: number): Promise<void> {
  await apiClient.delete(`/admin/homepage/stats/${id}/`);
}

export async function saveHomepageDisplay(payload: Record<string, unknown>): Promise<ApiHomepageDisplaySettings> {
  const { data } = await apiClient.post<ApiHomepageDisplaySettings>("/admin/homepage/display/", payload);
  return data;
}

export async function moderateHomepageReview(id: number, status: string): Promise<ApiReview> {
  const { data } = await apiClient.patch<ApiReview>(`/admin/homepage/reviews/${id}/`, { status });
  return data;
}

export async function updateAdminReview(id: number, payload: Record<string, unknown>): Promise<ApiReview> {
  const { data } = await apiClient.patch<ApiReview>(`/admin/homepage/reviews/${id}/`, payload);
  return data;
}

export async function deleteAdminReview(id: number): Promise<void> {
  await apiClient.delete(`/admin/homepage/reviews/${id}/`);
}
