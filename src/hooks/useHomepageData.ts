import { useEffect, useState } from "react";
import { fetchHomeContentSafe } from "@/services/cms";
import {
  fetchProductsSafeFresh,
} from "@/services/products";
import { fetchCategoriesList } from "@/services/categories";
import { resolveMediaUrl } from "@/services/api";
import type {
  ApiCategory,
  ApiHomepageBanner,
  ApiHomepageDisplaySettings,
  ApiHomepageStat,
  ApiHomepageSummaryStats,
  ApiHomepageStory,
  ApiProduct,
  ApiProductColorVariant,
  ApiProductVariant,
  ApiReview,
} from "@/services/types";

export interface UiCategory {
  name: string;
  slug: string;
  sub: string;
  img: string;
}

export interface UiColorVariantImage {
  id: number;
  imageUrl: string;
  thumbnailUrl: string;
  altText: string;
  sortOrder: number;
}

export interface UiColorVariant {
  id: number;
  colorName: string;
  colorHex: string | null;
  stock: number;
  image: string;
  images: UiColorVariantImage[];
}

export interface UiProductVariant {
  id: number;
  sku: string;
  color: string;
  size: string;
  fabric: string;
  isStitched: boolean;
  stock: number;
  costPrice: string;
  regularPrice: string;
  price: string;
  salePrice: string | null;
  effectivePrice: string;
  colorVariantId: number | null;
  images: UiColorVariantImage[];
  isActive: boolean;
}

export interface UiProduct {
  id: number;
  variantId?: number;
  name: string;
  cat: string;
  categorySlug: string;
  costPrice: string;
  sellingPrice: string;
  price: string;
  orig: string | null;
  badge: string;
  img: string;
  rating: number;
  reviews: number;
  ratingBreakdown: Record<string, number>;
  stock: number;
  hasDiscount: boolean;
  discountPercent: number;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  showInMen: boolean;
  showInWedding: boolean;
  showInFabrics: boolean;
  status: string;
  colorVariants: UiColorVariant[];
  variants: UiProductVariant[];
  description: string;
}

export interface UiTestimonial {
  name: string;
  loc: string;
  init: string;
  text: string;
  rating: number;
  productName: string;
  verifiedPurchase: boolean;
  image: string;
  createdAt: string;
}

