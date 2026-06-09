import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UiProduct } from "@/hooks/useHomepageData";
import { mapApiProduct } from "@/hooks/useHomepageData";
import { fetchProducts } from "@/services/products";

export interface CartLine extends UiProduct {
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
  addToCart: (product: UiProduct, qty?: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  updateCartQty: (id: number, qty: number) => void;
  toggleWishlist: (id: number) => void;
  isWishlisted: (id: number) => boolean;
  getProduct: (id: number) => UiProduct | undefined;
  wishlistProducts: UiProduct[];
}

const StoreContext = createContext<StoreState | null>(null);

const CART_KEY = "premium_cart";
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
      const data = await fetchProducts();
      setProducts(data.results.map((product, index) => mapApiProduct(product, index)));
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

  const addToCart = useCallback((product: UiProduct, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.id === product.id ? { ...l, quantity: l.quantity + qty } : l,
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const updateCartQty = useCallback((id: number, qty: number) => {
    if (qty < 1) {
      setCart((prev) => prev.filter((l) => l.id !== id));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.id === id ? { ...l, quantity: qty } : l)),
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
