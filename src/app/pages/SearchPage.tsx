import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search } from "lucide-react";
import { CRIMSON, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { ProductCard } from "@/app/components/ProductCard";
import { useStore } from "@/context/StoreContext";
import { filterProductsByQuery } from "@/app/utils/products";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const [query, setQuery] = useState(qParam);
  const { products, productsLoading, productsError } = useStore();

  const results = useMemo(
    () => filterProductsByQuery(products, qParam),
    [products, qParam],
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setParams(query.trim() ? { q: query.trim() } : {});
  }

  return (
    <main className="py-10 sm:py-14 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6" style={POPPINS}>Search</h1>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-10 max-w-xl">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fabrics, suits, kurta…"
              className="w-full border border-border rounded-full pl-11 pr-5 py-3.5 text-[14px] focus:outline-none"
              style={{ background: "var(--input-background)" }}
            />
          </div>
          <button
            type="submit"
            className="text-white px-8 py-3.5 rounded-full text-[11px] tracking-[0.2em] uppercase font-bold whitespace-nowrap"
            style={{ background: CRIMSON }}
          >
            Search
          </button>
        </form>
        {qParam && (
          <p className="text-sm text-muted-foreground mb-6">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{qParam}&rdquo;
          </p>
        )}
        {productsLoading ? (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground">{productsError ?? "No products found."} Try another term or <Link to={ROUTES.shop} className="underline">browse all</Link>.</p>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {results.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
