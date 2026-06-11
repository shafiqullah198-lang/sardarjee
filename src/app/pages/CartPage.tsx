import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { ProductCard } from "@/app/components/ProductCard";
import { CRIMSON, GOLD, MONO, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { useStore, type CartLine } from "@/context/StoreContext";
import { mapApiProduct, type UiProduct } from "@/hooks/useHomepageData";
import { fetchTrendingProducts } from "@/services/products";

function parsePkr(value: string) {
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function money(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-PK")}`;
}

function cartLineTotal(line: CartLine) {
  return parsePkr(line.price) * line.quantity;
}

export function CartPage() {
  const { cart, updateCartQty, removeFromCart } = useStore();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<UiProduct[]>([]);

  const cartProductIds = useMemo(() => new Set(cart.map((line) => line.productId)), [cart]);
  const subtotal = cart.reduce((sum, line) => sum + cartLineTotal(line), 0);
  const discount = cart.reduce((sum, line) => {
    if (!line.orig) return sum;
    return sum + Math.max(0, parsePkr(line.orig) - parsePkr(line.price)) * line.quantity;
  }, 0);
  const total = subtotal;

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      try {
        const products = await fetchTrendingProducts();
        if (cancelled) return;
        const rows = products
          .map((product, index) => mapApiProduct(product, index))
          .filter((product) => product.img && !cartProductIds.has(product.id))
          .slice(0, 4);
        setRecommendations(rows);
      } catch {
        if (!cancelled) setRecommendations([]);
      }
    }

    void loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [cartProductIds]);

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,rgba(201,160,96,0.18),transparent_32%),linear-gradient(135deg,#fff8ee_0%,#f7efe3_52%,#fffdf8_100%)] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.32em] text-[#7d0020]">Sardar-G Cart</p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#1a0808] sm:text-4xl" style={POPPINS}>Shopping Cart</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#72514e]">Review your premium fabrics before checkout.</p>
          </div>
          <Link to={ROUTES.shop} className="inline-flex w-fit items-center gap-2 rounded-full border border-[#7d0020]/15 bg-white/75 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#7d0020] shadow-sm">
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {cart.length ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <section className="space-y-4">
              {cart.map((line) => (
                <CartItemCard key={line.cartKey} line={line} onQty={updateCartQty} onRemove={removeFromCart} />
              ))}
            </section>

            <aside className="rounded-[1.5rem] border border-[#e1cfc0] bg-white/86 p-5 shadow-xl shadow-[#7d0020]/8 backdrop-blur sm:p-6 lg:sticky lg:top-28">
              <div className="flex items-center gap-3 border-b border-[#eadbd4] pb-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff2d8] text-[#7d0020]">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-extrabold text-[#1a0808]" style={POPPINS}>Order Summary</h2>
                  <p className="text-xs font-semibold text-[#72514e]">{cart.length} item{cart.length === 1 ? "" : "s"} in cart</p>
                </div>
              </div>

              <div className="space-y-3 py-5 text-sm">
                <SummaryRow label="Subtotal" value={money(subtotal + discount)} />
                {discount > 0 && <SummaryRow label="Discount" value={`-${money(discount)}`} accent />}
                <div className="border-t border-[#eadbd4] pt-4">
                  <SummaryRow label="Total" value={money(total)} strong />
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(ROUTES.checkout)}
                className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-xs font-extrabold uppercase tracking-[0.18em] text-white shadow-lg shadow-[#7d0020]/18"
                style={{ background: CRIMSON }}
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link to={ROUTES.shop} className="mt-4 block text-center text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#7d0020] hover:underline">
                Continue Shopping
              </Link>
            </aside>
          </div>
        ) : (
          <section className="rounded-[1.75rem] border border-[#eadbd4] bg-white/82 px-5 py-14 text-center shadow-xl shadow-[#7d0020]/8 sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#fff2d8] text-[#7d0020]">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h2 className="mt-6 text-2xl font-extrabold text-[#1a0808] sm:text-3xl" style={POPPINS}>Your cart is empty</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#72514e]">Discover premium fabrics and add your favourites.</p>
            <Link
              to={ROUTES.shop}
              className="mt-7 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white"
              style={{ background: CRIMSON }}
            >
              Continue Shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}

        {recommendations.length > 0 && (
          <section className="mt-14 sm:mt-16">
            <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-[#1a0808] sm:text-3xl" style={POPPINS}>You may also like these trending items</h2>
                <p className="mt-2 text-sm text-[#72514e]">Popular picks customers are buying most</p>
              </div>
              <span className="h-1 w-24 rounded-full" style={{ background: GOLD }} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {recommendations.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function CartItemCard({
  line,
  onQty,
  onRemove,
}: {
  line: CartLine;
  onQty: (cartKey: string, qty: number) => void;
  onRemove: (cartKey: string) => void;
}) {
  const variantBadges: string[] = [];
  if (line.selectedColor) variantBadges.push(line.selectedColor);
  if (line.selectedSize) variantBadges.push(line.selectedSize);
  if (line.selectedFabric) variantBadges.push(line.selectedFabric);
  if (line.isStitched !== undefined && line.selectedFabric) {
    variantBadges.push(line.isStitched ? "Stitched" : "Unstitched");
  }

  return (
    <article className="grid gap-4 rounded-[1.5rem] border border-[#e1cfc0] bg-white/86 p-4 shadow-lg shadow-[#7d0020]/6 backdrop-blur sm:grid-cols-[112px_minmax(0,1fr)] sm:p-5">
      <Link to={ROUTES.product(line.productId)} className="aspect-[3/4] overflow-hidden rounded-2xl bg-[#f0e4df] sm:w-28">
        {line.img ? (
          <img src={line.img} alt={line.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a6460]">No Image</div>
        )}
      </Link>
      <div className="min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#9b7a43]">{line.cat}</p>
            <Link to={ROUTES.product(line.productId)} className="mt-1 block text-base font-extrabold leading-snug text-[#1a0808] hover:underline sm:text-lg" style={POPPINS}>
              {line.name}
            </Link>
            {/* Variant details */}
            {variantBadges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {variantBadges.map((badge) => (
                  <span key={badge} className="inline-flex items-center rounded-full border border-[#e1cfc0] bg-[#fff8ee] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7d4a30]">
                    {badge}
                  </span>
                ))}
              </div>
            )}
            {line.sku && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">SKU: <span className="font-mono font-semibold">{line.sku}</span></p>
            )}
          </div>
          <button type="button" onClick={() => onRemove(line.cartKey)} className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eadbd4] px-3 py-2 text-xs font-extrabold text-[#7d0020] hover:bg-[#fff2ea]">
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>

        <div className="mt-5 grid gap-4 rounded-2xl bg-[#fff8ee] p-4 sm:grid-cols-3 sm:items-center">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8a6460]">Price</p>
            <p className="mt-1 font-extrabold text-[#1a0808]" style={MONO}>{line.price}</p>
            {line.orig && <p className="mt-0.5 text-xs font-bold text-[#8a6460] line-through" style={MONO}>{line.orig}</p>}
          </div>
          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8a6460]">Quantity</p>
            <div className="inline-flex h-10 items-center rounded-full border border-[#e1cfc0] bg-white">
              <button type="button" onClick={() => onQty(line.cartKey, line.quantity - 1)} className="flex h-10 w-10 items-center justify-center rounded-l-full hover:bg-[#fff2ea]" aria-label="Decrease quantity">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-9 text-center text-sm font-extrabold">{line.quantity}</span>
              <button type="button" onClick={() => onQty(line.cartKey, line.quantity + 1)} className="flex h-10 w-10 items-center justify-center rounded-r-full hover:bg-[#fff2ea]" aria-label="Increase quantity">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8a6460]">Line Total</p>
            <p className="mt-1 text-lg font-extrabold text-[#7d0020]" style={MONO}>{money(cartLineTotal(line))}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function SummaryRow({ label, value, accent = false, strong = false }: { label: string; value: string; accent?: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "text-lg" : ""}`}>
      <span className={`font-bold ${strong ? "text-[#1a0808]" : "text-[#72514e]"}`}>{label}</span>
      <span className={`font-extrabold ${accent || strong ? "text-[#7d0020]" : "text-[#1a0808]"}`} style={MONO}>{value}</span>
    </div>
  );
}
