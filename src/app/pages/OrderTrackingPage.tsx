import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, PackageCheck, Search, Truck } from "lucide-react";
import { CRIMSON, GOLD, MONO, POPPINS } from "@/app/constants";
import { trackOrder } from "@/services/orders";
import type { ApiTrackedOrder } from "@/services/types";

const progressSteps = ["placed", "confirmed", "processing", "out_for_delivery", "delivered"];

const statusLabels: Record<string, string> = {
  pending: "Pending",
  placed: "Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  out_for_delivery: "Out For Delivery",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  returned: "Returned",
};

function money(value: number | string) {
  return `PKR ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function paymentLabel(status: string) {
  if (status === "success") return "Paid";
  if (status === "pending") return "Pending Verification";
  if (status === "refunded") return "Refunded";
  if (status === "cancelled") return "Cancelled";
  return status || "Pending";
}

export function OrderTrackingPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [order, setOrder] = useState<ApiTrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadOrder(value: string) {
    if (!value.trim()) {
      setError("Enter a tracking ID or phone number.");
      return;
    }
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      setOrder(await trackOrder(value.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const value = params.get("q");
    if (value) void loadOrder(value);
  }, [params]);

  function submit(event: FormEvent) {
    event.preventDefault();
    void loadOrder(query);
  }

  const currentIndex = order ? Math.max(0, progressSteps.indexOf(order.status)) : 0;
  const terminal = order ? ["cancelled", "refunded", "returned"].includes(order.status) : false;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(201,160,96,0.18),transparent_32%),linear-gradient(135deg,#fff8ee_0%,#f7efe3_52%,#fffdf8_100%)] px-4 py-12 text-[#1a0808] sm:px-6 lg:px-10">
      <section className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-9 text-center">
          <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.4em] text-[#7d0020]">Order Tracking</p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl" style={POPPINS}>Track Your Order</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[#72514e]">Enter your tracking ID or phone number to view payment, products, and delivery progress.</p>
        </motion.div>

        <form onSubmit={submit} className="mx-auto flex max-w-3xl flex-col gap-3 rounded-[1.5rem] border border-[#e1cfc0] bg-white/88 p-4 shadow-xl shadow-[#7d0020]/8 sm:flex-row sm:p-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a6460]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="SG-20260607-4832 or phone number"
              className="w-full rounded-full border border-[#eadbd4] bg-[#fffaf3] py-3.5 pl-11 pr-5 text-sm font-semibold text-[#1a0808] outline-none focus:border-[#7d0020] focus:bg-white"
            />
          </div>
          <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white disabled:opacity-60" style={{ background: CRIMSON }}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Tracking..." : "Track"}
          </button>
        </form>

        {error && <p className="mx-auto mt-5 max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}

        {order && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[1.5rem] border border-[#e1cfc0] bg-white/90 p-5 shadow-xl shadow-[#7d0020]/8 sm:p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#9b7a43]">Tracking ID</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-[#7d0020]" style={MONO}>{order.tracking_id || order.number}</h2>
                  <p className="mt-1 text-xs font-semibold text-[#72514e]">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white ${terminal ? "bg-red-700" : "bg-emerald-700"}`}>
                  {statusLabels[order.status] || order.status}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Customer" value={order.customer.name} />
                <Info label="Phone" value={order.customer.phone} />
                <Info label="Payment Method" value={order.payment_method.replace("_", " ")} />
                <Info label="Payment Status" value={paymentLabel(order.payment_status)} />
                <Info label="Order Status" value={statusLabels[order.status] || order.status} />
                <Info label="Grand Total" value={money(order.grand_total)} />
              </div>

              <div className="mt-6 space-y-3">
                {order.items.map((item) => (
                  <div key={`${item.sku}-${item.product_name}`} className="flex items-center justify-between gap-4 rounded-2xl bg-[#fff8ee] p-4">
                    <div>
                      <p className="font-extrabold">{item.product_name}</p>
                      <p className="text-xs font-semibold text-[#72514e]">SKU {item.sku} · Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-extrabold text-[#7d0020]">{money(item.line_total)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#e1cfc0] bg-white/90 p-5 shadow-xl shadow-[#7d0020]/8 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <Truck className="h-5 w-5" style={{ color: GOLD }} />
                <h3 className="text-xl font-extrabold" style={POPPINS}>Delivery Progress</h3>
              </div>
              <div className="space-y-4">
                {progressSteps.map((step, index) => {
                  const active = !terminal && index <= currentIndex;
                  return (
                    <div key={step} className="flex gap-4">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white ${active ? "bg-[#7d0020]" : "bg-[#d7c8bd]"}`}>
                        {active ? <CheckCircle2 className="h-5 w-5" /> : <PackageCheck className="h-4 w-4" />}
                      </div>
                      <div className="pb-3">
                        <p className="font-extrabold">{statusLabels[step]}</p>
                        <p className="text-xs font-semibold text-[#72514e]">{active ? "Completed or in progress" : "Waiting"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {terminal && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">This order is marked {statusLabels[order.status] || order.status}.</p>}
            </section>
          </motion.div>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#fff8ee] p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8a6460]">{label}</p>
      <p className="mt-1 text-sm font-extrabold capitalize text-[#1a0808]">{value || "-"}</p>
    </div>
  );
}
