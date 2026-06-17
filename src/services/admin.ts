import { apiClient, apiUrl, cachedGet, clearCachedGets } from "./api";
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
  total_profit: number;
  pos_profit: number;
  total_orders: number;
  total_products: number;
  customers_count: number;
  approved_reviews: number;
  average_rating: number;
  low_stock_count: number;
  low_stock_products: {
    product: string;
    sku: string;
    quantity: number;
    threshold: number;
  }[];
  recent_orders: ApiTrackedOrder[];
  sales_chart_data: { label: string; total: number }[];
}

export interface InventoryRow {
  id: number;
  product_id: number;
  product: string;
  product_image: string;
  variant: string;
  color: string;
  size: string;
  fabric: string;
  stitching: string;
  sku: string;
  quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export interface InventoryMove {
  id: number;
  product?: string;
  order_number?: string;
  from_status?: string;
  to_status?: string;
  sku?: string;
  movement_type?: string;
  quantity?: number;
  note: string;
  created_at: string;
}

export interface InventoryStockUpdateResponse {
  id: number;
  stock: number;
  status: "healthy" | "low_stock" | "out_of_stock";
  low_stock_status: boolean;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
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
  stock_filter?: string;
  product?: string;
  color?: string;
  size?: string;
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

const ADMIN_PRODUCTS_PATH = apiUrl("admin/products/");

export async function fetchAdminDashboard(params?: { days?: number }): Promise<AdminDashboard> {
  return cachedGet<AdminDashboard>(apiUrl("admin/dashboard/"), { params }, 10 * 1000);
}

export async function fetchAdminProducts(params?: AdminPageParams): Promise<AdminPaginated<ApiProduct>> {
  return cachedGet<AdminPaginated<ApiProduct>>(ADMIN_PRODUCTS_PATH, { params });
}

export async function saveAdminProduct(form: FormData, id?: number): Promise<ApiProduct> {
  const { data } = await apiClient.request<ApiProduct>({
    url: id ? apiUrl(`admin/products/${id}/`) : ADMIN_PRODUCTS_PATH,
    method: id ? "PATCH" : "POST",
    data: form,
    headers: { "Content-Type": "multipart/form-data" },
  });
  clearCachedGets(/products/);
  return data;
}

export async function deleteAdminProduct(id: number): Promise<{ success: boolean; message: string; archived: boolean }> {
  const { data } = await apiClient.delete<{ success: boolean; message: string; archived: boolean }>(apiUrl(`admin/products/${id}/`));
  clearCachedGets(/products/);
  return data;
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
  filters: {
    products: string[];
    colors: string[];
    sizes: string[];
  };
}> {
  return cachedGet<{
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
    filters: {
      products: string[];
      colors: string[];
      sizes: string[];
    };
  }>(apiUrl("admin/inventory/"), { params });
}

export async function moveStock(payload: {
  variant_id: number;
  movement_type: string;
  quantity?: number;
  target_quantity?: number;
  low_stock_threshold?: number;
  note?: string;
}) {
  const { data } = await apiClient.post(apiUrl("admin/inventory/move/"), payload);
  return data;
}

export async function updateInventoryStock(
  id: number,
  payload: { stock: number } | { delta: number },
): Promise<InventoryStockUpdateResponse> {
  const { data } = await apiClient.patch<InventoryStockUpdateResponse>(apiUrl(`inventory/items/${id}/stock/`), payload);
  return data;
}

export async function fetchAdminOrders(params?: AdminPageParams): Promise<AdminPaginated<ApiTrackedOrder>> {
  return cachedGet<AdminPaginated<ApiTrackedOrder>>(apiUrl("admin/orders/"), { params });
}

export async function updateAdminOrder(id: number, payload: Record<string, unknown>): Promise<ApiTrackedOrder> {
  const { data } = await apiClient.patch<ApiTrackedOrder>(apiUrl(`admin/orders/${id}/`), payload);
  return data;
}

export async function createPosSale(payload: Record<string, unknown>): Promise<ApiTrackedOrder> {
  const { data } = await apiClient.post<ApiTrackedOrder>(apiUrl("admin/pos/sales/"), payload);
  return data;
}

export async function fetchSales(params?: AdminPageParams): Promise<AdminPaginated<SaleRecord>> {
  return cachedGet<AdminPaginated<SaleRecord>>(apiUrl("admin/sales/"), { params });
}

export async function fetchSaleInvoice(idOrNumber: number | string): Promise<ApiTrackedOrder> {
  const numericId = typeof idOrNumber === "number" || /^\d+$/.test(String(idOrNumber));
  const url = numericId
    ? apiUrl(`admin/sales/${idOrNumber}/invoice/`)
    : apiUrl(`admin/sales/by-number/${encodeURIComponent(String(idOrNumber))}/invoice/`);
  const { data } = await apiClient.get<ApiTrackedOrder>(url);
  return data;
}

export async function refundSale(id: number, payload?: { reason?: string; status?: "returned" | "cancelled" }) {
  const { data } = await apiClient.post(apiUrl(`admin/sales/${id}/refund/`), payload ?? {});
  return data;
}

export async function fetchOrderEvents(params?: AdminPageParams): Promise<AdminPaginated<InventoryMove>> {
  return cachedGet<AdminPaginated<InventoryMove>>(apiUrl("admin/order-events/"), { params });
}

export async function fetchAdminReviews(params?: AdminPageParams): Promise<AdminPaginated<ApiReview>> {
  return cachedGet<AdminPaginated<ApiReview>>(apiUrl("admin/homepage/reviews/"), { params });
}

export async function fetchAdminCareers(params?: AdminPageParams): Promise<AdminPaginated<ApiCareerOpportunity>> {
  return cachedGet<AdminPaginated<ApiCareerOpportunity>>(apiUrl("admin/careers/"), { params });
}

export async function saveAdminCareer(payload: Record<string, unknown>, id?: number): Promise<ApiCareerOpportunity> {
  const { data } = await apiClient.request<ApiCareerOpportunity>({
    url: id ? apiUrl(`admin/careers/${id}/`) : apiUrl("admin/careers/"),
    method: id ? "PATCH" : "POST",
    data: payload,
  });
  return data;
}

export async function deleteAdminCareer(id: number): Promise<void> {
  await apiClient.delete(apiUrl(`admin/careers/${id}/`));
}

export async function fetchAdminHomepage(): Promise<AdminHomepage> {
  return cachedGet<AdminHomepage>(apiUrl("admin/homepage/"), undefined, 60 * 1000);
}

export async function saveHomepageHero(form: FormData): Promise<ApiHomepageBanner> {
  const { data } = await apiClient.post<ApiHomepageBanner>(apiUrl("admin/homepage/hero/"), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function saveHomepageStory(form: FormData): Promise<ApiHomepageStory> {
  const { data } = await apiClient.post<ApiHomepageStory>(apiUrl("admin/homepage/story/"), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function createHomepageStat(payload: Record<string, unknown>): Promise<ApiHomepageStat> {
  const { data } = await apiClient.post<ApiHomepageStat>(apiUrl("admin/homepage/stats/"), payload);
  return data;
}

export async function fetchAdminDashboardStats(): Promise<Record<string, number | string>> {
  const { data } = await apiClient.get<Record<string, number | string>>(apiUrl("admin/dashboard/stats/"));
  return data;
}

export async function updateHomepageStat(id: number, payload: Record<string, unknown>): Promise<ApiHomepageStat> {
  const { data } = await apiClient.patch<ApiHomepageStat>(apiUrl(`admin/homepage/stats/${id}/`), payload);
  return data;
}

export async function deleteHomepageStat(id: number): Promise<void> {
  await apiClient.delete(apiUrl(`admin/homepage/stats/${id}/`));
}

export async function saveHomepageDisplay(payload: Record<string, unknown>): Promise<ApiHomepageDisplaySettings> {
  const { data } = await apiClient.post<ApiHomepageDisplaySettings>(apiUrl("admin/homepage/display/"), payload);
  return data;
}

export async function moderateHomepageReview(id: number, status: string): Promise<ApiReview> {
  const { data } = await apiClient.patch<ApiReview>(apiUrl(`admin/homepage/reviews/${id}/`), { status });
  return data;
}

export async function updateAdminReview(id: number, payload: Record<string, unknown>): Promise<ApiReview> {
  const { data } = await apiClient.patch<ApiReview>(apiUrl(`admin/homepage/reviews/${id}/`), payload);
  return data;
}

export async function deleteAdminReview(id: number): Promise<void> {
  await apiClient.delete(apiUrl(`admin/homepage/reviews/${id}/`));
}
