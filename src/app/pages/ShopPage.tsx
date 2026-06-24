import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  PackageSearch,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { CRIMSON, GOLD, MONO, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { ProductCard } from "@/app/components/ProductCard";
import { mapApiProduct, type UiProduct } from "@/hooks/useHomepageData";
import { fetchProducts } from "@/services/products";
import { fetchCategoriesList } from "@/services/categories";
import type { ApiCategory } from "@/services/types";

/* ─── types ─────────────────────────────────────────────── */
type ShopSection = "men" | "wedding" | "fabrics";
type FilterKey =
  | "all"
  | "new_arrival"
  | "sale"
  | "featured"
  | "trending"
  | "men"
  | "wedding"
  | "fabrics";
type SortKey = "default" | "price_asc" | "price_desc";

interface FilterOption {
  key: FilterKey;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { key: "all", label: "All" },
  { key: "new_arrival", label: "New Arrivals" },
  { key: "sale", label: "Sale" },
  { key: "featured", label: "Featured" },
  { key: "trending", label: "Trending" },
  { key: "men", label: "Men" },
  { key: "wedding", label: "Wedding" },
  { key: "fabrics", label: "Fabrics" },
];

function isShopSection(value: string | undefined): value is ShopSection {
  return value === "men" || value === "wedding" || value === "fabrics";
}



/* ─── skeleton ───────────────────────────────────────────── */
function ProductSkeleton() {
  return (
    <div className="min-w-0">
      <div className="aspect-[3/4] rounded-2xl bg-muted animate-pulse mb-3" />
      <div className="h-2.5 w-3/4 rounded-full bg-muted animate-pulse mb-2" />
      <div className="h-3.5 w-full rounded-full bg-muted animate-pulse mb-2" />
      <div className="h-3 w-1/2 rounded-full bg-muted animate-pulse" />
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────── */
export function ShopPage({ section: sectionProp }: { section?: ShopSection }) {
  const { category } = useParams<{ category?: string }>();
  const activeSection = sectionProp ?? (isShopSection(category) ? category : undefined);

  const [allProducts, setAllProducts] = useState<UiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  // filters
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("default");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  /* title */
  const pageTitle = activeSection
    ? activeSection === "men"
      ? "Men's Collection"
      : activeSection === "wedding"
        ? "Wedding Collection"
        : "Fabrics"
    : category === "sale"
      ? "Sale"
      : category
        ? category.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")
        : "All Products";

  /* load products */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const params = activeSection
          ? { section: activeSection }
          : category === "sale"
            ? { sale: true as const }
            : category
              ? { category }
              : {};
        const res = await fetchProducts(params, { forceRefresh: true });
        if (cancelled) return;
        const visible = res.results.filter((product) => {
          const status = String(product.status ?? "").toLowerCase();
          const stock = Number(product.total_stock ?? product.stock ?? 0);
          return status === "active" && stock > 0;
        });
        setAllProducts(visible.map((p, i) => mapApiProduct(p, i)));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load products.");
        setAllProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [activeSection, category]);

  /* load categories */
  useEffect(() => {
    fetchCategoriesList().then(setCategories).catch(() => {});
  }, []);

  /* close cat dropdown on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* filter + sort + search */
  const displayed = useMemo(() => {
    let list = allProducts;

    // search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.cat.toLowerCase().includes(q) ||
          String(p.id).includes(q),
      );
    }

    // category filter
    if (selectedCategory) {
      list = list.filter((p) => p.categorySlug === selectedCategory);
    }

    // filter tab — note: since allProducts comes from API with filter already applied for sections,
    // we only apply extra client-side flags from the product's hasDiscount / badge info
    if (activeFilter !== "all") {
      list = list.filter((p) => {
        if (activeFilter === "sale") return p.isOnSale && p.hasDiscount;
        if (activeFilter === "new_arrival") return p.isNewArrival;
        if (activeFilter === "featured") return p.isFeatured;
        if (activeFilter === "trending") return p.isTrending;
        // section filters — just show all when already section-filtered
        if (activeFilter === "men") return p.showInMen;
        if (activeFilter === "wedding") return p.showInWedding;
        if (activeFilter === "fabrics") return p.showInFabrics;
        return true;
      });
    }

    // sort
    if (sort === "price_asc") {
      list = [...list].sort(
        (a, b) =>
          parseFloat(a.price.replace(/[^0-9.]/g, "")) -
          parseFloat(b.price.replace(/[^0-9.]/g, "")),
      );
    } else if (sort === "price_desc") {
      list = [...list].sort(
        (a, b) =>
          parseFloat(b.price.replace(/[^0-9.]/g, "")) -
          parseFloat(a.price.replace(/[^0-9.]/g, "")),
      );
    }

    return list;
  }, [allProducts, search, selectedCategory, activeFilter, sort]);

  const selectedCatLabel =
    categories.find((c) => c.slug === selectedCategory)?.name ?? "Category";

  return (
    <main className="min-h-screen py-10 sm:py-14 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">

        {/* breadcrumb */}
        <nav className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-7 flex flex-wrap items-center gap-2">
          <Link to={ROUTES.home} className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3 opacity-40" />
          {activeSection || category ? (
            <>
              <Link to={ROUTES.shop} className="hover:text-foreground transition-colors">All Products</Link>
              <ChevronRight className="w-3 h-3 opacity-40" />
              <span className="text-foreground font-semibold">{pageTitle}</span>
            </>
          ) : (
            <span className="text-foreground font-semibold">All Products</span>
          )}
        </nav>

        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] tracking-[0.4em] uppercase font-semibold text-muted-foreground mb-2">Shop</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={POPPINS}>
              {pageTitle}
            </h1>
          </div>
          <p className="text-[12px] text-muted-foreground" style={MONO}>
            {loading ? "Loading…" : `${displayed.length} products`}
          </p>
        </div>

        {/* search + filter bar */}
        <div className="mb-8 space-y-4">
          {/* search */}
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU…"
              className="w-full rounded-full border border-border bg-background pl-11 pr-10 py-2.5 text-sm outline-none focus:border-[#b21f36] focus:ring-1 focus:ring-[#b21f36]/20 transition dark:bg-white/[0.04]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* filter row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* mobile: toggle filters */}
            <button
              type="button"
              onClick={() => setShowFilters((f) => !f)}
              className="sm:hidden inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>

            {/* filter pills — always visible on sm+ */}
            <div className={`${showFilters ? "flex" : "hidden sm:flex"} flex-wrap gap-2`}>
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setActiveFilter(opt.key)}
                  className="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200"
                  style={
                    activeFilter === opt.key
                      ? { background: CRIMSON, color: "white", border: `1px solid ${CRIMSON}` }
                      : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* category dropdown */}
            <div className="relative" ref={catRef}>
              <button
                type="button"
                onClick={() => setCatOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold transition hover:border-[#b21f36]"
                style={selectedCategory ? { borderColor: GOLD, color: "var(--foreground)" } : {}}
              >
                {selectedCatLabel}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {catOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 z-30 min-w-[160px] rounded-2xl border border-border bg-background shadow-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory(""); setCatOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors ${!selectedCategory ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => { setSelectedCategory(cat.slug); setCatOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors ${selectedCategory === cat.slug ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold outline-none cursor-pointer transition hover:border-[#b21f36] dark:bg-white/[0.04]"
            >
              <option value="default">Sort: Default</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            {/* clear all */}
            {(activeFilter !== "all" || selectedCategory || search || sort !== "default") && (
              <button
                type="button"
                onClick={() => {
                  setActiveFilter("all");
                  setSelectedCategory("");
                  setSearch("");
                  setSort("default");
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* grid */}
        {loading ? (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 px-4 border border-red-200 rounded-3xl bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30">
            <PackageSearch className="w-10 h-10 mx-auto mb-4 text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-5">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full px-5 py-2.5 text-xs font-bold text-white transition"
              style={{ background: CRIMSON }}
            >
              Try Again
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 px-4 border border-border rounded-3xl bg-secondary/30"
          >
            <PackageSearch className="w-12 h-12 mx-auto mb-5 text-muted-foreground" />
            <p className="text-lg font-bold mb-2" style={POPPINS}>No products found</p>
            <p className="text-sm text-muted-foreground mb-6">
              Try adjusting your search or filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter("all");
                setSelectedCategory("");
                setSearch("");
                setSort("default");
              }}
              className="rounded-full px-6 py-3 text-sm font-bold text-white transition"
              style={{ background: CRIMSON }}
            >
              Clear Filters
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayed.map((product, i) => (
              <ShopProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── ShopProductCard — wraps ProductCard and overlays multi-badges ── */
function ShopProductCard({ product, index }: { product: UiProduct; index: number }) {
  // We need the raw ApiProduct for multi-badge, but UiProduct has enough flags
  // We'll reconstruct badge hints from UiProduct fields we have
  const badges = computeBadges(product);
  const primaryBadge = badges[0];

  return (
    <div className="relative group min-w-0">
      <ProductCard
        product={product}
        index={index}
        badgeOverride={primaryBadge?.label}
      />
      {/* extra badges (2nd, 3rd…) stacked below the first one that ProductCard renders */}
      {badges.length > 1 && (
        <div className="absolute top-[2.25rem] left-2 sm:left-3 flex flex-col gap-1 pointer-events-none">
          {badges.slice(1, 3).map((b) => (
            <span
              key={b.label}
              className="text-[8px] sm:text-[9px] tracking-[0.15em] uppercase font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full"
              style={{ background: b.color, color: b.color === CRIMSON ? "#fff4e8" : "white", backdropFilter: "blur(8px)" }}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function computeBadges(p: UiProduct): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = [];
  if (p.hasDiscount && p.discountPercent > 0) {
    badges.push({ label: `${Math.round(p.discountPercent)}% OFF`, color: CRIMSON });
  }
  if (p.badge.toLowerCase().includes("new")) {
    badges.push({ label: "NEW ARRIVAL", color: CRIMSON });
  }
  if (p.badge.toLowerCase().includes("featured")) {
    badges.push({ label: "FEATURED", color: "#5b2d8e" });
  }
  if (p.badge.toLowerCase().includes("trending")) {
    badges.push({ label: "TRENDING", color: "#a16207" });
  }
  return badges;
}
