import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UiProduct, UiProductVariant, UiColorVariant } from "@/hooks/useHomepageData";
import { mapApiProduct } from "@/hooks/useHomepageData";
import { fetchProducts } from "@/services/products";

/**
 * A single line in the shopping cart.
 *
 * Identity is (productId + variantId) — so the same product with a different
 * color / size / fabric appears as a separate cart line.
 */
export interface CartLine {
  /** Unique key: `${productId}-${variantId}` */
  cartKey: string;
  productId: number;
  variantId: number;
  colorVariantId: number | null;
  name: string;
  /** Image URL for the selected colour variant (or product default) */
  img: string;
  cat: string;
  price: string;
  orig: string | null;
  hasDiscount: boolean;
  selectedColor: string;
  selectedSize: string;
  selectedFabric: string;
  isStitched: boolean;
  sku: string;
  stock: number;
  quantity: number;
}

interface StoreState {
  isDark: boolean;
  setIsDark: (v: boolean | ((d: boolean) => boolean)) => void;
  cart: CartLine[];
  wishlistIds: Set<number>;
  cartCount: number;
  products: UiProduct[];
  productsLoading: boolean;
  productsError: string | null;
  setProducts: (p: UiProduct[]) => void;
  reloadProducts: () => Promise<void>;
  /**
   * Add a product with a specific variant to the cart.
   * If the same (productId + variantId) already exists, increment quantity.
   * Different variants of the same product = separate cart lines.
   */
  addToCart: (
    product: UiProduct,
    variant: UiProductVariant,
    colorVariant?: UiColorVariant | null,
    qty?: number,
  ) => void;
  removeFromCart: (cartKey: string) => void;
  clearCart: () => void;
  updateCartQty: (cartKey: string, qty: number) => void;
  toggleWishlist: (id: number) => void;
  isWishlisted: (id: number) => boolean;
  getProduct: (id: number) => UiProduct | undefined;
  wishlistProducts: UiProduct[];
}

const StoreContext = createContext<StoreState | null>(null);

const CART_KEY = "premium_cart_v2";
const WISH_KEY = "premium_wishlist";

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function loadWishlist(): number[] {
  try {
    const raw = localStorage.getItem(WISH_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

/** Resolve the best image URL for a given variant selection. */
function resolveVariantImage(
  product: UiProduct,
  colorVariant?: UiColorVariant | null,
): string {
  if (colorVariant) {
    // Prefer gallery images first
    const galleryImg = colorVariant.images?.[0];
    if (galleryImg?.imageUrl || galleryImg?.thumbnailUrl) return galleryImg.imageUrl || galleryImg.thumbnailUrl;
    // Fall back to legacy single color-variant image
    if (colorVariant.image) return colorVariant.image;
  }
  // Fall back to product default image
  return product.img;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [cart, setCart] = useState<CartLine[]>(loadCart);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(
    () => new Set(loadWishlist()),
  );
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const reloadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await fetchProducts(undefined, { forceRefresh: true });
      const visible = data.results.filter((product) => {
        const status = String(product.status ?? "").toLowerCase();
        const stock = Number(product.total_stock ?? product.stock ?? 0);
        return status === "active" && stock > 0;
      });
      setProducts(visible.map((product, index) => mapApiProduct(product, index)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load products";
      setProductsError(message);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadProducts();
  }, [reloadProducts]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(WISH_KEY, JSON.stringify([...wishlistIds]));
  }, [wishlistIds]);

  const addToCart = useCallback(
    (
      product: UiProduct,
      variant: UiProductVariant,
      colorVariant?: UiColorVariant | null,
      qty = 1,
    ) => {
      const cartKey = `${product.id}-${variant.id}`;
      const img = resolveVariantImage(product, colorVariant);

      setCart((prev) => {
        const existing = prev.find((l) => l.cartKey === cartKey);
        if (existing) {
          return prev.map((l) =>
            l.cartKey === cartKey ? { ...l, quantity: l.quantity + qty } : l,
          );
        }
        const line: CartLine = {
          cartKey,
          productId: product.id,
          variantId: variant.id,
          colorVariantId: colorVariant?.id ?? null,
          name: product.name,
          img,
          cat: product.cat,
          price: variant.price || product.price,
          orig: variant.salePrice ? variant.regularPrice : (product.orig ?? null),
          hasDiscount: variant.salePrice != null || product.hasDiscount,
          selectedColor: colorVariant?.colorName ?? variant.color ?? "",
          selectedSize: variant.size ?? "",
          selectedFabric: variant.fabric ?? "",
          isStitched: variant.isStitched ?? false,
          sku: variant.sku,
          stock: variant.stock ?? 0,
          quantity: qty,
        };
        return [...prev, line];
      });
    },
    [],
  );

  const removeFromCart = useCallback((cartKey: string) => {
    setCart((prev) => prev.filter((l) => l.cartKey !== cartKey));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const updateCartQty = useCallback((cartKey: string, qty: number) => {
    if (qty < 1) {
      setCart((prev) => prev.filter((l) => l.cartKey !== cartKey));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.cartKey === cartKey ? { ...l, quantity: qty } : l)),
    );
  }, []);

  const toggleWishlist = useCallback((id: number) => {
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isWishlisted = useCallback(
    (id: number) => wishlistIds.has(id),
    [wishlistIds],
  );

  const getProduct = useCallback(
    (id: number) => products.find((p) => p.id === id),
    [products],
  );

  const value = useMemo<StoreState>(
    () => ({
      isDark,
      setIsDark,
      cart,
      wishlistIds,
      cartCount: cart.reduce((s, l) => s + l.quantity, 0),
      products,
      productsLoading,
      productsError,
      setProducts,
      reloadProducts,
      addToCart,
      removeFromCart,
      clearCart,
      updateCartQty,
      toggleWishlist,
      isWishlisted,
      getProduct,
      wishlistProducts: products.filter((p) => wishlistIds.has(p.id)),
    }),
    [
      isDark,
      cart,
      wishlistIds,
      products,
      productsLoading,
      productsError,
      reloadProducts,
      addToCart,
      removeFromCart,
      clearCart,
      updateCartQty,
      toggleWishlist,
      isWishlisted,
      getProduct,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
