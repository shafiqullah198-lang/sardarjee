/** Paginated list responses from Django REST Framework */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  image_url?: string | null;
}

export interface ApiProductImage {
  image: string;
  image_url?: string | null;
  alt_text: string;
  sort_order: number;
}

export interface ApiProductColorVariant {
  id: number;
  color_name: string;
  color_hex: string | null;
  stock: number;
  image: string | null;
  image_url?: string | null;
}

export interface ApiProductVariant {
  id: number;
  sku: string;
  size: string;
  color: string;
  fabric: string;
  price: string;
}

export interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: ApiCategory;
  main_image?: string | null;
  price: string;
  base_price: string;
  is_on_sale: boolean;
  discount_percent: string;
  sale_price: string | null;
  effective_price: string;
  has_discount: boolean;
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  show_in_men: boolean;
  show_in_wedding: boolean;
  show_in_fabrics: boolean;
  average_rating?: number;
  reviews_count?: number;
  rating_breakdown?: Record<string, number>;
  status?: string;
  stock?: number;
  sku?: string;
  variants: ApiProductVariant[];
  color_variants: ApiProductColorVariant[];
  images: ApiProductImage[];
}

export interface ApiOrderItem {
  sku: string;
  product_name: string;
  color_variant_id?: number | null;
  color_variant_name?: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface ApiOrderStatusEvent {
  from_status: string;
  to_status: string;
  note: string;
  created_at: string;
}

export interface ApiTrackedOrder {
  id: number;
  number: string;
  tracking_id: string;
  source: "website" | "pos";
  status: string;
  payment_status: string;
  payment_method: string;
  payment_screenshot?: string | null;
  payment_screenshot_url?: string | null;
  delivery_status: string;
  customer: {
    name: string;
    phone: string;
    city: string;
    country: string;
  };
  subtotal: string;
  discount_total: string;
  tax_total: string;
  shipping_total: string;
  grand_total: string;
  inventory_reduced: boolean;
  refunded_at: string | null;
  refunded_amount: string;
  refund_reason: string;
  created_at: string;
  items: ApiOrderItem[];
  status_events: ApiOrderStatusEvent[];
}

export interface ApiHomepageBanner {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  hero_media?: string | null;
  media_type?: "image" | "video";
  media_url?: string | null;
  hero_media_url?: string | null;
  cta_text: string;
  cta_url: string;
  secondary_cta_text: string;
  secondary_cta_url: string;
  is_active: boolean;
  sort_order: number;
}

export interface ApiHomepageStat {
  id: number | string;
  stat_type: string;
  title: string;
  number: string | number;
  value: string | number;
  label: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

export interface ApiHomepageSummaryStats {
  years_of_trust: number;
  premium_fabrics: number;
  happy_customers: number;
  average_rating: number;
}

export interface ApiHomepageStory {
  id: number;
  title: string;
  text: string;
  image: string;
  cta_text: string;
  cta_url: string;
  is_active: boolean;
}

export interface ApiHomepageDisplaySettings {
  id?: number;
  lookbook_title: string;
  lookbook_limit: number;
  reviews_title: string;
  is_lookbook_active: boolean;
  is_reviews_active: boolean;
}

export interface ApiReview {
  id: number;
  product: number;
  product_name?: string;
  rating: number;
  title: string;
  comment: string;
  guest_name?: string;
  review_text?: string;
  image?: string | null;
  image_url?: string | null;
  customer_name?: string;
  customer_profile_image?: string | null;
  customer_profile_image_url?: string | null;
  review_image?: string | null;
  review_image_url?: string | null;
  verified_purchase?: boolean;
  is_approved?: boolean;
  is_hidden?: boolean;
  is_spam?: boolean;
  is_featured?: boolean;
  ip_address?: string | null;
  status: string;
  helpful_count: number;
  user_email: string;
  created_at: string;
}

export interface ApiCareerOpportunity {
  id: number;
  title: string;
  department: string;
  location: string;
  job_type: string;
  description: string;
  requirements: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiHomeContent {
  banners: ApiHomepageBanner[];
  stats: ApiHomepageStat[];
  home_stats?: ApiHomepageSummaryStats;
  story: ApiHomepageStory | null;
  display_settings: ApiHomepageDisplaySettings;
  testimonials: ApiReview[];
  featured_products: ApiProduct[];
  lookbook_products: ApiProduct[];
  categories: ApiCategory[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export interface ApiErrorBody {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}
