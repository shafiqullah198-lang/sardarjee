export const ROUTES = {
  home: "/",
  shop: "/shop",
  products: "/products",
  shopCategory: (slug: string) => `/shop/${slug}`,
  men: "/shop/men",
  wedding: "/wedding",
  fabrics: "/fabrics",
  product: (id: number | string) => `/product/${id}`,
  cart: "/cart",
  wishlist: "/wishlist",
  login: "/login",
  signup: "/signup",
  register: "/signup",
  account: "/account",
  logout: "/logout",
  checkout: "/checkout",
  stores: "/stores",
  search: "/search",
  trackOrder: "/track-order",
  aboutUs: "/about-us",
  ourStory: "/our-story",
  lookbook: "/lookbook",
  contact: "/contact",
  faqs: "/faqs",
  returns: "/returns",
  sizeGuide: "/size-guide",
  press: "/press",
  careers: "/careers",
  sale: "/sale",
  newArrivals: "/new-arrivals",
  admin: "/admin",
} as const;

export const NAV_ROUTES: Record<string, string> = {
  Men: "/shop/men",
  Wedding: "/wedding",
  Fabrics: "/fabrics",
  Sale: "/sale",
  "New Arrivals": "/new-arrivals",
  Stores: "/stores",
  "Track Order": "/track-order",
};

export function categoryTitle(slug?: string): string {
  if (!slug) return "All Products";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
