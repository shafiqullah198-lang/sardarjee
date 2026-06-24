import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Heart, Star } from "lucide-react";
import { CRIMSON, GOLD, MONO, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import type { UiProduct } from "@/hooks/useHomepageData";
import { useStore } from "@/context/StoreContext";

export function ProductCard({
  product,
  index = 0,
  showQuickAdd = true,
  badgeOverride,
}: {
  product: UiProduct;
  index?: number;
  showQuickAdd?: boolean;
  badgeOverride?: string;
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const navigate = useNavigate();
  const wished = isWishlisted(product.id);
  const badge = badgeOverride ?? product.badge;
  const isDiscountBadge = product.hasDiscount && /off/i.test(badge);
  const badgeBackground = isDiscountBadge ? CRIMSON : "rgba(125,0,32,0.92)";
  const badgeColor = isDiscountBadge ? "white" : "#fff4e8";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.6 }}
      className="group min-w-0"
    >
      <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-muted mb-3 sm:mb-4">
        <Link to={ROUTES.product(product.id)} className="block w-full h-full">
          {product.img ? (
            <img
              src={product.img}
              alt={product.name}
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              No Image
            </div>
          )}
        </Link>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 pointer-events-none" />
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
          <span
            className="text-[8px] sm:text-[9px] tracking-[0.15em] uppercase font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full"
            style={{
              background: badgeBackground,
              color: badgeColor,
              backdropFilter: "blur(8px)",
            }}
          >
            {badge}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleWishlist(product.id); }}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-8 h-8 rounded-full bg-background/85 backdrop-blur-sm flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className="w-3.5 h-3.5"
            style={{
              fill: wished ? CRIMSON : "none",
              color: wished ? CRIMSON : "var(--foreground)",
            }}
          />
        </button>
        {showQuickAdd && (
          <div className="absolute inset-x-2 sm:inset-x-3 bottom-2 sm:bottom-3 z-10 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 transition-all duration-300">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const variant = product.variants[0];
                if (variant) {
                  addToCart(product, variant, product.colorVariants[0] ?? null);
                } else {
                  navigate(ROUTES.product(product.id));
                }
              }}
              className="w-full backdrop-blur-sm text-[9px] sm:text-[10px] tracking-[0.15em] uppercase font-bold py-2 sm:py-2.5 rounded-xl transition-colors"
              style={{ background: CRIMSON, color: "#fff4e8" }}
            >
              Add to Cart
            </button>
          </div>
        )}
      </div>
      <Link to={ROUTES.product(product.id)} className="block space-y-1 min-w-0">
        <p className="text-[9px] tracking-[0.3em] uppercase font-semibold text-muted-foreground truncate">
          {product.cat}
        </p>
        <p className="text-[13px] sm:text-[14px] font-semibold leading-snug line-clamp-2" style={POPPINS}>
          {product.name}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[12px] sm:text-[13px] font-bold" style={MONO}>
            {product.price}
          </span>
          {product.orig && (
            <span className="text-[10px] sm:text-[11px] text-muted-foreground line-through" style={MONO}>
              {product.orig}
            </span>
          )}
        </div>
        {product.colorVariants.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {product.colorVariants.slice(0, 5).map((variant) => (
              <span
                key={variant.id}
                title={`${variant.colorName} (${variant.stock})`}
                className="h-4 w-4 rounded-full border border-border shadow-sm"
                style={{ background: variant.colorHex || "linear-gradient(135deg,#f4efe5,#c9a060)" }}
              />
            ))}
          </div>
        )}
        <p className="text-[10px] font-semibold text-muted-foreground">Stock: {product.stock ?? 0}</p>
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star
                key={j}
                className="w-2.5 h-2.5"
                style={{
                  fill: j < Math.floor(product.rating) ? GOLD : "var(--muted)",
                  color: j < Math.floor(product.rating) ? GOLD : "var(--muted)",
                }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">({product.reviews})</span>
        </div>
      </Link>
    </motion.div>
  );
}
