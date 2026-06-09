import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { InvoiceView } from "@/app/components/InvoiceView";
import { trackOrder } from "@/services/orders";
import type { ApiTrackedOrder } from "@/services/types";

export function ReceiptPrintPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const [order, setOrder] = useState<ApiTrackedOrder | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadOrder() {
      if (!trackingId) {
        setError("Tracking ID is missing.");
        return;
      }
      try {
        const data = await trackOrder(trackingId);
        if (cancelled) return;
        setOrder(data);
        document.title = `Receipt ${data.tracking_id || data.number}`;
        window.setTimeout(() => window.print(), 350);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load receipt.");
      }
    }
    void loadOrder();
    return () => {
      cancelled = true;
    };
  }, [trackingId]);

  return (
    <main className="invoice-print-page">
      {order ? (
        <InvoiceView order={order} />
      ) : (
        <div className="no-print flex min-h-screen items-center justify-center text-sm text-[#251116]">
          {error || "Loading receipt..."}
        </div>
      )}
    </main>
  );
}