export interface HomepageData {
  hero: ApiHomepageBanner | null;
  heroBanners: ApiHomepageBanner[];
  categories: UiCategory[];
  newArrivals: UiProduct[];
  saleProducts: UiProduct[];
  featuredProducts: UiProduct[];
  trendingProducts: UiProduct[];
  fabricHouseProducts: UiProduct[];
  lookbookProducts: UiProduct[];
  stats: ApiHomepageStat[];
  story: ApiHomepageStory | null;
  displaySettings: ApiHomepageDisplaySettings | null;
  testimonials: UiTestimonial[];
  fromApi: boolean;
  loading: boolean;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatPkr(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "PKR 0";
  return `PKR ${Math.round(n).toLocaleString("en-PK")}`;
}

function formatCompactPlus(value: number): string {
  if (value >= 1_000_000) return `${Math.floor(value / 100_000) / 10}M+`;
  if (value >= 1_000) return `${Math.floor(value / 100) / 10}K+`;
  return `${Math.round(value)}+`;
}

function mapHomepageSummaryStats(stats?: ApiHomepageSummaryStats): ApiHomepageStat[] {
  if (!stats) return [];
  return [
    {
      id: "years_of_trust",
      stat_type: "years_of_trust",
      title: "Years of Trust",
      number: `${stats.years_of_trust}+`,
      value: `${stats.years_of_trust}+`,
      label: "Years of Trust",
      icon: "",
      is_active: true,
      sort_order: 0,
    },
    {
      id: "premium_fabrics",
      stat_type: "premium_fabrics",
      title: "Premium Fabrics",
      number: formatCompactPlus(stats.premium_fabrics),
      value: formatCompactPlus(stats.premium_fabrics),
      label: "Premium Fabrics",
      icon: "",
      is_active: true,
      sort_order: 1,
    },
    {
      id: "happy_customers",
      stat_type: "happy_customers",
      title: "Happy Customers",
      number: formatCompactPlus(stats.happy_customers),
      value: formatCompactPlus(stats.happy_customers),
      label: "Happy Customers",
      icon: "",
      is_active: true,
      sort_order: 2,
    },
    {
      id: "average_rating",
      stat_type: "average_rating",
      title: "Average Rating",
      number: `${Number(stats.average_rating || 0).toFixed(1)}★`,
      value: `${Number(stats.average_rating || 0).toFixed(1)}★`,
      label: "Average Rating",
      icon: "",
      is_active: true,
      sort_order: 3,
    },
  ];
}

function productBadge(p: ApiProduct): string {
  if (p.has_discount) return `${Math.round(Number(p.discount_percent || 0))}% OFF`;
  if (p.is_new_arrival) return "New Arrival";
  if (p.is_featured) return "Featured";
  if (p.is_trending) return "Trending";
  return "New Arrival";
}

function isPubliclyVisibleProduct(product: ApiProduct): boolean {
  const status = String(product.status ?? "").toLowerCase();
  const stock = Number(product.total_stock ?? product.stock ?? 0);
  return status === "active" && stock > 0;
}

function showInFabricSection(product: ApiProduct): boolean {
  return Boolean(product.show_in_fabrics || product.show_in_fabric);
}

export function mapApiProduct(
  p: ApiProduct,
  index: number,
  fallback?: UiProduct,
): UiProduct {
  const productImages = p.product_images?.length ? p.product_images : p.images;
  const imgPath = p.default_image || p.main_image || productImages?.[0]?.thumbnail_url || productImages?.[0]?.image_url || productImages?.[0]?.image;
  const mainImgPath = p.main_image || imgPath;
  const img = mainImgPath ? resolveMediaUrl(mainImgPath) : (fallback?.img ?? "");
  const regularPrice = p.regular_price || p.selling_price || p.base_price;
  const finalPrice = p.final_price || p.effective_price || p.sale_price || regularPrice;
  const hasSale = Boolean(
    p.is_on_sale &&
    Number(p.discount_percent || 0) > 0 &&
    parseFloat(finalPrice) < parseFloat(regularPrice),
  );
  const colorVariants = mapColorVariants(p.color_variants ?? []);
  const variants = mapVariants(p.variants ?? []);

  return {
    id: p.id,
    variantId: p.variants?.[0]?.id,
    name: p.name,
    cat: p.category?.name ?? fallback?.cat ?? "Collection",
    categorySlug: p.category?.slug ?? fallback?.categorySlug ?? "",
    costPrice: formatPkr(p.cost_price),
    sellingPrice: formatPkr(regularPrice),
    price: formatPkr(finalPrice),
    orig: hasSale ? formatPkr(regularPrice) : null,
    badge: productBadge(p),
    img,
    rating: p.average_rating ?? fallback?.rating ?? 0,
    reviews: p.reviews_count ?? fallback?.reviews ?? 0,
    ratingBreakdown: p.rating_breakdown ?? fallback?.ratingBreakdown ?? {},
    stock: p.total_stock ?? p.stock ?? fallback?.stock ?? 0,
    hasDiscount: hasSale,
    discountPercent: Number(p.discount_percent || 0),
    isFeatured: Boolean(p.is_featured),
    isTrending: Boolean(p.is_trending),
    isNewArrival: Boolean(p.is_new_arrival),
    isOnSale: Boolean(p.is_on_sale),
    showInMen: Boolean(p.show_in_men),
    showInWedding: Boolean(p.show_in_wedding),
    showInFabrics: showInFabricSection(p),
    status: p.status ?? "",
    colorVariants,
    variants,
    description: p.description ?? "",
  };
}

function mapColorVariants(variants: ApiProductColorVariant[]): UiColorVariant[] {
  return variants.map((variant) => ({
    id: variant.id,
    colorName: variant.color_name,
    colorHex: variant.color_hex,
    stock: variant.stock,
    image: resolveMediaUrl(variant.image_url || variant.image),
    images: (variant.images ?? []).map((img) => ({
      id: img.id,
      imageUrl: resolveMediaUrl(img.image_url || img.image),
      thumbnailUrl: resolveMediaUrl(img.thumbnail_url || img.thumbnail || img.image_url || img.image),
      altText: img.alt_text,
      sortOrder: img.sort_order,
    })),
  }));
}

function mapVariants(variants: ApiProductVariant[]): UiProductVariant[] {
  return variants.map((v) => {
    const regularPrice = v.regular_price ?? v.price;
    const finalPrice = v.final_price ?? v.effective_price ?? v.sale_price ?? v.price;
    const hasSale = parseFloat(finalPrice) < parseFloat(regularPrice);

    return {
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      fabric: v.fabric,
      isStitched: v.is_stitched ?? false,
      stock: v.stock ?? 0,
      costPrice: formatPkr(v.cost_price ?? 0),
      regularPrice: formatPkr(regularPrice),
      price: formatPkr(finalPrice),
      salePrice: hasSale ? formatPkr(finalPrice) : null,
      effectivePrice: formatPkr(finalPrice),
      colorVariantId: v.color_variant ?? null,
      images: (v.images ?? []).map((img) => ({
        id: img.id,
        imageUrl: resolveMediaUrl(img.image_url || img.image),
        thumbnailUrl: resolveMediaUrl(img.thumbnail_url || img.thumbnail || img.image_url || img.image),
        altText: img.alt_text,
        sortOrder: img.sort_order,
      })),
      isActive: v.is_active ?? true,
    };
  });
}

export function mapApiTestimonial(
  review: ApiReview,
): UiTestimonial {
  const name = review.guest_name || review.customer_name || review.user_email || "Customer";
  return {
    name,
    loc: "",
    init: initials(name),
    text: review.review_text || review.comment || review.title,
    rating: review.rating ?? 5,
    productName: review.product_name || "Purchased product",
    verifiedPurchase: Boolean(review.verified_purchase),
    image: resolveMediaUrl(review.image_url || review.review_image_url || review.image || review.review_image),
    createdAt: review.created_at,
  };
}

function mergeProducts(
  apiList: ApiProduct[],
  limit = 4,
): UiProduct[] {
  if (!apiList.length) return [];
  return apiList.slice(0, limit).map((p, i) => mapApiProduct(p, i));
}

function mergeProductsWithImages(apiList: ApiProduct[], limit = 6): UiProduct[] {
  return apiList
    .filter((product) => product.main_image || product.images?.length)
    .slice(0, limit)
    .map((product, index) => mapApiProduct(product, index));
}

function mergeUniqueProductsWithImages(apiLists: ApiProduct[][], limit = 4): UiProduct[] {
  const seen = new Set<number>();
  const products: ApiProduct[] = [];

  for (const list of apiLists) {
    for (const product of list) {
      if (seen.has(product.id) || !(product.main_image || product.images?.length)) continue;
      seen.add(product.id);
      products.push(product);
      if (products.length >= limit) return products.map((item, index) => mapApiProduct(item, index));
    }
  }

  return products.map((product, index) => mapApiProduct(product, index));
}

function productImage(product: ApiProduct): string {
  return resolveMediaUrl(product.main_image || product.images?.[0]?.image);
}

function categoryKey(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function buildCategoryImageFallbacks(apiLists: ApiProduct[][]): Map<string, string> {
  const fallbacks = new Map<string, string>();

  for (const list of apiLists) {
    for (const product of list) {
      const image = productImage(product);
      if (!image || !product.category) continue;

      const keys = [
        categoryKey(product.category.id),
        categoryKey(product.category.slug),
        categoryKey(product.category.name),
      ].filter(Boolean);

      for (const key of keys) {
        if (!fallbacks.has(key)) fallbacks.set(key, image);
      }
    }
  }

  return fallbacks;
}

function mergeCategories(
  apiList: ApiCategory[],
  productFallbacks = new Map<string, string>(),
): UiCategory[] {
  if (!apiList.length) return [];
  return apiList.map((category, index) => {
    const categoryImage = resolveMediaUrl(category.image_url || category.image);
    const fallbackImage =
      productFallbacks.get(categoryKey(category.id)) ||
      productFallbacks.get(categoryKey(category.slug)) ||
      productFallbacks.get(categoryKey(category.name)) ||
      "";

    return {
      name: category.name,
      slug: category.slug,
      sub: "Premium Category",
      img: categoryImage || fallbackImage,
    };
  });
}

function mergeTestimonials(
  apiList: ApiReview[],
): UiTestimonial[] {
  if (!apiList.length) return [];
  return apiList
    .filter((review) => review.status === "approved" && (review.comment || review.title))
    .slice(0, 6)
    .map((review) => mapApiTestimonial(review));
}

function sortNewest(products: ApiProduct[]): ApiProduct[] {
  return [...products].sort((a, b) => {
    const left = new Date(a.created_at ?? 0).getTime();
    const right = new Date(b.created_at ?? 0).getTime();
    return right - left;
  });
}

function selectFlaggedProducts(products: ApiProduct[], predicate: (product: ApiProduct) => boolean, limit = 8): ApiProduct[] {
  return sortNewest(products).filter(predicate).slice(0, limit);
}

export function useHomepageData(): HomepageData {
  const [state, setState] = useState<HomepageData>({
    hero: null,
    heroBanners: [],
    categories: [],
    newArrivals: [],
    saleProducts: [],
    featuredProducts: [],
    trendingProducts: [],
    fabricHouseProducts: [],
    lookbookProducts: [],
    stats: [],
    story: null,
    displaySettings: null,
    testimonials: [],
    fromApi: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const home = await fetchHomeContentSafe();
      const needsFallbackProducts =
        !home?.featured_products?.length ||
        !home?.lookbook_products?.length ||
        !home?.home_stats;
      const needsFallbackCategories = !home?.categories?.length;
      const [catalog, categories] =
        await Promise.all([
          needsFallbackProducts ? fetchProductsSafeFresh({ page_size: 24 }) : Promise.resolve(null),
          needsFallbackCategories ? fetchCategoriesList() : Promise.resolve([]),
        ]);

      if (cancelled) return;

      const allProducts = (catalog?.results ?? []).filter(isPubliclyVisibleProduct);
      const cmsFeatured = (home?.featured_products ?? []).filter(isPubliclyVisibleProduct);
      const cmsCategories = home?.categories ?? [];
      const featured = selectFlaggedProducts(allProducts, (product) => Boolean(product.is_featured));
      const trending = selectFlaggedProducts(allProducts, (product) => Boolean(product.is_trending));
      const newArrivals = selectFlaggedProducts(allProducts, (product) => Boolean(product.is_new_arrival));
      const saleProducts = selectFlaggedProducts(
        allProducts,
        (product) => Boolean(product.is_on_sale) && Number(product.discount_percent || 0) > 0,
      );
      const latest = sortNewest(allProducts).slice(0, 8);
      const featuredSrc = cmsFeatured.length ? cmsFeatured : featured;
      const categorySrc = cmsCategories.length ? cmsCategories : categories;
      const categoryImageFallbacks = buildCategoryImageFallbacks([
        newArrivals,
        latest,
        featuredSrc,
        featured,
        cmsFeatured,
        trending,
        home?.lookbook_products?.length ? home.lookbook_products : latest,
      ]);

      const next: HomepageData = {
        hero: home?.banners?.[0] ?? null,
        heroBanners: home?.banners ?? [],
        categories: mergeCategories(categorySrc, categoryImageFallbacks),
        newArrivals: mergeProducts(newArrivals, 4),
        saleProducts: mergeProducts(saleProducts, 4),
        featuredProducts: mergeProducts(featuredSrc),
        trendingProducts: mergeProducts(trending),
        fabricHouseProducts: mergeUniqueProductsWithImages([
          featuredSrc,
          featured,
          cmsFeatured,
          latest,
          newArrivals,
        ]),
        lookbookProducts: mergeProductsWithImages(
          (home?.lookbook_products ?? []).filter(isPubliclyVisibleProduct).length
            ? (home?.lookbook_products ?? []).filter(isPubliclyVisibleProduct)
            : latest,
          6,
        ),
        stats: mapHomepageSummaryStats(home?.home_stats),
        story: home?.story
          ? { ...home.story, image: resolveMediaUrl(home.story.image) }
          : null,
        displaySettings: home?.display_settings ?? null,
        testimonials: mergeTestimonials(home?.testimonials ?? []),
        fromApi: Boolean(
          home ||
            featured.length ||
            latest.length ||
            trending.length ||
            newArrivals.length ||
            saleProducts.length ||
            categories.length,
        ),
        loading: false,
      };

      setState(next);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
