import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, BadgeCheck, Banknote, Building2, CreditCard, Download, Landmark, Loader2, Phone, Printer, ShoppingBag } from "lucide-react";
import { CRIMSON, GOLD, MONO, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { useStore, type CartLine } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { createCheckout } from "@/services/checkout";
import { safeRequest } from "@/services/api";

type PaymentMethod = "cash" | "easypaisa" | "jazzcash" | "bank_transfer";

const paymentOptions: {
  value: PaymentMethod;
  title: string;
  subtitle: string;
  icon: typeof Banknote;
  instructions?: string[];
}[] = [
  {
    value: "cash",
    title: "Cash",
    subtitle: "Pay in cash when your order arrives",
    icon: Banknote,
  },
  {
    value: "easypaisa",
    title: "EasyPaisa",
    subtitle: "Send payment before confirmation",
    icon: Phone,
    instructions: ["EasyPaisa Account: 0315-9457186", "Account Title: Sardar-G Fabrics", "Upload your payment screenshot before placing order.", "Order remains pending verification until admin confirms."],
  },
  {
    value: "jazzcash",
    title: "JazzCash",
    subtitle: "Mobile wallet transfer",
    icon: CreditCard,
    instructions: ["JazzCash Number: 0315-9457186", "Account Title: Sardar-G Fabrics", "Upload your payment screenshot before placing order.", "Admin will mark payment paid after verification."],
  },
  {
    value: "bank_transfer",
    title: "Bank Transfer",
    subtitle: "Direct account deposit",
    icon: Landmark,
    instructions: ["Bank Name: Configure in admin settings", "Account Title: Sardar-G Fabrics", "IBAN: Configure in admin settings", "Upload your payment screenshot before placing order."],
  },
];

function parsePkr(value: string) {
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function money(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-PK")}`;
}

function lineUnit(line: CartLine) {
  return parsePkr(line.price);
}

function lineOriginal(line: CartLine) {
  return parsePkr(line.orig || line.price);
}

function lineDiscount(line: CartLine) {
  return Math.max(0, lineOriginal(line) - lineUnit(line)) * line.quantity;
}

function lineTotal(line: CartLine) {
  return lineUnit(line) * line.quantity;
}

export function CheckoutPage() {
  const { cart, clearCart, reloadProducts } = useStore();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingCity, setShippingCity] = useState("Rawalpindi");
  const [shippingLine1, setShippingLine1] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    setShippingName((value) => value || currentUser.full_name || `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim());
    setShippingPhone((value) => value || currentUser.phone || "");
  }, [currentUser]);

  const subtotalBeforeDiscount = cart.reduce((sum, line) => sum + lineOriginal(line) * line.quantity, 0);
  const discountTotal = cart.reduce((sum, line) => sum + lineDiscount(line), 0);
  const deliveryCharges = 0;
  const grandTotal = subtotalBeforeDiscount - discountTotal + deliveryCharges;
  const selectedPayment = paymentOptions.find((option) => option.value === paymentMethod) ?? paymentOptions[0];

  if (cart.length === 0 && !done) {
    return (
      <main className="min-h-[70vh] bg-[linear-gradient(135deg,#fff8ee_0%,#f7efe3_52%,#fffdf8_100%)] px-4 py-16 text-center">
        <div className="mx-auto max-w-md rounded-[1.75rem] border border-[#eadbd4] bg-[#fffaf3]/90 p-8 shadow-xl shadow-[#7d0020]/8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#fff2d8] text-[#7d0020]">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold text-[#1a0808]" style={POPPINS}>Your cart is empty</h1>
          <p className="mt-3 text-sm text-[#72514e]">Add premium fabrics before checkout.</p>
          <Link to={ROUTES.cart} className="mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white" style={{ background: CRIMSON }}>
            View Cart
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (paymentMethod !== "cash" && !paymentProof) {
      setFormError("Upload payment screenshot for EasyPaisa, JazzCash, or Bank Transfer.");
      return;
    }
    setLoading(true);
    const response = await safeRequest(() => createCheckout({
      shipping_name: shippingName.trim(),
      shipping_phone: shippingPhone.trim(),
      shipping_line1: shippingLine1.trim(),
      shipping_city: shippingCity.trim() || "Rawalpindi",
      shipping_country: "Pakistan",
      payment_provider: paymentMethod,
      payment_screenshot: paymentProof,
      items: cart.map((line) => ({
        product_id: line.productId,
        variant_id: line.variantId,
        color_variant_id: line.colorVariantId ?? undefined,
        quantity: line.quantity,
      })),
      notes: notes.trim(),
    }));
    if (response) {
      setOrderNumber(response.order_number ?? "");
      setTrackingId(response.tracking_id ?? "");
      clearCart();
      await reloadProducts();
      setDone(true);
    }
    setLoading(false);
  }

  if (done) {
    return (
      <main className="min-h-[72vh] bg-[radial-gradient(circle_at_top_left,rgba(201,160,96,0.18),transparent_32%),linear-gradient(135deg,#fff8ee_0%,#f7efe3_52%,#fffdf8_100%)] px-4 py-16">
        <section className="mx-auto max-w-xl rounded-[2rem] border border-[#e1cfc0] bg-[#fffaf3]/90 p-8 text-center shadow-xl shadow-[#7d0020]/10 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
            <BadgeCheck className="h-8 w-8" />
          </div>
          <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.32em] text-[#9b7a43]">Order Received</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#1a0808]" style={POPPINS}>Thank you for your order</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#72514e]">
            Your Sardar-G Fabrics order has been placed successfully{orderNumber ? ` (${orderNumber})` : ""}. Payment confirmation will be updated by admin where required.
          </p>
          {trackingId && (
            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[#ead2a8] bg-[#fff8e8] p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#9b7a43]">Tracking Number</p>
              <p className="mt-1 text-2xl font-extrabold text-[#7d0020]" style={MONO}>{trackingId}</p>
            </div>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {trackingId && (
              <>
                <button type="button" onClick={() => window.open(`/receipt/${encodeURIComponent(trackingId)}/print`, "_blank", "noopener,noreferrer")} className="rounded-full border border-[#7d0020]/20 bg-white px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#7d0020]"><Download className="mr-2 inline h-4 w-4" />Download Receipt</button>
                <button type="button" onClick={() => window.open(`/receipt/${encodeURIComponent(trackingId)}/print`, "_blank", "noopener,noreferrer")} className="rounded-full border border-[#7d0020]/20 bg-white px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#7d0020]"><Printer className="mr-2 inline h-4 w-4" />Print Receipt</button>
                <button type="button" onClick={() => navigate(`${ROUTES.trackOrder}?q=${encodeURIComponent(trackingId)}`)} className="rounded-full px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white" style={{ background: CRIMSON }}>Track Order</button>
              </>
            )}
            <button type="button" onClick={() => navigate(ROUTES.shop)} className="rounded-full px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white" style={{ background: CRIMSON }}>Continue Shopping</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,rgba(201,160,96,0.18),transparent_32%),linear-gradient(135deg,#fff8ee_0%,#f7efe3_52%,#fffdf8_100%)] px-4 py-10 text-[#1a0808] sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.34em] text-[#7d0020]">Secure Checkout</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl" style={POPPINS}>Complete Your Order</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#72514e]">Confirm delivery details and choose a payment method.</p>
          </div>
          <Link to={ROUTES.cart} className="inline-flex w-fit items-center gap-2 rounded-full border border-[#7d0020]/15 bg-[#fff8ee] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#7d0020] shadow-sm shadow-[#7d0020]/8">
            Back to Cart
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-[1.5rem] border border-[#e1cfc0] bg-[#fffaf3]/90 p-5 shadow-xl shadow-[#7d0020]/8 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff2d8] text-[#7d0020]">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-extrabold" style={POPPINS}>Customer & Delivery</h2>
                  <p className="text-xs font-semibold text-[#72514e]">Fields marked required must be filled.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required>
                  <input name="shipping_name" value={shippingName} onChange={(event) => setShippingName(event.target.value)} required placeholder="Customer name" className="checkout-input" />
                </Field>
                <Field label="Phone" required>
                  <input name="shipping_phone" value={shippingPhone} onChange={(event) => setShippingPhone(event.target.value)} required type="tel" placeholder="03xx-xxxxxxx" className="checkout-input" />
                </Field>
                <Field label="City" className="sm:col-span-2">
                  <input name="shipping_city" value={shippingCity} onChange={(event) => setShippingCity(event.target.value)} placeholder="Rawalpindi" className="checkout-input" />
                </Field>
                <Field label="Delivery address" required className="sm:col-span-2">
                  <textarea name="shipping_line1" value={shippingLine1} onChange={(event) => setShippingLine1(event.target.value)} required rows={4} placeholder="House, street, area, nearby landmark" className="checkout-input resize-y rounded-2xl" />
                </Field>
                <Field label="Order note" className="sm:col-span-2">
                  <textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Optional stitching, delivery, or fabric note" className="checkout-input resize-y rounded-2xl" />
                </Field>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#e1cfc0] bg-[#fffaf3]/90 p-5 shadow-xl shadow-[#7d0020]/8 sm:p-6">
              <h2 className="font-extrabold" style={POPPINS}>Payment Method</h2>
              <p className="mt-1 text-xs font-semibold text-[#72514e]">Online transfer orders stay pending payment until admin confirms.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = paymentMethod === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPaymentMethod(option.value)}
                      className={`rounded-2xl border p-4 text-left transition ${selected ? "border-[#7d0020] bg-[#fff2ea] shadow-md shadow-[#7d0020]/10" : "border-[#eadbd4] bg-[#fffdf8] hover:border-[#c9a060]"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-[#7d0020] text-white" : "bg-[#fff2d8] text-[#7d0020]"}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-extrabold">{option.title}</span>
                          <span className="mt-1 block text-xs font-semibold text-[#72514e]">{option.subtitle}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedPayment.instructions && (
                <div className="mt-5 rounded-2xl border border-[#ead2a8] bg-[#fff8e8] p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#9b7a43]">{selectedPayment.title} Instructions</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5f4642]">
                    {selectedPayment.instructions.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: GOLD }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <label className="mt-4 block rounded-2xl border border-dashed border-[#c9a060] bg-[#fffdf8] p-4 text-sm font-bold text-[#5f4642]">
                    Upload Payment Screenshot
                    <input type="file" accept="image/*" onChange={(event) => setPaymentProof(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs font-semibold" />
                    {paymentProof && <span className="mt-2 block text-xs text-[#7d0020]">{paymentProof.name}</span>}
                  </label>
                </div>
              )}
            </section>

            {formError && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{formError}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white shadow-lg shadow-[#7d0020]/18 disabled:opacity-60"
              style={{ background: CRIMSON }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              {loading ? "Placing Order..." : "Place Order"}
            </button>
          </form>

          <OrderSummary cart={cart} subtotalBeforeDiscount={subtotalBeforeDiscount} discountTotal={discountTotal} deliveryCharges={deliveryCharges} grandTotal={grandTotal} />
        </div>
      </div>
    </main>
  );
}

function Field({ label, required = false, className = "", children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7a6267]">
        {label} {required && <span className="text-[#7d0020]">*</span>}
      </span>
      {children}
    </label>
  );
}

function OrderSummary({
  cart,
  subtotalBeforeDiscount,
  discountTotal,
  deliveryCharges,
  grandTotal,
}: {
  cart: CartLine[];
  subtotalBeforeDiscount: number;
  discountTotal: number;
  deliveryCharges: number;
  grandTotal: number;
}) {
  return (
    <aside className="rounded-[1.5rem] border border-[#e1cfc0] bg-[#fffaf3]/90 p-5 shadow-xl shadow-[#7d0020]/8 lg:sticky lg:top-28">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#eadbd4] pb-5">
        <div>
          <h2 className="font-extrabold" style={POPPINS}>Order Summary</h2>
          <p className="mt-1 text-xs font-semibold text-[#72514e]">{cart.length} item{cart.length === 1 ? "" : "s"}</p>
        </div>
        <span className="h-1 w-16 rounded-full" style={{ background: GOLD }} />
      </div>

      <div className="space-y-4">
        {cart.map((line) => {
          const variantBadges: string[] = [];
          if (line.selectedColor) variantBadges.push(line.selectedColor);
          if (line.selectedSize) variantBadges.push(line.selectedSize);
          if (line.selectedFabric) variantBadges.push(line.selectedFabric);
          if (line.isStitched !== undefined && line.selectedFabric) {
            variantBadges.push(line.isStitched ? "Stitched" : "Unstitched");
          }
          return (
            <div key={line.cartKey} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl bg-[#fff8ee] p-3">
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-[#f0e4df]">
                {line.img ? <img src={line.img} alt={line.name} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-extrabold leading-snug">{line.name}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a6460]">Qty {line.quantity}</p>
                {variantBadges.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {variantBadges.map((badge) => (
                      <span key={badge} className="inline-flex items-center rounded-full bg-[#f0e4df] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#7d4a30]">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <SummaryMini label="Unit" value={money(lineUnit(line))} />
                  <SummaryMini label="Total" value={money(lineTotal(line))} strong />
                </div>
                {lineDiscount(line) > 0 && (
                  <p className="mt-2 text-xs font-extrabold text-[#7d0020]">Discount {money(lineDiscount(line))}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 space-y-3 border-t border-[#eadbd4] pt-5 text-sm">
        <SummaryRow label="Subtotal" value={money(subtotalBeforeDiscount)} />
        {discountTotal > 0 && <SummaryRow label="Discount" value={`-${money(discountTotal)}`} accent />}
        <SummaryRow label="Delivery charges" value={deliveryCharges ? money(deliveryCharges) : "To be confirmed"} />
        <div className="border-t border-[#eadbd4] pt-4">
          <SummaryRow label="Grand Total" value={money(grandTotal)} strong />
        </div>
      </div>
    </aside>
  );
}

function SummaryMini({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#8a6460]">{label}</p>
      <p className={`mt-0.5 font-extrabold ${strong ? "text-[#7d0020]" : "text-[#1a0808]"}`} style={MONO}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, accent = false, strong = false }: { label: string; value: string; accent?: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "text-lg" : ""}`}>
      <span className={`font-bold ${strong ? "text-[#1a0808]" : "text-[#72514e]"}`}>{label}</span>
      <span className={`text-right font-extrabold ${accent || strong ? "text-[#7d0020]" : "text-[#1a0808]"}`} style={MONO}>{value}</span>
    </div>
  );
}
