import type { CSSProperties } from "react";

/** Single source of truth for the real store — used by StoresPage & Footer */
export const STORE = {
  name: "Sardar-G Fabrics",
  phoneDisplay: "03159157185",
  phoneHref: "tel:+923159157185",
  address: "Shop # G-5, Malikabad Shopping Mall, Rehmanabad Chowk, Murree Road, Rawalpindi",
  get mapsUrl() {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.address)}`;
  },
} as const;

export const CRIMSON = "#7D0020";
export const GOLD = "#C9A060";

export const GLASS = "bg-white/10 backdrop-blur-xl border border-white/25";
export const CARD_GLASS =
  "bg-[#fffaf3]/88 dark:bg-white/[0.05] backdrop-blur-2xl border border-[#e7d8ca] dark:border-white/10 shadow-lg shadow-[#7d0020]/8 dark:shadow-none";

export const POPPINS: CSSProperties = { fontFamily: "'Poppins', sans-serif" };
export const MONO: CSSProperties = { fontFamily: "'DM Mono', monospace" };

export const NAV_LINKS = ["Men", "Wedding", "Fabrics", "Sale", "Stores", "Track Order"] as const;

export const FOOTER_LINKS: Record<string, { label: string; path: string }[]> = {
  Shop: [
    { label: "Browse All Products", path: "/products" },
    { label: "Shalwar Kameez", path: "/collections/shalwar-kameez" },
    { label: "Embroidered Kurta", path: "/collections/embroidered-kurta" },
    { label: "Wedding Wear", path: "/collections/wedding-wear" },
    { label: "New Arrivals", path: "/new-arrivals" },
    { label: "Sale", path: "/sale" },
  ],
  Help: [
    { label: "Size Guide", path: "/size-guide" },
    { label: "Track Order", path: "/track-order" },
    { label: "Returns", path: "/returns" },
    { label: "FAQs", path: "/faqs" },
    { label: "Contact", path: "/contact" },
  ],
  Company: [
    { label: "About Us", path: "/about-us" },
    { label: "Our Story", path: "/our-story" },
    { label: "Press", path: "/press" },
    { label: "Careers", path: "/careers" },
    { label: "Lookbook", path: "/lookbook" },
  ],
};

export const CATEGORY_SLUGS: Record<string, string> = {
  men: "Men's Premium",
  wedding: "Wedding",
  fabrics: "Unstitched",
  sale: "sale",
};
