import type { UiProduct } from "@/hooks/useHomepageData";

export function filterProductsByCategory(
  products: UiProduct[],
  slug?: string,
): UiProduct[] {
  if (!slug) return products;
  if (slug === "sale") {
    return products.filter((p) => p.hasDiscount);
  }
  return products.filter((p) => p.categorySlug === slug);
}

export function filterProductsByQuery(
  products: UiProduct[],
  q: string,
): UiProduct[] {
  const term = q.trim().toLowerCase();
  if (!term) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.cat.toLowerCase().includes(term),
  );
}
