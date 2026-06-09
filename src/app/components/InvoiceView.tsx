import { POPPINS } from "@/app/constants";
import type { ApiTrackedOrder } from "@/services/types";
import sardarjeeLogo from "@/imports/Sardar_jee_3.jpg";

function money(value: number | string | null | undefined) {
  return `PKR ${Number(value ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function paymentLabel(status: string | null | undefined) {
  const s = status ?? "";
  if (s === "success") return "Paid";
  if (s === "pending") return "Pending";
  if (s === "refunded") return "Refunded";
  if (s === "cancelled") return "Cancelled";
  return s || "Pending";
}

/** Normalise a potentially-partial order so every field has a safe default. */
function safeOrder(order: ApiTrackedOrder) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const customer = order?.customer ?? { name: "", phone: "", city: "", country: "" };
  return {
    ...order,
    number: order?.number ?? "—",
    tracking_id: order?.tracking_id ?? "",
    payment_status: order?.payment_status ?? "pending",
    payment_method: order?.payment_method ?? "cash",
    grand_total: order?.grand_total ?? "0",
    subtotal: order?.subtotal ?? "0",
    discount_total: order?.discount_total ?? "0",
    created_at: order?.created_at ?? new Date().toISOString(),
    customer: {
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      city: customer.city ?? "",
      country: customer.country ?? "",
    },
    items,
  };
}

export function InvoiceView({ order: rawOrder }: { order: ApiTrackedOrder }) {
  const order = safeOrder(rawOrder);
  const invoiceSubtotal = order.items.reduce((sum, item) => sum + Number(item.unit_price ?? 0) * (item.quantity ?? 1), 0);
  const invoiceDiscount = order.items.reduce((sum, item) => {
    const lineSubtotal = Number(item.unit_price ?? 0) * (item.quantity ?? 1);
    return sum + Math.max(0, lineSubtotal - Number(item.line_total ?? 0));
  }, 0);
  const grandTotal = Number(order.grand_total ?? 0);
  const createdAt = new Date(order.created_at);

  return (
    <div className="invoice-print-area">
      <div className="invoice-card mx-auto max-w-[860px] rounded-[1.75rem] border border-[#e1cfc0] bg-[radial-gradient(circle_at_top_left,rgba(201,160,96,0.16),transparent_28%),linear-gradient(135deg,#fff8ee_0%,#fff1e7_48%,#fff9f0_100%)] p-5 text-[#251116] shadow-2xl shadow-[#7d0020]/10 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none sm:p-7">
        <div className="avoid-print-break rounded-[1.25rem] border border-[#ead2c2] bg-white/62 p-4 shadow-sm print:bg-white print:p-3 sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-[#e2c7a2] bg-[#1b070c] p-1.5 shadow-md">
                <img src={sardarjeeLogo} alt="Sardar-G Fabrics" className="h-full w-full rounded-xl object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-extrabold leading-none text-[#251116]" style={POPPINS}>SARDAR-G FABRICS</h3>
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#7d0020]">Men&apos;s Suiting &amp; Stitching Cloth House</p>
                <div className="mt-3 space-y-1 text-[11px] leading-4 text-[#6f5960]">
                  <p>Shop # G-5, Malikabad Shopping Mall, Rehmanabad Chowk, Murree Road, Rawalpindi</p>
                  <p className="font-extrabold text-[#251116]">0315-9457186</p>
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl font-extrabold uppercase tracking-[0.16em] text-[#251116]">Invoice</p>
              <div className="mt-1 flex items-center gap-2 sm:justify-end">
                <p className="text-xs font-extrabold text-[#7d0020]">#{order.number}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">{paymentLabel(order.payment_status)}</span>
              </div>
              {order.tracking_id && <p className="mt-1 text-[11px] font-extrabold text-[#7d0020]">Tracking: {order.tracking_id}</p>}
              <p className="mt-2 text-[11px] font-semibold text-[#7b6870]">{createdAt.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="avoid-print-break mt-5 print:mt-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8a7780]">Billed To</p>
          <p className="mt-1 text-base font-extrabold text-[#251116]">{order.customer.name || "Walk-in Customer"}</p>
          {order.customer.phone && <p className="mt-0.5 text-xs font-semibold text-[#7b6870]">{order.customer.phone}</p>}
        </div>

        <div className="mt-7 overflow-x-auto print:mt-4 print:overflow-visible">
          <table className="w-full min-w-[680px] text-sm print:min-w-0 print:text-[11px]">
            <thead>
              <tr className="border-y border-[#e7cfc4] bg-[#fff2ea] text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#7b6870]">
                <th className="py-3 pr-3">Item Description</th>
                <th className="px-3 py-3 text-center">Qty</th>
                <th className="px-3 py-3 text-right">Unit Price</th>
                <th className="px-3 py-3 text-right">Discount</th>
                <th className="py-3 pl-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => {
                const lineSubtotal = Number(item.unit_price ?? 0) * (item.quantity ?? 1);
                const lineDiscount = Math.max(0, lineSubtotal - Number(item.line_total ?? 0));
                return (
                  <tr key={`${item.sku ?? idx}-${item.product_name ?? idx}`} className="border-b border-[#eadbd4] align-top">
                    <td className="py-4 pr-3 print:py-2">
                      <p className="font-extrabold text-[#251116]">{item.product_name || "Item"}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a7780]">{item.sku || "SKU"} | Standard</p>
                    </td>
                    <td className="px-3 py-4 text-center font-bold text-[#251116] print:py-2">{item.quantity ?? 1}</td>
                    <td className="px-3 py-4 text-right font-semibold print:py-2">{money(item.unit_price)}</td>
                    <td className="px-3 py-4 text-right font-semibold print:py-2">{money(lineDiscount)}</td>
                    <td className="py-4 pl-3 text-right font-extrabold text-[#7d0020] print:py-2">{money(item.line_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="avoid-print-break mt-5 flex justify-end print:mt-3">
          <div className="w-full max-w-sm space-y-3 text-sm">
            <div className="flex justify-between gap-6"><span className="font-bold text-[#7b6870]">Subtotal</span><span className="font-extrabold">{money(invoiceSubtotal || order.subtotal)}</span></div>
            <div className="flex justify-between gap-6"><span className="font-bold text-[#7b6870]">Total Discount</span><span className="font-extrabold">{money(invoiceDiscount || order.discount_total)}</span></div>
            <div className="flex justify-between gap-6"><span className="font-bold text-[#7b6870]">Payment Method</span><span className="font-extrabold uppercase">{order.payment_method || "cash"}</span></div>
            <div className="border-t border-[#e7cfc4] pt-3">
              <div className="flex items-center justify-between gap-6 text-lg"><span className="font-extrabold text-[#251116]">GRAND TOTAL</span><span className="font-extrabold text-[#7d0020]">{money(grandTotal)}</span></div>
            </div>
          </div>
        </div>

        <div className="avoid-print-break mt-8 border-t border-[#eadbd4] pt-5 text-center print:mt-4 print:pt-3">
          <p className="text-xs font-semibold text-[#8a7780]">Thank you for shopping with Sardar-G Fabrics.</p>
          <p className="mt-1 text-xs font-semibold text-[#8a7780]">Please keep this invoice for your records.</p>
        </div>

        <div className="avoid-print-break mt-5 border-t border-[#eadbd4] pt-4 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8a7780] print:mt-3 print:pt-3">
          <p>Powered by SPARK TECHNOLOGY</p>
          <p className="mt-1">PH: 03480235167</p>
        </div>
      </div>
    </div>
  );
}
