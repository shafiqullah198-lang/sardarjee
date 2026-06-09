import { Link } from "react-router";
import { CRIMSON, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { ProductCard } from "@/app/components/ProductCard";
import { useStore } from "@/context/StoreContext";

export function WishlistPage() {
  const { wishlistProducts } = useStore();

  return (
    <main className="py-10 sm:py-14 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={POPPINS}>Wishlist</h1>
        {wishlistProducts.length === 0 ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <p className="text-muted-foreground mb-6">Save items you love by tapping the heart on any product.</p>
            <Link
              to={ROUTES.shop}
              className="inline-block text-white px-8 py-3.5 rounded-full text-[11px] tracking-[0.2em] uppercase font-bold"
              style={{ background: CRIMSON }}
            >
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {wishlistProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
