import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { InvoiceView } from "@/app/components/InvoiceView";
import { fetchSaleInvoice } from "@/services/admin";
import type { ApiTrackedOrder } from "@/services/types";

export function AdminInvoicePrintPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const [invoice, setInvoice] = useState<ApiTrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      if (!saleId) {
        setError("Invoice ID is missing. Please go back and try again.");
        setLoading(false);
        return;
      }
      try {
        const data = await fetchSaleInvoice(saleId);
        if (cancelled) return;
        if (!data) {
          setError("Invoice not found. The sale may have been removed.");
          setLoading(false);
          return;
        }
        setInvoice(data);
        document.title = `Invoice ${data.number ?? saleId}`;
        window.setTimeout(() => window.print(), 400);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load invoice. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  return (
    <main className="invoice-print-page">
      {invoice ? (
        <InvoiceView order={invoice} />
      ) : (
        <div className="no-print flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center text-[#251116]">
          {loading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7d0020] border-t-transparent" />
              <p className="text-sm font-semibold text-[#6f5960]">Loading invoice…</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold text-[#7d0020]">Invoice Not Found</p>
              <p className="max-w-md text-sm text-[#6f5960]">{error || "This invoice could not be loaded."}</p>
              <button
                onClick={() => window.close()}
                className="mt-2 rounded-full border border-[#e1cfc0] px-6 py-3 text-sm font-bold text-[#251116] transition hover:bg-[#f8f0e8]"
              >
                Close Tab
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
