import { Component, Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast, Toaster } from "sonner";
import {
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Settings2,
  ShieldAlert,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { CARD_GLASS, CRIMSON, GOLD, POPPINS } from "@/app/constants";
import { InvoiceView } from "@/app/components/InvoiceView";
import { PasswordInput } from "@/app/components/PasswordInput";
import {
  createHomepageStat,
  createPosSale,
  deleteAdminCareer,
  deleteAdminProduct,
  deleteAdminReview,
  deleteHomepageStat,
  fetchAdminDashboard,
  fetchAdminCareers,
  fetchAdminHomepage,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminReviews,
  fetchInventory,
  fetchOrderEvents,
  fetchSaleInvoice,
  fetchSales,
  refundSale,
  updateInventoryStock,
  saveAdminProduct,
  saveAdminCareer,
  saveHomepageDisplay,
  saveHomepageHero,
  saveHomepageStory,
  updateAdminOrder,
  updateAdminReview,
  updateHomepageStat,
  type AdminDashboard,
  type AdminHomepage,
  type AdminPaginated,
  type InventoryMove,
  type InventoryRow,
  type SaleRecord,
} from "@/services/admin";
import { loginAdmin, logoutAdmin, type AdminSession } from "@/services/adminAuth";
import { API_BASE_URL, AUTH_REQUIRED_EVENT, ApiRequestError, getStoredTokens, resolveMediaUrl } from "@/services/api";
import type { ApiProduct, ApiProductColorVariant, ApiReview, ApiTrackedOrder } from "@/services/types";
import type { ApiCareerOpportunity } from "@/services/types";
import sardarjeeLogo from "@/imports/Sardar_jee_3.jpg";

type AdminTab = "dashboard" | "products" | "inventory" | "pos" | "orders" | "override" | "sales" | "reviews" | "careers";
type ModalKey = null | "product" | "deleteProduct" | "career" | "deleteCareer" | "stock" | "orderDetail" | "overrideConfirm" | "hero" | "story" | "stat" | "display" | "invoice";
type ToastKind = "success" | "error" | "info";
type PageMeta = Pick<AdminPaginated<unknown>, "count" | "page" | "page_size" | "total_pages">;

const adminTabs: { id: AdminTab; label: string; short: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { id: "products", label: "Products", short: "Products", icon: PackagePlus },
  { id: "inventory", label: "Inventory", short: "Stock", icon: Boxes },
  { id: "pos", label: "POS", short: "POS", icon: ShoppingCart },
  { id: "orders", label: "Order Records", short: "Orders", icon: ClipboardList },
  { id: "override", label: "Order Override", short: "Override", icon: Settings2 },
  { id: "sales", label: "Sales Records", short: "Sales", icon: Receipt },
  { id: "reviews", label: "Reviews", short: "Reviews", icon: Star },
  { id: "careers", label: "Careers / Opportunities", short: "Careers", icon: BriefcaseBusiness },
];

const orderStatuses = ["pending", "placed", "confirmed", "processing", "packed", "out_for_delivery", "delivered", "cancelled", "refunded"];
const paymentStatuses = ["pending", "authorized", "success", "failed", "refunded", "cancelled"];
const paymentMethods = ["cash", "easypaisa", "jazzcash", "bank_transfer"];
const statTypes = [
  ["total_products", "Total products"],
  ["total_orders", "Total orders"],
  ["total_sales", "Total sales"],
  ["total_customers", "Total customers"],
  ["total_reviews", "Total reviews"],
  ["average_rating", "Average rating"],
  ["low_stock", "Low stock"],
];
const defaultPageMeta: PageMeta = { count: 0, page: 1, page_size: 50, total_pages: 1 };

function money(value: number | string | null | undefined) {
  return `PKR ${Number(value ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function percent(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}%`;
}

function manualDiscountAmount(value: string | number, lineSubtotal: number) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const numeric = Number(raw.replace("%", ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  const amount = raw.includes("%") ? lineSubtotal * (numeric / 100) : numeric;
  return Math.min(lineSubtotal, Math.max(0, amount));
}

function notify(kind: ToastKind, message: string) {
  if (kind === "success") toast.success(message);
  if (kind === "error") toast.error(message);
  if (kind === "info") toast.info(message);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function firstImage(product: ApiProduct | null | undefined) {
  return resolveMediaUrl(product?.main_image || product?.images?.[0]?.image);
}

function productSku(product: ApiProduct) {
  return product.sku || product.variants?.[0]?.sku || `SKU-${product.id}`;
}

type ColorVariantFormRow = {
  uid: string;
  id?: number;
  color_name: string;
  color_hex: string;
  stock: number;
  image?: string | null;
};

const QUICK_PRODUCT_COLORS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#050505" },
  { name: "Navy Blue", hex: "#0B1F4D" },
  { name: "Sky Blue", hex: "#87CEEB" },
  { name: "Olive Green", hex: "#6B7D2A" },
  { name: "Dark Green", hex: "#0B3D2E" },
  { name: "Brown", hex: "#7A4A24" },
  { name: "Beige", hex: "#D8C3A5" },
  { name: "Grey", hex: "#808080" },
  { name: "Maroon", hex: "#800020" },
  { name: "Cream", hex: "#FFF4D6" },
  { name: "Gold", hex: "#C9A060" },
];

function toColorRows(variants: ApiProductColorVariant[] | undefined): ColorVariantFormRow[] {
  return (variants ?? []).map((variant) => ({
    uid: String(variant.id),
    id: variant.id,
    color_name: variant.color_name,
    color_hex: variant.color_hex ?? "",
    stock: variant.stock ?? 0,
    image: resolveMediaUrl(variant.image_url || variant.image),
  }));
}

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [homepage, setHomepage] = useState<AdminHomepage | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [orders, setOrders] = useState<ApiTrackedOrder[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [history, setHistory] = useState<InventoryMove[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [careers, setCareers] = useState<ApiCareerOpportunity[]>([]);
  const [orderEvents, setOrderEvents] = useState<InventoryMove[]>([]);
  const [productMeta, setProductMeta] = useState<PageMeta>(defaultPageMeta);
  const [orderMeta, setOrderMeta] = useState<PageMeta>(defaultPageMeta);
  const [inventoryMeta, setInventoryMeta] = useState<PageMeta>(defaultPageMeta);
  const [historyMeta, setHistoryMeta] = useState<PageMeta>(defaultPageMeta);
  const [salesMeta, setSalesMeta] = useState<PageMeta>(defaultPageMeta);
  const [reviewMeta, setReviewMeta] = useState<PageMeta>(defaultPageMeta);
  const [careerMeta, setCareerMeta] = useState<PageMeta>(defaultPageMeta);
  const [eventMeta, setEventMeta] = useState<PageMeta>(defaultPageMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [topbarHeight, setTopbarHeight] = useState(120);
  const [loadedTabs, setLoadedTabs] = useState<Partial<Record<AdminTab, boolean>>>({});

  function initializeAdminAuth() {
    setCheckingAuth(true);
    setError("");
    setSession({ authenticated: Boolean(getStoredTokens()?.access) });
    setCheckingAuth(false);
  }

  function markTabLoaded(tabKey: AdminTab) {
    setLoadedTabs((current) => current[tabKey] ? current : { ...current, [tabKey]: true });
  }

  function resetAdminSession() {
    setSession({ authenticated: false });
    setDashboard(null);
    setHomepage(null);
    setProducts([]);
    setOrders([]);
    setInventory([]);
    setHistory([]);
    setSales([]);
    setCareers([]);
    setReviews([]);
    setOrderEvents([]);
    setLoadedTabs({});
    setLoading(false);
    setError("");
  }

  async function loadDashboardData(showLoader = true) {
    if (!session?.authenticated) return;
    if (!getStoredTokens()?.access) {
      resetAdminSession();
      return;
    }
    if (showLoader) setLoading(true);
    setError("");
    try {
      setDashboard(await fetchAdminDashboard());
      markTabLoaded("dashboard");
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      setError(message);
      notify("error", message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function loadTabData(nextTab: AdminTab, force = false) {
    if (!session?.authenticated) return;
    if (!getStoredTokens()?.access) {
      resetAdminSession();
      return;
    }
    if (!force && loadedTabs[nextTab]) return;

    const showLoader = !loadedTabs[nextTab];
    if (showLoader) setLoading(true);

    try {
      if (nextTab === "dashboard") {
        await loadDashboardData(true);
        return;
      }

      if (nextTab === "pos") {
        if (!force && loadedTabs.products) {
          markTabLoaded("pos");
          return;
        }
        const rows = await fetchAdminProducts({ page: 1, page_size: 20 });
        setProducts(rows.results);
        setProductMeta(rows);
        markTabLoaded("pos");
        markTabLoaded("products");
        return;
      }

      if (nextTab === "override") {
        const [orderRows, eventRows] = await Promise.all([
          fetchAdminOrders({ page: 1, page_size: 20 }),
          fetchOrderEvents({ page: 1, page_size: 20 }),
        ]);
        setOrders(orderRows.results);
        setOrderMeta(orderRows);
        setOrderEvents(eventRows.results);
        setEventMeta(eventRows);
        markTabLoaded("override");
        markTabLoaded("orders");
        return;
      }

      if (nextTab === "products") {
        if (!force && loadedTabs.pos) {
          markTabLoaded("products");
          return;
        }
        const rows = await fetchAdminProducts({ page: 1, page_size: 20 });
        setProducts(rows.results);
        setProductMeta(rows);
        markTabLoaded("products");
        return;
      }
      if (nextTab === "inventory") {
        const rows = await fetchInventory({ page: 1, page_size: 20, records_page: 1 });
        setInventory(rows.records);
        setInventoryMeta({ count: rows.records_count, page: rows.records_page, page_size: rows.records_page_size, total_pages: rows.records_total_pages });
        setHistory(rows.history);
        setHistoryMeta({ count: rows.history_count, page: rows.history_page, page_size: rows.history_page_size, total_pages: rows.history_total_pages });
        markTabLoaded("inventory");
        return;
      }
      if (nextTab === "orders") {
        const rows = await fetchAdminOrders({ page: 1, page_size: 20 });
        setOrders(rows.results);
        setOrderMeta(rows);
        markTabLoaded("orders");
        return;
      }
      if (nextTab === "sales") {
        const rows = await fetchSales({ page: 1, page_size: 20 });
        setSales(rows.results);
        setSalesMeta(rows);
        markTabLoaded("sales");
        return;
      }
      if (nextTab === "reviews") {
        const rows = await fetchAdminReviews({ page: 1, page_size: 20 });
        setReviews(rows.results);
        setReviewMeta(rows);
        markTabLoaded("reviews");
        return;
      }
      if (nextTab === "careers") {
        const rows = await fetchAdminCareers({ page: 1, page_size: 20 });
        setCareers(rows.results);
        setCareerMeta(rows);
        markTabLoaded("careers");
      }
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      setError(message);
      notify("error", message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    initializeAdminAuth();
  }, []);

  useEffect(() => {
    function handleAuthRequired() {
      resetAdminSession();
    }

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
  }, []);

  useEffect(() => {
    if (session?.authenticated) {
      void loadDashboardData(true);
    }
  }, [session?.authenticated]);

  useEffect(() => {
    if (session?.authenticated && tab !== "dashboard") {
      void loadTabData(tab);
    }
  }, [session?.authenticated, tab]);

  useEffect(() => {
    if (!session?.authenticated) {
      setError("");
    }
  }, [session?.authenticated]);

  async function handleLogout() {
    try {
      await logoutAdmin();
      notify("success", "Logged out securely.");
    } finally {
      resetAdminSession();
    }
  }

  const activeTab = useMemo(() => adminTabs.find((item) => item.id === tab) ?? adminTabs[0], [tab]);

  function handleLoggedIn(nextSession: AdminSession) {
    setError("");
    setTab("dashboard");
    setSession(nextSession);
  }

  if (checkingAuth) {
    return (
      <AdminBackground>
        <AdminSkeleton />
      </AdminBackground>
    );
  }

  if (!session?.authenticated) {
    return <AdminLoginPage onLoggedIn={handleLoggedIn} />;
  }

  const sidebarWidth = sidebarCollapsed ? "lg:pl-[5.5rem]" : "lg:pl-[17rem]";

  return (
    <AdminBackground>
      <Toaster richColors position="top-right" />
      <AdminSidebar
        active={tab}
        mobileOpen={mobileOpen}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed((current) => !current)}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        onTab={(nextTab) => {
          setTab(nextTab);
          setMobileOpen(false);
        }}
      />
      <AdminMobileNav active={tab} onTab={setTab} />
      <AdminTopbar
        title={activeTab.label}
        subtitle="Premium fabric operations, orders, inventory, and POS in one place."
        userEmail={session.user?.email ?? "Staff user"}
        collapsed={sidebarCollapsed}
        onHeightChange={setTopbarHeight}
        onMenu={() => setMobileOpen(true)}
        onRefresh={() => loadTabData(tab, true)}
        tab={tab}
        setTab={setTab}
      />
      <section className={`min-h-screen min-w-0 max-w-full overflow-x-hidden transition-[padding] duration-300 ease-out ${sidebarWidth}`}>
        <div className="mx-auto w-full max-w-[1680px] px-3 pb-24 sm:px-6 lg:px-6 lg:pb-8" style={{ paddingTop: topbarHeight + 24 }}>
          {error && <AlertBanner message={error} />}
          {loading ? (
            <AdminSkeleton />
          ) : (
            <AdminContentErrorBoundary>
              <div className="min-w-0 space-y-5 sm:space-y-6">
                {tab === "dashboard" && <Dashboard dashboard={dashboard} />}
                {tab === "products" && <Products products={products} meta={productMeta} setProducts={setProducts} setMeta={setProductMeta} reload={() => loadTabData("products", true)} />}
                {tab === "inventory" && <Inventory records={inventory} recordMeta={inventoryMeta} setRecords={setInventory} setRecordMeta={setInventoryMeta} history={history} historyMeta={historyMeta} setHistory={setHistory} setHistoryMeta={setHistoryMeta} reload={() => loadTabData("inventory", true)} />}
                {tab === "pos" && <Pos products={products} reload={() => loadTabData("pos", true)} />}
                {tab === "orders" && <Orders orders={orders} meta={orderMeta} setOrders={setOrders} setMeta={setOrderMeta} reload={() => loadTabData("orders", true)} />}
                {tab === "override" && <Override orders={orders} events={orderEvents} eventMeta={eventMeta} setEvents={setOrderEvents} setEventMeta={setEventMeta} reload={() => loadTabData("override", true)} />}
                {tab === "sales" && <Sales sales={sales} meta={salesMeta} setSales={setSales} setMeta={setSalesMeta} reload={() => loadTabData("sales", true)} />}
                {tab === "reviews" && <Reviews reviews={reviews} meta={reviewMeta} setReviews={setReviews} setMeta={setReviewMeta} reload={() => loadTabData("reviews", true)} />}
                {tab === "careers" && <CareersAdmin careers={careers} meta={careerMeta} setCareers={setCareers} setMeta={setCareerMeta} reload={() => loadTabData("careers", true)} />}
              </div>
            </AdminContentErrorBoundary>
          )}
        </div>
      </section>
    </AdminBackground>
  );
}

const AdminBackground = memo(function AdminBackground({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(201,160,96,0.16),transparent_30%),linear-gradient(135deg,#f8f4ec_0%,#f2e9dc_46%,#fffdf8_100%)]">
      {children}
    </main>
  );
});

const AdminSidebar = memo(function AdminSidebar({
  active,
  mobileOpen,
  collapsed,
  onTab,
  onClose,
  onCollapse,
  onLogout,
}: {
  active: AdminTab;
  mobileOpen: boolean;
  collapsed: boolean;
  onTab: (tab: AdminTab) => void;
  onClose: () => void;
  onCollapse: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <button
        aria-label="Close admin menu"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 lg:hidden ${mobileOpen ? "block" : "hidden"}`}
      />
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-[18rem] max-w-[86vw] overflow-x-hidden overflow-y-hidden border-r border-white/15 bg-[linear-gradient(180deg,#230811_0%,#13070b_48%,#080304_100%)] text-white shadow-2xl backdrop-blur-2xl transition-all duration-300 ease-out lg:translate-x-0 ${collapsed ? "lg:w-[5.5rem]" : "lg:w-[17rem]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full min-w-0 flex-col overflow-x-hidden p-4">
        <div className={`flex items-center ${collapsed ? "lg:justify-center" : "justify-between"} gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-3`}>
          <div className={`flex min-w-0 items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`}>
            <img src={sardarjeeLogo} alt="Sardar-Jee" className="h-11 w-11 flex-shrink-0 rounded-2xl object-cover ring-1 ring-[#d7ad62]/45" />
            <div className={`min-w-0 transition-all duration-300 ${collapsed ? "lg:pointer-events-none lg:w-0 lg:opacity-0" : "opacity-100"}`}>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#d7ad62]">SARDAR-JEE</p>
              <h1 className="truncate text-sm font-extrabold uppercase tracking-[0.18em]" style={POPPINS}>Admin Studio</h1>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 lg:hidden"><X className="h-4 w-4" /></button>
        </div>
        <button onClick={onCollapse} className="mt-3 hidden w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60 transition hover:bg-white/10 hover:text-white lg:flex">
          <ChevronLeft className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
          <span className={`transition-all duration-300 ${collapsed ? "lg:pointer-events-none lg:w-0 lg:opacity-0" : "opacity-100"}`}>Collapse</span>
        </button>
        <nav className="mt-7 flex min-w-0 flex-1 flex-col justify-start gap-2.5 overflow-y-auto overflow-x-hidden pr-1 xl:gap-3">
          {adminTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTab(id)}
              title={label}
              className={`group flex min-w-0 items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left text-sm font-semibold transition-all duration-[250ms] ease-out ${collapsed ? "lg:justify-center lg:px-3" : ""} ${active === id ? "bg-white text-[#18070b] shadow-xl shadow-black/15" : "text-white/62 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className={`h-4 w-4 ${active === id ? "text-[#b21f36]" : "text-[#d7ad62]"}`} />
              <span className={`min-w-0 truncate transition-all duration-300 ${collapsed ? "lg:pointer-events-none lg:w-0 lg:opacity-0" : "opacity-100"}`}>{label}</span>
            </button>
          ))}
        </nav>
        <button onClick={onLogout} className={`mt-6 flex w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white/70 transition-all duration-[250ms] ease-out hover:translate-y-[-1px] hover:bg-white/10 hover:text-white ${collapsed ? "lg:px-3" : ""}`}>
          <LogOut className="h-4 w-4" /> <span className={`transition-all duration-300 ${collapsed ? "lg:pointer-events-none lg:w-0 lg:opacity-0" : "opacity-100"}`}>Logout</span>
        </button>
        </div>
      </aside>
    </>
  );
});

function AdminMobileNav({ active, onTab }: { active: AdminTab; onTab: (tab: AdminTab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[#fffaf1]/95 px-2 py-2 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur-2xl lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {adminTabs.map(({ id, short, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTab(id)}
            className={`flex min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-bold ${active === id ? "text-white" : "border border-border bg-background text-foreground"}`}
            style={{ background: active === id ? CRIMSON : undefined }}
          >
            <Icon className="h-4 w-4" />
            <span className="whitespace-nowrap">{short}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

const AdminTopbar = memo(function AdminTopbar({
  title,
  subtitle,
  userEmail,
  collapsed,
  tab,
  setTab,
  onHeightChange,
  onMenu,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  userEmail: string;
  collapsed: boolean;
  tab: AdminTab;
  setTab: (tab: AdminTab) => void;
  onHeightChange: (height: number) => void;
  onMenu: () => void;
  onRefresh: () => void;
}) {
  const [quickSearch, setQuickSearch] = useState("");
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const syncHeight = () => onHeightChange(Math.ceil(node.getBoundingClientRect().height));
    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(node);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [collapsed, onHeightChange, tab, title, subtitle, userEmail]);

  function handleQuickSearch(value: string) {
    setQuickSearch(value);
    const query = value.toLowerCase();
    const match = adminTabs.find((item) => `${item.label} ${item.short} ${item.id}`.toLowerCase().includes(query));
    if (query.length > 2 && match) setTab(match.id);
  }

  return (
    <header ref={headerRef} className={`fixed left-0 right-0 top-0 z-30 max-w-full border-b border-black/5 bg-[#fffaf1]/85 px-3 py-3 shadow-sm backdrop-blur-2xl transition-[left] duration-300 ease-out sm:px-6 lg:left-[17rem] ${collapsed ? "lg:left-[5.5rem]" : ""}`}>
      <div className="mx-auto flex w-full max-w-[1680px] min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onMenu} className="rounded-2xl border border-border bg-background p-3 lg:hidden"><Menu className="h-4 w-4" /></button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Control Room</p>
            <h2 className="mt-1 truncate text-xl font-extrabold sm:text-2xl" style={POPPINS}>{title}</h2>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          </div>
        </div>
        <div className="-mx-1 flex min-w-0 items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          <div className="relative min-w-[13rem] flex-1 sm:min-w-[220px] xl:flex-none">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={quickSearch} onChange={(event) => handleQuickSearch(event.target.value)} placeholder="Quick search admin..." className="w-full rounded-full border border-border bg-background py-2 pl-10 pr-4 text-xs font-semibold outline-none focus:border-[#b21f36]" />
          </div>
          <div className="hidden rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground md:block">
            {userEmail}
          </div>
          <QuickAction label="Add Product" icon={Plus} onClick={() => setTab("products")} active={tab === "products"} />
          <QuickAction label="Open POS" icon={ShoppingCart} onClick={() => setTab("pos")} active={tab === "pos"} />
          <QuickAction label="View Orders" icon={ClipboardList} onClick={() => setTab("orders")} active={tab === "orders"} />
          <button onClick={onRefresh} className="flex-shrink-0 rounded-full border border-border bg-background px-4 py-2 text-xs font-bold transition hover:border-[#b21f36]">Refresh</button>
        </div>
      </div>
    </header>
  );
});

function QuickAction({ label, icon: Icon, active, onClick }: { label: string; icon: ComponentType<{ className?: string }>; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${active ? "text-white" : "border border-border bg-background text-foreground hover:border-[#b21f36]"}`} style={{ background: active ? CRIMSON : undefined }}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Panel({ children, title, action, className = "" }: { children: ReactNode; title: string; action?: ReactNode; className?: string }) {
  return (
    <section className={`${CARD_GLASS} relative h-full min-h-0 min-w-0 max-w-full overflow-hidden rounded-3xl p-3 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 text-base font-extrabold sm:text-lg" style={POPPINS}>{title}</h2>
        {action && <div className="max-w-full overflow-x-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "gold" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-700",
    gold: "bg-[#f4e7c7] text-[#805314]",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${tones[tone]}`}>{children}</span>;
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "gold" {
  if (["delivered", "success", "active", "approved"].includes(status)) return "success";
  if (["cancelled", "failed", "rejected", "archived", "refunded", "returned"].includes(status)) return "danger";
  if (["pending", "draft"].includes(status)) return "warning";
  return "gold";
}

function paymentStatusLabel(status: string) {
  if (status === "success") return "Paid";
  if (status === "pending") return "Pending Verification";
  if (status === "refunded") return "Refunded";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function paymentMethodLabel(method: string | null | undefined) {
  if (!method) return "unknown";
  if (method === "cod") return "cash";
  return String(method).replace(/_/g, " ");
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="invoice-modal fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden bg-black/55 p-3 backdrop-blur-sm print:static print:block print:h-auto print:min-h-0 print:bg-white print:p-0 print:backdrop-blur-0 sm:p-4">
      <section className={`invoice-modal-content max-h-[92vh] w-full max-w-[calc(100vw-1.5rem)] overflow-y-auto overflow-x-hidden rounded-[1.5rem] border border-white/25 bg-white p-4 shadow-2xl print:m-0 print:max-h-none print:min-h-0 print:w-full print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none sm:max-w-[calc(100vw-2rem)] sm:rounded-[2rem] sm:p-6 ${wide ? "lg:max-w-5xl" : "lg:max-w-2xl"}`}>
        <div className="mb-5 flex min-w-0 items-center justify-between gap-4 print:hidden">
          <h3 className="min-w-0 text-lg font-extrabold sm:text-xl" style={POPPINS}>{title}</h3>
          <button onClick={onClose} className="rounded-full border border-border p-2 transition hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  icon: Icon = ShieldAlert,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
        <Icon className="mb-3 h-6 w-6" />
        <p className="text-sm">{message}</p>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button onClick={onCancel} className="rounded-full border border-border px-5 py-3 text-sm font-bold">Cancel</button>
        <button onClick={onConfirm} className="rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white">{confirmLabel}</button>
      </div>
    </Modal>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-border bg-white/55 p-5 text-center sm:p-8">
      <Sparkles className="mx-auto h-8 w-8 text-[#b88738]" />
      <h3 className="mt-3 text-lg font-extrabold" style={POPPINS}>{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function PaginationControls({
  meta,
  onPage,
  onPageSize,
}: {
  meta: PageMeta;
  onPage: (page: number) => void;
  onPageSize: (pageSize: number) => void;
}) {
  if (meta.count <= 50) return null;
  const pages = Array.from({ length: Math.min(5, meta.total_pages) }, (_, index) => {
    const start = Math.max(1, Math.min(meta.page - 2, meta.total_pages - 4));
    return start + index;
  }).filter((page) => page <= meta.total_pages);

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-muted-foreground">Total records: {meta.count.toLocaleString()} · Page {meta.page} of {meta.total_pages}</p>
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <select value={meta.page_size} onChange={(event) => onPageSize(Number(event.target.value))} className="rounded-full border border-border bg-background px-3 py-2 text-xs font-bold">
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
        <button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} className="rounded-full border border-border px-3 py-2 text-xs font-bold disabled:opacity-40">Previous</button>
        {pages.map((page) => (
          <button key={page} onClick={() => onPage(page)} className={`h-9 min-w-9 rounded-full px-3 text-xs font-bold ${page === meta.page ? "text-white" : "border border-border bg-background"}`} style={{ background: page === meta.page ? CRIMSON : undefined }}>{page}</button>
        ))}
        <button disabled={meta.page >= meta.total_pages} onClick={() => onPage(meta.page + 1)} className="rounded-full border border-border px-3 py-2 text-xs font-bold disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

function AlertBanner({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
      {message}
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 lg:p-8 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-[2rem] bg-white/65 shadow-sm" />
      ))}
    </div>
  );
}

function AdminLoginPage({ onLoggedIn }: { onLoggedIn: (session: AdminSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const nextSession = await loginAdmin(email, password);
      toast.success("Welcome back.");
      onLoggedIn(nextSession);
    } catch (loginError) {
      if (loginError instanceof ApiRequestError) {
        if (loginError.status === 0) {
          setError(`Backend is not reachable or CORS is blocking the request. Check that the backend is running and VITE_API_BASE_URL is set to ${API_BASE_URL}.`);
        } else if (loginError.status === 400) {
          setError("Wrong email or password.");
        } else if (loginError.status === 403) {
          setError("This user is not staff or superuser.");
        } else {
          setError(loginError.message);
        }
      } else {
        setError(getErrorMessage(loginError));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen max-w-full items-center justify-center overflow-x-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(201,160,96,0.2),transparent_34%),linear-gradient(135deg,#16070b_0%,#050505_58%,#270912_100%)] px-3 py-8 text-white sm:px-4 sm:py-16">
      <Toaster richColors position="top-right" />
      <section className="w-full max-w-md rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl sm:rounded-[2rem] sm:p-8">
        <div className="mb-6 inline-flex max-w-full rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60 sm:tracking-[0.35em]">Staff Access</div>
        <h1 className="text-2xl font-extrabold sm:text-3xl" style={POPPINS}>Admin Login</h1>
        {error && <div className="mt-5 rounded-2xl border border-red-300/40 bg-red-500/15 p-3 text-sm text-red-100">{error}</div>}
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Admin email" required className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-white/35" />
          <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-white/35" iconClassName="text-white/70 hover:text-white hover:bg-white/10 focus:ring-white/20" />
          <button type="submit" disabled={loading} className="rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60" style={{ background: CRIMSON }}>
            {loading ? "Signing in..." : "Login to Dashboard"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ dashboard }: { dashboard: AdminDashboard | null }) {
  const [range, setRange] = useState<7 | 30>(7);
  const [view, setView] = useState(dashboard);

  useEffect(() => {
    setView(dashboard);
  }, [dashboard]);

  if (!view) return <EmptyState title="Dashboard is ready" message="Live metrics will appear as orders, products, reviews, and POS sales are created." />;

  async function changeRange(days: 7 | 30) {
    setRange(days);
    try {
      setView(await fetchAdminDashboard({ days }));
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  const kpis = [
    { label: "Total Sales", value: money(view.total_sales), icon: BadgeDollarSign, trend: "Paid + delivered", tone: "dark" },
    { label: "POS Sales", value: money(view.pos_sales), icon: Receipt, trend: "Store revenue", tone: "gold" },
    { label: "Total Profit", value: money(view.total_profit), icon: Sparkles, trend: "Revenue minus buy price", tone: "light" },
    { label: "POS Profit", value: money(view.pos_profit), icon: ShoppingCart, trend: "Store profit", tone: "light" },
    { label: "Orders", value: view.total_orders, icon: ClipboardList, trend: "Online + POS", tone: "light" },
    { label: "Products", value: view.total_products, icon: PackagePlus, trend: "Active catalog", tone: "light" },
    { label: "Customers", value: view.customers_count, icon: UserCircle, trend: "Unique buyers", tone: "light" },
    { label: "Reviews", value: view.approved_reviews, icon: Star, trend: `${view.average_rating.toFixed(1)} avg rating`, tone: "light" },
    { label: "Low Stock", value: view.low_stock_count, icon: AlertTriangle, trend: "Needs attention", tone: "danger" },
  ];
  const chartTotal = view.sales_chart_data.reduce((sum, row) => sum + row.total, 0);
  const lastOrder = view.recent_orders[0];

  return (
    <div className="space-y-6 lg:space-y-7">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 xl:grid-cols-4 2xl:grid-cols-7">
        {kpis.map(({ label, value, icon: Icon, trend, tone }) => (
          <div key={label} className={`flex min-h-[132px] min-w-0 flex-col justify-between rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${tone === "dark" ? "border-[#2a0b12] bg-[#13070b] text-white" : tone === "danger" ? "border-rose-100 bg-rose-50" : tone === "gold" ? "border-[#ead8b4] bg-[#fff7e8]" : "border-white/70 bg-white/75 backdrop-blur-xl"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${tone === "dark" ? "text-white/50" : "text-muted-foreground"}`}>{label}</p>
                <p className="mt-2 break-words text-xl font-extrabold">{value}</p>
              </div>
              <div className={`rounded-2xl p-2.5 ${tone === "dark" ? "bg-white/10 text-[#d7ad62]" : "bg-[#f5dfb5] text-[#8b5a18]"}`}><Icon className="h-4 w-4" /></div>
            </div>
            <p className={`mt-3 text-xs ${tone === "dark" ? "text-white/45" : "text-muted-foreground"}`}>{trend}</p>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)] 2xl:gap-6">
        <Panel
          title="Sales Analytics"
          action={(
            <div className="flex items-center gap-2">
              <Badge tone="gold">{range} days</Badge>
              {[7, 30].map((days) => (
                <button key={days} onClick={() => changeRange(days as 7 | 30)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${range === days ? "text-white" : "border border-border bg-background"}`} style={{ background: range === days ? CRIMSON : undefined }}>{days}D</button>
              ))}
            </div>
          )}
        >
          <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#13070b] p-4 text-white"><p className="text-xs text-white/50">Range Revenue</p><p className="mt-1 text-2xl font-extrabold">{money(chartTotal)}</p></div>
            <div className="rounded-2xl border border-border bg-background/70 p-4"><p className="text-xs text-muted-foreground">Average / Day</p><p className="mt-1 text-xl font-extrabold">{money(chartTotal / range)}</p></div>
            <div className="rounded-2xl border border-border bg-background/70 p-4"><p className="text-xs text-muted-foreground">Latest Order</p><p className="mt-1 truncate text-sm font-extrabold">{lastOrder?.number ?? "No orders yet"}</p></div>
          </div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CRIMSON }} /> Sales revenue
            <span className="ml-3 h-2.5 w-2.5 rounded-full" style={{ background: GOLD }} /> Active points
          </div>
          {view.sales_chart_data.length ? (
            <div className="h-[18rem] min-w-0 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={view.sales_chart_data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CRIMSON} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={CRIMSON} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,90,60,0.16)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7a6b5d" }} />
                  <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "#7a6b5d" }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 18, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 16px 40px rgba(0,0,0,0.12)" }} />
                  <Area type="monotone" dataKey="total" name="Sales" stroke={CRIMSON} strokeWidth={3} fill="url(#salesGradient)" dot={{ r: 3, fill: GOLD, stroke: CRIMSON, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState title="No sales chart yet" message="Completed orders and POS sales will draw this chart automatically." />}
        </Panel>
        <Panel title="Recent Activity" action={<Badge tone="gold">Live feed</Badge>}>
          <div className="space-y-3">
            {view.recent_orders.slice(0, 5).map((order) => (
               <div key={order.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/75 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{order.number}</p>
                  <p className="truncate text-xs text-muted-foreground">{order.customer.name || "Customer"} · {money(order.grand_total)}</p>
                </div>
                <Badge tone={statusTone(order.status)}>{order.status}</Badge>
              </div>
            ))}
            {!view.recent_orders.length && <EmptyState title="No recent activity" message="Order activity will show here." />}
          </div>
        </Panel>
      </div>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)] 2xl:gap-6">
        <Panel title="Recent Orders" action={<Badge tone="neutral">{view.recent_orders.length} latest</Badge>}><OrdersTable orders={view.recent_orders} compact /></Panel>
        <Panel title="Low Stock Alerts">
          {view.low_stock_products.length ? (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground"><th className="py-3">Product</th><th>SKU</th><th>Stock</th></tr></thead>
                <tbody>{view.low_stock_products.map((row) => (
                  <tr key={`${row.product}-${row.sku}`} className="border-t border-border">
                    <td className="py-3 font-bold">{row.product}</td>
                    <td>{row.sku}</td>
                    <td><Badge tone="danger">{row.quantity} / {row.threshold}</Badge></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <EmptyState title="Stock looks healthy" message="Low stock products will appear here automatically." />}
        </Panel>
      </div>
    </div>
  );
}

function Products({
  products,
  meta,
  setProducts,
  setMeta,
  reload,
}: {
  products: ApiProduct[];
  meta: PageMeta;
  setProducts: (products: ApiProduct[]) => void;
  setMeta: (meta: PageMeta) => void;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [modal, setModal] = useState<ModalKey>(null);
  const [selected, setSelected] = useState<ApiProduct | null>(null);
  const [ordering, setOrdering] = useState("-created_at");

  function matchesCurrentFilters(product: ApiProduct) {
    const term = query.trim().toLowerCase();
    const haystack = [
      product.name,
      productSku(product),
      product.category?.name ?? "",
    ].join(" ").toLowerCase();
    const matchesQuery = !term || haystack.includes(term);
    const productStatus = product.status ?? "draft";
    const matchesStatus =
      status === "all" ||
      (status === "active" && productStatus === "active") ||
      (status === "draft" && productStatus === "draft") ||
      (status === "archived" && productStatus === "archived");
    return matchesQuery && matchesStatus;
  }

  async function handleProductSaved(savedProduct: ApiProduct) {
    const shouldRefetch =
      meta.page !== 1 ||
      ordering !== "-created_at" ||
      !matchesCurrentFilters(savedProduct);

    if (shouldRefetch) {
      await loadProducts(meta.page, meta.page_size);
      return;
    }

    const existingIndex = products.findIndex((product) => product.id === savedProduct.id);
    if (existingIndex >= 0) {
      const next = products.map((product) => product.id === savedProduct.id ? savedProduct : product);
      setProducts(next);
      return;
    }

    const nextCount = meta.count + 1;
    setProducts([savedProduct, ...products].slice(0, meta.page_size));
    setMeta({
      ...meta,
      count: nextCount,
      total_pages: Math.max(1, Math.ceil(nextCount / meta.page_size)),
    });
  }

  async function loadProducts(page = meta.page, pageSize = meta.page_size) {
    try {
      const rows = await fetchAdminProducts({
        page,
        page_size: pageSize,
        search: query,
        status: status === "all" ? "" : status,
        ordering,
      });
      setProducts(rows.results);
      setMeta(rows);
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProducts(1, meta.page_size), 250);
    return () => window.clearTimeout(timer);
  }, [query, status, ordering]);

  async function deleteProduct() {
    if (!selected) return;
    try {
      const res = await deleteAdminProduct(selected.id);
      if (res && res.archived) {
        notify("success", "Product archived successfully.");
      } else {
        notify("success", "Product deleted successfully.");
      }
      setProducts(products.filter((p) => p.id !== selected.id));
      setModal(null);
      setSelected(null);
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <Toolbar
        title="Products"
        search={query}
        setSearch={setQuery}
        placeholder="Search product, SKU, category..."
        right={(
          <>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="draft">Inactive</option>
              <option value="archived">Archived</option>
            </select>
            <select value={ordering} onChange={(event) => setOrdering(event.target.value)} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold">
              <option value="-created_at">Newest</option>
              <option value="name">Name A-Z</option>
              <option value="base_price">Sale price low</option>
              <option value="-base_price">Sale price high</option>
              <option value="cost_price">Buy price low</option>
              <option value="-cost_price">Buy price high</option>
            </select>
            <button onClick={() => { setSelected(null); setModal("product"); }} className="rounded-full px-5 py-2 text-sm font-bold text-white" style={{ background: CRIMSON }}><Plus className="mr-2 inline h-4 w-4" />Add Product</button>
          </>
        )}
      />
      <Panel title="Catalog" action={<Badge tone="gold">{meta.count} records</Badge>}>
        {products.length ? (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[1320px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground"><th className="py-3">Product</th><th>Category</th><th>SKU</th><th>Buy Price</th><th>Sale Price</th><th>Sale</th><th>Discount</th><th>Final Price</th><th>Placement</th><th>Stock</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>{products.map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <ProductThumb product={product} />
                      <div><p className="font-extrabold">{product.name}</p><p className="line-clamp-1 max-w-xs text-xs text-muted-foreground">{product.description || "No description"}</p></div>
                    </div>
                  </td>
                  <td>{product.category?.name || "General"}</td>
                  <td>{productSku(product)}</td>
                  <td className="font-bold">{money(product.cost_price)}</td>
                  <td className="font-bold">{money(product.selling_price || product.base_price)}</td>
                  <td><Badge tone={product.has_discount ? "danger" : "success"}>{product.has_discount ? "On Sale" : "Regular"}</Badge></td>
                  <td>{product.has_discount ? percent(product.discount_percent) : "-"}</td>
                  <td className="font-bold">{money(product.effective_price)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {product.show_in_men && <Badge tone="neutral">Men</Badge>}
                      {product.show_in_wedding && <Badge tone="gold">Wedding</Badge>}
                      {product.show_in_fabrics && <Badge tone="success">Fabrics</Badge>}
                      {!product.show_in_men && !product.show_in_wedding && !product.show_in_fabrics && <span className="text-xs text-muted-foreground">-</span>}
                    </div>
                  </td>
                  <td><Badge tone={(product.stock ?? 0) <= 5 ? "danger" : "success"}>{product.stock ?? 0}</Badge></td>
                  <td><Badge tone={statusTone(product.status ?? "draft")}>{product.status ?? "draft"}</Badge></td>
                  <td className="text-right">
                    <button onClick={() => { setSelected(product); setModal("product"); }} className="mr-2 rounded-full border border-border px-3 py-2 text-xs font-bold"><Pencil className="inline h-3.5 w-3.5" /> Edit</button>
                    <button onClick={() => { setSelected(product); setModal("deleteProduct"); }} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600"><Trash2 className="inline h-3.5 w-3.5" /> Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState title="No products available yet." message="Add products from admin to make them appear on the public website and POS." action={<button onClick={() => setModal("product")} className="rounded-full px-5 py-3 text-sm font-bold text-white" style={{ background: CRIMSON }}>Add Product</button>} />}
        <PaginationControls meta={meta} onPage={(page) => loadProducts(page)} onPageSize={(pageSize) => loadProducts(1, pageSize)} />
      </Panel>
      {modal === "product" && <ProductModal product={selected} onClose={() => setModal(null)} onSaved={handleProductSaved} />}
      {modal === "deleteProduct" && <ConfirmModal title="Delete product?" message="This product has order history, so it will be archived instead of permanently deleted." confirmLabel="Delete Product" onCancel={() => setModal(null)} onConfirm={deleteProduct} />}
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }: { product: ApiProduct | null; onClose: () => void; onSaved: (product: ApiProduct) => Promise<void> }) {
  const [preview, setPreview] = useState(firstImage(product));
  const [colorRows, setColorRows] = useState<ColorVariantFormRow[]>(() => toColorRows(product?.color_variants));
  const [costPrice, setCostPrice] = useState(product?.cost_price ?? "0");
  const [sellingPrice, setSellingPrice] = useState(product?.selling_price ?? product?.base_price ?? "0");
  const [isOnSale, setIsOnSale] = useState(Boolean(product?.is_on_sale));
  const [discountPercent, setDiscountPercent] = useState(product?.discount_percent ?? "0");
  const [saving, setSaving] = useState(false);
  const variantStock = colorRows.reduce((total, row) => total + Number(row.stock || 0), 0);
  const hasColorRows = colorRows.length > 0;
  const selectedColorNames = new Set(colorRows.map((row) => row.color_name.trim().toLowerCase()).filter(Boolean));

  function addColorRow(color?: { name: string; hex: string }) {
    if (color && selectedColorNames.has(color.name.toLowerCase())) return;
    setColorRows((rows) => [
      ...rows,
      {
        uid: `new-${Date.now()}-${rows.length}`,
        color_name: color?.name ?? "",
        color_hex: color?.hex ?? "#000000",
        stock: 0,
      },
    ]);
  }

  function updateColorRow(uid: string, patch: Partial<ColorVariantFormRow>) {
    setColorRows((rows) => rows.map((row) => row.uid === uid ? { ...row, ...patch } : row));
  }

  function removeColorRow(uid: string) {
    setColorRows((rows) => rows.filter((row) => row.uid !== uid));
  }

  function colorInputValue(value: string) {
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      const discount = Number(discountPercent || 0);
      if (discount < 0 || discount > 100) {
        notify("error", "Discount percent must be between 0 and 100.");
        return;
      }
      form.set("is_on_sale", isOnSale ? "true" : "false");
      form.set("discount_percent", isOnSale ? String(discount) : "0");
      form.set("cost_price", String(costPrice || "0"));
      form.set("selling_price", String(sellingPrice || "0"));
      form.set("color_variants", JSON.stringify(colorRows.map((row) => ({
        id: row.id,
        color_name: row.color_name,
        color_hex: row.color_hex || null,
        stock: Number(row.stock || 0),
        image_field: `color_variant_image_${row.uid}`,
      }))));
      const savedProduct = await saveAdminProduct(form, product?.id);
      await onSaved(savedProduct);
      notify("success", product ? "Product updated." : "Product created.");
      onClose();
    } catch (error) {
      notify("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={product ? "Edit Product" : "Add Product"} onClose={onClose} wide>
      <form onSubmit={submit} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <div className="min-w-0">
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-muted">
            {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Image preview</div>}
          </div>
          <input name="image" type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }} className="mt-3 w-full rounded-2xl border border-border bg-background p-3 text-sm" />
        </div>
        <div className="grid min-w-0 gap-3">
          <input name="name" defaultValue={product?.name} required placeholder="Product name" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <input name="category" defaultValue={product?.category?.name ?? "General"} required placeholder="Category" className="rounded-2xl border border-border bg-background p-3" />
            <input name="sku" defaultValue={product ? productSku(product) : ""} placeholder="SKU" className="rounded-2xl border border-border bg-background p-3" />
            <input name="cost_price" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} required type="number" min="0" step="0.01" placeholder="Buy Price" className="rounded-2xl border border-border bg-background p-3" />
            <input name="selling_price" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} required type="number" min="0" step="0.01" placeholder="Sale Price" className="rounded-2xl border border-border bg-background p-3" />
            {hasColorRows ? (
              <input name="stock" value={variantStock} readOnly type="number" min="0" placeholder="Stock" className="cursor-not-allowed rounded-2xl border border-border bg-muted p-3 text-muted-foreground" />
            ) : (
              <input name="stock" defaultValue={product?.stock ?? 0} type="number" min="0" placeholder="Stock" className="rounded-2xl border border-border bg-background p-3" />
            )}
            <select name="status" defaultValue={product?.status ?? "active"} className="rounded-2xl border border-border bg-background p-3">
              <option value="active">Active</option>
              <option value="draft">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="rounded-3xl border border-border bg-secondary/40 p-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,180px)] sm:items-end">
              <label className="rounded-2xl border border-border bg-background p-3 text-sm font-semibold">
                <input
                  name="is_on_sale"
                  type="checkbox"
                  checked={isOnSale}
                  onChange={(event) => setIsOnSale(event.target.checked)}
                  className="mr-2"
                />
                On Sale
              </label>
              <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Discount Percent
                <input
                  name="discount_percent"
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  disabled={!isOnSale}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  className="rounded-2xl border border-border bg-background p-3 text-sm font-normal normal-case tracking-normal text-foreground disabled:bg-muted disabled:text-muted-foreground"
                />
              </label>
              <div className="rounded-2xl border border-border bg-background p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Final Price</p>
                <p className="mt-1 text-sm font-extrabold">
                  {isOnSale && Number(discountPercent) > 0
                    ? money(Number(sellingPrice || 0) - (Number(sellingPrice || 0) * Number(discountPercent || 0) / 100))
                    : money(Number(sellingPrice || 0))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Profit: {money((Number(sellingPrice || 0) - (isOnSale && Number(discountPercent) > 0 ? (Number(sellingPrice || 0) * Number(discountPercent || 0) / 100) : 0)) - Number(costPrice || 0))}</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-secondary/40 p-4">
            <div className="mb-3">
              <p className="text-sm font-extrabold">Website Placement</p>
              <p className="text-xs text-muted-foreground">Choose every shop section where this product should appear.</p>
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <label className="rounded-2xl border border-border bg-background p-3 text-sm">
                <input name="show_in_men" type="checkbox" defaultChecked={product?.show_in_men} className="mr-2" />
                Show in Men page
              </label>
              <label className="rounded-2xl border border-border bg-background p-3 text-sm">
                <input name="show_in_wedding" type="checkbox" defaultChecked={product?.show_in_wedding} className="mr-2" />
                Show in Wedding page
              </label>
              <label className="rounded-2xl border border-border bg-background p-3 text-sm">
                <input name="show_in_fabrics" type="checkbox" defaultChecked={product?.show_in_fabrics} className="mr-2" />
                Show in Fabrics page
              </label>
              <label className="rounded-2xl border border-border bg-background p-3 text-sm text-muted-foreground">
                <input type="checkbox" checked={isOnSale} readOnly className="mr-2" />
                Sale page uses On Sale
              </label>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-secondary/40 p-4">
            <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold">Colors / Variants</p>
                <p className="text-xs text-muted-foreground">Stock is calculated from color rows when variants exist.</p>
              </div>
              <button type="button" onClick={() => addColorRow()} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold shadow-sm"><Plus className="mr-1 inline h-3.5 w-3.5" />Custom Color</button>
            </div>
            <div className="mb-5 rounded-2xl border border-border bg-background/70 p-3">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Quick Colors</p>
              <div className="flex min-w-0 flex-wrap gap-2">
                {QUICK_PRODUCT_COLORS.map((color) => {
                  const selected = selectedColorNames.has(color.name.toLowerCase());
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => addColorRow(color)}
                      disabled={selected}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition ${selected ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-65" : "border-border bg-background hover:-translate-y-0.5 hover:shadow-md"}`}
                    >
                      <span className="h-5 w-5 rounded-full border border-black/10 shadow-inner ring-1 ring-white/70" style={{ background: color.hex }} />
                      {color.name}
                    </button>
                  );
                })}
                <button type="button" onClick={() => addColorRow()} className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-background px-3 py-2 text-xs font-bold hover:bg-secondary">
                  <Plus className="h-3.5 w-3.5" /> Custom Color
                </button>
              </div>
            </div>
            <div className="grid gap-3">
              {colorRows.map((row) => (
                <div key={row.uid} className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-8 w-8 flex-shrink-0 rounded-full border border-black/10 shadow-inner ring-2 ring-white" style={{ background: row.color_hex || "#000000" }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">{row.color_name || "Custom Color"}</p>
                        <p className="text-xs text-muted-foreground">Stock: {Number(row.stock || 0)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeColorRow(row.uid)} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Remove</button>
                  </div>
                  <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,120px)_minmax(0,1fr)] xl:items-end">
                    <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Color Name
                      <input value={row.color_name} onChange={(event) => updateColorRow(row.uid, { color_name: event.target.value })} placeholder="Color Name" className="h-12 min-w-0 max-w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground" />
                    </label>
                    <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Color Picker
                      <div className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)] gap-2">
                        <input
                          type="color"
                          value={colorInputValue(row.color_hex || "")}
                          onChange={(event) => updateColorRow(row.uid, { color_hex: event.target.value })}
                          className="h-12 w-14 cursor-pointer rounded-xl border border-border bg-background p-1 shadow-sm"
                          aria-label={`${row.color_name || "Custom color"} picker`}
                          title="Pick color"
                        />
                        <input
                          value={row.color_hex}
                          onChange={(event) => updateColorRow(row.uid, { color_hex: event.target.value })}
                          placeholder="#000000"
                          className="min-w-0 max-w-full rounded-xl border border-border bg-background px-3 text-sm font-normal uppercase tracking-normal text-foreground"
                          aria-label={`${row.color_name || "Custom color"} hex value`}
                        />
                      </div>
                    </label>
                    <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Stock
                      <input value={row.stock} onChange={(event) => updateColorRow(row.uid, { stock: Number(event.target.value || 0) })} type="number" min="0" placeholder="Stock" className="h-12 min-w-0 max-w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground" />
                    </label>
                    <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Optional Image
                      <input name={`color_variant_image_${row.uid}`} type="file" accept="image/*" className="min-h-12 w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-background p-2 text-xs font-normal normal-case tracking-normal text-foreground file:mr-3 file:max-w-full file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-foreground" />
                    </label>
                  </div>
                </div>
              ))}
              {!colorRows.length && <p className="rounded-2xl bg-background/70 p-3 text-xs text-muted-foreground">Select quick colors above or add a custom color. No placeholders are created until you choose one.</p>}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Total Variant Stock</p>
              <p className="text-2xl font-extrabold" style={{ color: CRIMSON }}>{variantStock}</p>
            </div>
          </div>
          <textarea name="description" defaultValue={product?.description} placeholder="Product description" className="min-h-28 rounded-2xl border border-border bg-background p-3" />
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="rounded-2xl border border-border p-3 text-sm"><input name="is_featured" type="checkbox" defaultChecked={product?.is_featured} className="mr-2" /> Featured</label>
            <label className="rounded-2xl border border-border p-3 text-sm"><input name="is_trending" type="checkbox" defaultChecked={product?.is_trending} className="mr-2" /> Trending</label>
            <label className="rounded-2xl border border-border p-3 text-sm"><input name="is_new_arrival" type="checkbox" defaultChecked={product?.is_new_arrival} className="mr-2" /> New Arrival</label>
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-3 text-sm font-bold">Cancel</button>
            <button disabled={saving} className="rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60" style={{ background: CRIMSON }}>{saving ? "Saving..." : "Save Product"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ProductThumb({ product }: { product: ApiProduct }) {
  const image = firstImage(product);
  return image ? <img src={image} alt={product.name} className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1e3ca] text-xs font-bold text-[#8b5a18]">No img</div>;
}

function Inventory({
  records,
  recordMeta,
  setRecords,
  setRecordMeta,
  history,
  historyMeta,
  setHistory,
  setHistoryMeta,
  reload,
}: {
  records: any[];
  recordMeta: PageMeta;
  setRecords: (records: any[]) => void;
  setRecordMeta: (meta: PageMeta) => void;
  history: InventoryMove[];
  historyMeta: PageMeta;
  setHistory: (history: InventoryMove[]) => void;
  setHistoryMeta: (meta: PageMeta) => void;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [status, setStatus] = useState("active");
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { quantity: number; threshold: number }>>({});
  const [filters, setFilters] = useState<{ products: string[]; colors: string[]; sizes: string[] }>({ products: [], colors: [], sizes: [] });
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});

  const productGroups = useMemo(() => {
    return (records as any[]).map((product) => {
      const variants = product.variants || [];
      const totalStock = variants.reduce((sum: number, v: any) => sum + Math.max(0, v.quantity), 0);
      const lowStockLimit = variants.reduce((sum: number, v: any) => sum + Math.max(0, v.low_stock_threshold), 0);
      const isOutOfStock = totalStock <= 0;
      const isLowStock = totalStock > 0 && totalStock <= lowStockLimit;
      return {
        productId: product.id,
        product: product.name,
        image: product.product_image,
        records: variants,
        totalStock,
        lowStockLimit,
        isLowStock,
        isOutOfStock,
      };
    });
  }, [records]);

  function syncDrafts(nextRecords: any[]) {
    setDrafts((current) => {
      const next = { ...current };
      for (const product of nextRecords) {
        for (const record of (product.variants || [])) {
          next[record.id] = next[record.id] ?? { quantity: record.quantity, threshold: record.low_stock_threshold };
        }
      }
      return next;
    });
  }

  function patchRecord(recordId: number, patch: Partial<InventoryRow>) {
    setRecords((records as any[]).map((product) => ({
      ...product,
      variants: (product.variants || []).map((record: any) => record.id === recordId ? { ...record, ...patch } : record)
    })));
  }

  async function loadRecords(page = recordMeta.page, pageSize = recordMeta.page_size) {
    try {
      const rows = await fetchInventory({
        records_page: page,
        page_size: pageSize,
        search: query,
        stock_filter: stockFilter,
        product: productFilter,
        color: colorFilter,
        size: sizeFilter,
        status: status,
      });
      setRecords(rows.records);
      setRecordMeta({ count: rows.records_count, page: rows.records_page, page_size: rows.records_page_size, total_pages: rows.records_total_pages });
      setFilters(rows.filters);
      syncDrafts(rows.records);
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  function updateDraft(recordId: number, patch: Partial<{ quantity: number; threshold: number }>) {
    setDrafts((current) => ({
      ...current,
      [recordId]: {
        quantity: current[recordId]?.quantity ?? 0,
        threshold: current[recordId]?.threshold ?? 5,
        ...patch,
      },
    }));
  }

  async function applyStockUpdate(record: InventoryRow, payload: { stock: number } | { delta: number }, action: string) {
    const previous = record;
    const nextStock = "stock" in payload ? Math.max(0, payload.stock) : Math.max(0, record.quantity + payload.delta);
    const apiPayload = "delta" in payload && record.quantity + payload.delta < 0 ? { stock: 0 } : payload;
    const actionKey = `${record.id}-${action}`;
    patchRecord(record.id, {
      quantity: nextStock,
      is_out_of_stock: nextStock <= 0,
      is_low_stock: nextStock <= record.low_stock_threshold,
    });
    updateDraft(record.id, { quantity: nextStock });
    setSavingAction(actionKey);
    try {
      const updated = await updateInventoryStock(record.id, apiPayload);
      patchRecord(record.id, {
        quantity: updated.stock,
        is_low_stock: updated.is_low_stock,
        is_out_of_stock: updated.is_out_of_stock,
      });
      updateDraft(record.id, { quantity: updated.stock });
      notify("success", "Stock updated");
    } catch (error) {
      patchRecord(record.id, previous);
      updateDraft(record.id, { quantity: previous.quantity });
      notify("error", getErrorMessage(error));
    } finally {
      setSavingAction(null);
    }
  }

  function commitStockInput(record: InventoryRow) {
    const draftStock = Math.max(0, drafts[record.id]?.quantity ?? record.quantity);
    if (draftStock === record.quantity) return;
    void applyStockUpdate(record, { stock: draftStock }, "input");
  }

  function toggleProduct(productId: number) {
    setExpandedProducts((current) => ({ ...current, [productId]: !current[productId] }));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecords(1, recordMeta.page_size), 250);
    return () => window.clearTimeout(timer);
  }, [query, stockFilter, productFilter, colorFilter, sizeFilter, status]);

  useEffect(() => {
    if (productFilter && productGroups.length === 1) {
      setExpandedProducts((current) => ({ ...current, [productGroups[0].productId]: true }));
    }
  }, [productFilter, productGroups]);

  function renderInventoryRows() {
    return productGroups.map((group) => {
      const expanded = expandedProducts[group.productId] ?? false;
      return (
        <Fragment key={group.productId}>
          <tr className="border-t border-border bg-[#fffaf1]/70">
            <td className="py-4">
              <button type="button" onClick={() => toggleProduct(group.productId)} className="flex w-full items-center gap-3 text-left">
                <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                <img src={resolveMediaUrl(group.image)} alt={group.product} className="h-12 w-12 rounded-2xl bg-muted object-cover" />
                <div>
                  <p className="font-extrabold">{group.product}</p>
                  <p className="text-xs text-muted-foreground">{group.records.length} variant{group.records.length === 1 ? "" : "s"} - click to {expanded ? "hide" : "view"}</p>
                </div>
              </button>
            </td>
            <td className="text-xs font-semibold text-muted-foreground">Product total</td>
            <td className="text-xs font-semibold text-muted-foreground">-</td>
            <td className="font-extrabold">{group.totalStock}</td>
            <td>{group.lowStockLimit}</td>
            <td><Badge tone={group.isOutOfStock ? "danger" : group.isLowStock ? "warning" : "success"}>{group.isOutOfStock ? "Out of stock" : group.isLowStock ? "Low stock" : "Healthy"}</Badge></td>
            <td className="text-xs font-semibold text-muted-foreground">Expand to update variants</td>
          </tr>
          {expanded && group.records.map((record) => (
            <tr key={record.id} className="border-t border-border">
              <td className="py-4 pl-10">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Variant</div>
              </td>
              <td>
                <div className="grid gap-1 text-xs sm:grid-cols-2">
                  <span><strong>Color:</strong> {record.color || "Default"}</span>
                  <span><strong>Size:</strong> {record.size || "-"}</span>
                  <span><strong>Fabric:</strong> {record.fabric || "-"}</span>
                  <span><strong>Stitching:</strong> {record.stitching || "-"}</span>
                </div>
              </td>
              <td>{record.sku}</td>
              <td>
                <input
                  value={drafts[record.id]?.quantity ?? record.quantity}
                  onChange={(event) => updateDraft(record.id, { quantity: Math.max(0, Number(event.target.value || 0)) })}
                  onBlur={() => commitStockInput(record)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  type="number"
                  min="0"
                  disabled={savingAction === `${record.id}-input`}
                  className="w-24 rounded-2xl border border-border bg-background px-3 py-2 text-sm font-extrabold disabled:opacity-60"
                />
              </td>
              <td>{record.low_stock_threshold}</td>
              <td><Badge tone={record.is_out_of_stock ? "danger" : record.is_low_stock ? "warning" : "success"}>{record.is_out_of_stock ? "Out of stock" : record.is_low_stock ? "Low stock" : "Healthy"}</Badge></td>
              <td>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 5, 10].map((amount) => (
                    <button key={`plus-${record.id}-${amount}`} disabled={savingAction === `${record.id}-plus-${amount}`} onClick={() => void applyStockUpdate(record, { delta: amount }, `plus-${amount}`)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-60">
                      {savingAction === `${record.id}-plus-${amount}` ? "..." : `+${amount}`}
                    </button>
                  ))}
                  {[1, 5].map((amount) => (
                    <button key={`minus-${record.id}-${amount}`} disabled={record.quantity <= 0 || savingAction === `${record.id}-minus-${amount}`} onClick={() => void applyStockUpdate(record, { delta: -amount }, `minus-${amount}`)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50">
                      {savingAction === `${record.id}-minus-${amount}` ? "..." : `-${amount}`}
                    </button>
                  ))}
                  <button disabled={savingAction === `${record.id}-stock-in`} onClick={() => void applyStockUpdate(record, { delta: 1 }, "stock-in")} className="rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60" style={{ background: CRIMSON }}>
                    {savingAction === `${record.id}-stock-in` ? "..." : "Stock In"}
                  </button>
                  <button disabled={record.quantity <= 0 || savingAction === `${record.id}-stock-out`} onClick={() => void applyStockUpdate(record, { delta: -1 }, "stock-out")} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50">
                    {savingAction === `${record.id}-stock-out` ? "..." : "Stock Out"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Fragment>
      );
    });
  }

  return (
    <div className="space-y-4">
      <Toolbar title="Inventory" search={query} setSearch={setQuery} placeholder="Search product, SKU, color, or size..." />
      <Panel title="Inventory Filters">
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-w-0 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold">
            <option value="active">Active Products</option>
            <option value="archived">Archived Products</option>
          </select>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="min-w-0 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold">
            <option value="">All stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
          <select value={productFilter} onChange={(event) => setProductFilter(event.target.value)} className="min-w-0 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold">
            <option value="">By product</option>
            {filters.products.map((product) => <option key={product} value={product}>{product}</option>)}
          </select>
          <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)} className="min-w-0 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold">
            <option value="">By color</option>
            {filters.colors.map((color) => <option key={color} value={color}>{color}</option>)}
          </select>
          <select value={sizeFilter} onChange={(event) => setSizeFilter(event.target.value)} className="min-w-0 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold">
            <option value="">By size</option>
            {filters.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <button onClick={() => { setStockFilter(""); setProductFilter(""); setColorFilter(""); setSizeFilter(""); setQuery(""); }} className="rounded-full border border-border bg-background px-4 py-3 text-sm font-bold">
            Clear filters
          </button>
        </div>
      </Panel>
      <div className="grid gap-4">
        <Panel title="Stock Table" action={<Badge tone="gold">{recordMeta.count} records</Badge>}>
          {records.length ? (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground"><th className="py-3">Product</th><th>Variant</th><th>SKU</th><th>Current Stock</th><th>Low Stock Limit</th><th>Status</th><th>Quick Update</th></tr></thead>
                <tbody>{renderInventoryRows()}</tbody>{/*
                  <tr key={record.id} className="border-t border-border">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <img src={resolveMediaUrl(record.product_image)} alt={record.product} className="h-12 w-12 rounded-2xl bg-muted object-cover" />
                        <div>
                          <p className="font-extrabold">{record.product}</p>
                          <p className="text-xs text-muted-foreground">{record.color || "Default"}{record.size ? ` · ${record.size}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td>{record.variant || "Default variant"}</td>
                    <td>{record.sku}</td>
                    <td>
                      <input
                        value={drafts[record.id]?.quantity ?? record.quantity}
                        onChange={(event) => updateDraft(record.id, { quantity: Math.max(0, Number(event.target.value || 0)) })}
                        onBlur={() => commitStockInput(record)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                        type="number"
                        min="0"
                        disabled={savingAction === `${record.id}-input`}
                        className="w-24 rounded-2xl border border-border bg-background px-3 py-2 text-sm font-extrabold disabled:opacity-60"
                      />
                    </td>
                    <td>{record.low_stock_threshold}</td>
                    <td><Badge tone={record.is_out_of_stock ? "danger" : record.is_low_stock ? "warning" : "success"}>{record.is_out_of_stock ? "Out of stock" : record.is_low_stock ? "Low stock" : "Healthy"}</Badge></td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        {[1, 5, 10].map((amount) => (
                          <button
                            key={`plus-${record.id}-${amount}`}
                            disabled={savingAction === `${record.id}-plus-${amount}`}
                            onClick={() => void applyStockUpdate(record, { delta: amount }, `plus-${amount}`)}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-60"
                          >
                            {savingAction === `${record.id}-plus-${amount}` ? "..." : `+${amount}`}
                          </button>
                        ))}
                        {[1, 5].map((amount) => (
                          <button
                            key={`minus-${record.id}-${amount}`}
                            disabled={record.quantity <= 0 || savingAction === `${record.id}-minus-${amount}`}
                            onClick={() => void applyStockUpdate(record, { delta: -amount }, `minus-${amount}`)}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
                          >
                            {savingAction === `${record.id}-minus-${amount}` ? "..." : `-${amount}`}
                          </button>
                        ))}
                        <button
                          disabled={savingAction === `${record.id}-stock-in`}
                          onClick={() => void applyStockUpdate(record, { delta: 1 }, "stock-in")}
                          className="rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                          style={{ background: CRIMSON }}
                        >
                          {savingAction === `${record.id}-stock-in` ? "..." : "Stock In"}
                        </button>
                        <button
                          disabled={record.quantity <= 0 || savingAction === `${record.id}-stock-out`}
                          onClick={() => void applyStockUpdate(record, { delta: -1 }, "stock-out")}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                        >
                          {savingAction === `${record.id}-stock-out` ? "..." : "Stock Out"}
                        </button>
                      </div>
                    </td>
                  </tr>
                */}
              </table>
            </div>
          ) : <EmptyState title="No inventory records" message="Inventory records are created automatically when products are added." />}
          <PaginationControls meta={recordMeta} onPage={(page) => loadRecords(page)} onPageSize={(pageSize) => loadRecords(1, pageSize)} />
        </Panel>
      </div>
    </div>
  );
}

type PosCartLine = {
  product: ApiProduct;
  variantId: number | null;
  colorVariantId: number | null;
  variantLabel: string;
  colorName: string;
  image: string;
  unitPrice: number;
  qty: number;
  discount: string;
  stock: number;
};

function Pos({ products, reload }: { products: ApiProduct[]; reload: () => Promise<void> }) {
  const activeProducts = products.filter((product) => product.status === "active");
  const categories = Array.from(new Set(activeProducts.map((product) => product.category?.name || "General")));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [invoice, setInvoice] = useState<ApiTrackedOrder | null>(null);
  const [variantProduct, setVariantProduct] = useState<ApiProduct | null>(null);

  const visible = activeProducts.filter((product) => {
    const matchesQuery = [product.name, productSku(product)].join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || product.category?.name === category;
    return matchesQuery && matchesCategory;
  });
  const total = cart.reduce((sum, line) => {
    const lineSubtotal = line.unitPrice * line.qty;
    return sum + Math.max(0, lineSubtotal - manualDiscountAmount(line.discount, lineSubtotal));
  }, 0);

  function findColorVariant(product: ApiProduct, variant: ApiProduct["variants"][number]) {
    return product.color_variants.find((item) => item.id === variant.color_variant)
      ?? product.color_variants.find((item) => item.color_name.toLowerCase() === String(variant.color || "").toLowerCase())
      ?? null;
  }

  function variantImage(product: ApiProduct, variant: ApiProduct["variants"][number], colorVariant = findColorVariant(product, variant)) {
    const variantImageUrl = variant.images?.[0] ? resolveMediaUrl(variant.images[0].thumbnail_url || variant.images[0].image_url || variant.images[0].thumbnail || variant.images[0].image) : "";
    if (variantImageUrl) return variantImageUrl;
    const colorImage = colorVariant?.images?.[0]
      ? resolveMediaUrl(colorVariant.images[0].thumbnail_url || colorVariant.images[0].image_url || colorVariant.images[0].thumbnail || colorVariant.images[0].image)
      : resolveMediaUrl(colorVariant?.image_url || colorVariant?.image || "");
    return colorImage || firstImage(product) || "";
  }

  function variantLabel(variant: ApiProduct["variants"][number], colorName?: string | null) {
    return [colorName || variant.color, variant.size, variant.fabric, variant.is_stitched ? "Stitched" : "Unstitched"].filter(Boolean).join(" / ");
  }

  function pushCartLine(line: PosCartLine) {
    setCart((rows) => {
      const existing = rows.find((row) => row.product.id === line.product.id && row.variantId === line.variantId && row.colorVariantId === line.colorVariantId);
      if (existing) {
        return rows.map((row) => row.product.id === line.product.id && row.variantId === line.variantId && row.colorVariantId === line.colorVariantId
          ? { ...row, qty: Math.min(row.stock, row.qty + 1) }
          : row);
      }
      return [...rows, line];
    });
  }

  function addSimpleProduct(product: ApiProduct) {
    const stock = Math.max(0, Number(product.total_stock ?? product.stock ?? 0));
    if (stock <= 0) {
      notify("error", "This product is out of stock.");
      return;
    }
    pushCartLine({
      product,
      variantId: null,
      colorVariantId: null,
      variantLabel: product.sku || "Standard",
      colorName: "",
      image: firstImage(product) || "",
      unitPrice: Number(product.final_price || product.effective_price || product.selling_price || product.base_price || 0),
      qty: 1,
      discount: "",
      stock,
    });
  }

  function openVariantSelection(product: ApiProduct) {
    const variants = product.variants.filter((variant) => variant.is_active);
    if (!variants.length) {
      addSimpleProduct(product);
      return;
    }
    setVariantProduct(product);
  }

  function addSelectedVariant(product: ApiProduct, variant: ApiProduct["variants"][number]) {
    const stock = Math.max(0, Number(variant.stock ?? 0));
    if (stock <= 0) return;
    const colorVariant = findColorVariant(product, variant);
    pushCartLine({
      product,
      variantId: variant.id,
      colorVariantId: colorVariant?.id ?? null,
      variantLabel: variantLabel(variant, colorVariant?.color_name),
      colorName: colorVariant?.color_name || variant.color || "",
      image: variantImage(product, variant, colorVariant),
      unitPrice: Number(variant.final_price || variant.effective_price || variant.sale_price || variant.price || product.final_price || product.effective_price || 0),
      qty: 1,
      discount: "",
      stock,
    });
    setVariantProduct(null);
  }

  async function checkout(showInvoice: boolean) {
    try {
      const sale = await createPosSale({
        items: cart.map((line) => {
          const lineSubtotal = line.unitPrice * line.qty;
          const payload: Record<string, unknown> = {
            product_id: line.product.id,
            quantity: line.qty,
            unit_price: line.unitPrice,
            discount: manualDiscountAmount(line.discount, lineSubtotal),
          };
          if (line.variantId) payload.variant_id = line.variantId;
          if (line.colorVariantId) payload.color_variant_id = line.colorVariantId;
          return payload;
        }),
        payment_method: paymentMethod,
        customer_name: customerName || "Walk-in Customer",
        customer_phone: customerPhone,
      });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      if (showInvoice) setInvoice(sale);
      notify("success", showInvoice ? `Invoice ${sale.number} generated.` : `Sale ${sale.number} completed.`);
      if (!showInvoice) await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function closeInvoice() {
    setInvoice(null);
    await reload();
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <Panel title="Product Search" action={<Badge tone="gold">{visible.length} available</Badge>}>
        <div className="mb-5 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <SearchBox value={query} onChange={setQuery} placeholder="Scan/search product or SKU..." />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-w-0 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {visible.length ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {visible.map((product) => (
              <button key={product.id} onClick={() => openVariantSelection(product)} className="group min-w-0 rounded-[2rem] border border-border bg-background p-3 text-left transition hover:-translate-y-1 hover:border-[#b21f36] hover:shadow-xl">
                <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-muted">{firstImage(product) ? <img src={firstImage(product)} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>}</div>
                <p className="mt-3 truncate font-extrabold">{product.name}</p>
                <div className="mt-2 flex min-w-0 items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-muted-foreground">{productSku(product)}</span>
                  <span className="font-bold">{money(product.effective_price)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : <EmptyState title="No POS products" message="Active products from the database will appear here." />}
      </Panel>
      <Panel title="Cart Sidebar" className="xl:sticky xl:top-24 xl:h-fit">
        <div className="grid gap-3">
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name optional" className="rounded-2xl border border-border bg-background p-3" />
          <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Customer phone optional" className="rounded-2xl border border-border bg-background p-3" />
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="rounded-2xl border border-border bg-background p-3">
            {paymentMethods.map((method) => <option key={method} value={method}>{paymentMethodLabel(method)}</option>)}
          </select>
        </div>
        <div className="mt-5 space-y-3">
          {cart.length ? cart.map((line) => (
            <div key={`${line.product.id}-${line.variantId ?? "product"}-${line.colorVariantId ?? "base"}`} className="rounded-3xl bg-background/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-muted">
                    {line.image ? <img src={line.image} alt={line.product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No image</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold">{line.product.name}</p>
                    <p className="text-xs text-muted-foreground">{line.variantLabel || line.product.sku || "Standard"}</p>
                    <p className="text-xs text-muted-foreground">{money(line.unitPrice)}</p>
                  </div>
                </div>
                <button onClick={() => setCart((rows) => rows.filter((row) => !(row.product.id === line.product.id && row.variantId === line.variantId && row.colorVariantId === line.colorVariantId)))} className="text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                <div className="flex items-center gap-2">
                  <button onClick={() => setCart((rows) => rows.map((row) => row.product.id === line.product.id && row.variantId === line.variantId && row.colorVariantId === line.colorVariantId ? { ...row, qty: Math.max(1, row.qty - 1) } : row))} className="rounded-full border px-3 py-1"><ChevronLeft className="h-3 w-3" /></button>
                  <span className="w-8 text-center text-sm font-bold">{line.qty}</span>
                  <button onClick={() => setCart((rows) => rows.map((row) => row.product.id === line.product.id && row.variantId === line.variantId && row.colorVariantId === line.colorVariantId ? { ...row, qty: Math.min(row.stock, row.qty + 1) } : row))} className="rounded-full border px-3 py-1">+</button>
                </div>
                <label className="grid gap-1 rounded-2xl border border-[#c9a060]/45 bg-[#fff8eb] px-3 py-2 text-left shadow-sm">
                  <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#7d0020]">
                    <BadgeDollarSign className="h-3.5 w-3.5" /> Discount
                  </span>
                  <input
                    value={line.discount}
                    onChange={(event) => setCart((rows) => rows.map((row) => row.product.id === line.product.id && row.variantId === line.variantId && row.colorVariantId === line.colorVariantId ? { ...row, discount: event.target.value } : row))}
                    placeholder="Discount % or amount"
                    className="min-w-0 bg-transparent text-xs font-bold text-[#13070b] outline-none placeholder:text-[#8b6b34]/70"
                  />
                  <span className="text-[10px] font-semibold text-muted-foreground">Manual POS discount</span>
                </label>
              </div>
            </div>
          )) : <EmptyState title="Cart is empty" message="Tap a product to add it to the invoice." />}
        </div>
        <div className="mt-5 rounded-3xl bg-[#13070b] p-5 text-white">
          <p className="text-sm text-white/55">Total</p>
          <p className="mt-1 text-3xl font-extrabold">{money(total)}</p>
        </div>
        <div className="mt-4 grid gap-2">
          <button disabled={!cart.length} onClick={() => checkout(false)} className="w-full rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: CRIMSON }}><CheckCircle2 className="mr-2 inline h-4 w-4" />Complete Sale</button>
          <button disabled={!cart.length} onClick={() => checkout(true)} className="w-full rounded-full border border-[#7d0020]/25 bg-background px-5 py-3 text-sm font-bold disabled:opacity-50" style={{ color: CRIMSON }}><Receipt className="mr-2 inline h-4 w-4" />Complete Sale + Invoice</button>
        </div>
      </Panel>
      {variantProduct && (
        <PosVariantPickerModal
          product={variantProduct}
          onClose={() => setVariantProduct(null)}
          onSelect={addSelectedVariant}
        />
      )}
      {invoice && <InvoiceModal order={invoice} onClose={closeInvoice} />}
    </div>
  );
}

function PosVariantPickerModal({
  product,
  onClose,
  onSelect,
}: {
  product: ApiProduct;
  onClose: () => void;
  onSelect: (product: ApiProduct, variant: ApiProduct["variants"][number]) => void;
}) {
  const variants = product.variants.filter((variant) => variant.is_active);

  function findColorVariant(variant: ApiProduct["variants"][number]) {
    return product.color_variants.find((item) => item.id === variant.color_variant)
      ?? product.color_variants.find((item) => item.color_name.toLowerCase() === String(variant.color || "").toLowerCase())
      ?? null;
  }

  function optionImage(variant: ApiProduct["variants"][number], colorVariant = findColorVariant(variant)) {
    const variantImageUrl = variant.images?.[0]
      ? resolveMediaUrl(variant.images[0].thumbnail_url || variant.images[0].image_url || variant.images[0].thumbnail || variant.images[0].image)
      : "";
    if (variantImageUrl) return variantImageUrl;
    const colorImage = colorVariant?.images?.[0]
      ? resolveMediaUrl(colorVariant.images[0].thumbnail_url || colorVariant.images[0].image_url || colorVariant.images[0].thumbnail || colorVariant.images[0].image)
      : resolveMediaUrl(colorVariant?.image_url || colorVariant?.image || "");
    return colorImage || firstImage(product) || "";
  }

  function optionLabel(variant: ApiProduct["variants"][number], colorVariant = findColorVariant(variant)) {
    return [colorVariant?.color_name || variant.color, variant.size, variant.fabric, variant.is_stitched ? "Stitched" : "Unstitched"].filter(Boolean).join(" / ");
  }

  return (
    <Modal title={`Choose Variant • ${product.name}`} onClose={onClose}>
      <div className="space-y-3">
        {variants.length ? variants.map((variant) => {
          const colorVariant = findColorVariant(variant);
          const stock = Math.max(0, Number(variant.stock ?? 0));
          const selectable = stock > 0;
          const image = optionImage(variant, colorVariant);
          const finalPrice = money(variant.final_price || variant.effective_price || variant.sale_price || variant.price || product.final_price || product.effective_price);

          return (
            <button
              key={variant.id}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(product, variant)}
              className={`flex w-full items-center gap-3 rounded-[1.6rem] border p-3 text-left transition ${selectable ? "border-border bg-background hover:-translate-y-0.5 hover:border-[#b21f36] hover:shadow-lg" : "cursor-not-allowed border-border/60 bg-muted/40 opacity-70"}`}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
                {image ? <img src={image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No image</div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-extrabold">{colorVariant?.color_name || variant.color || "Default"}</p>
                  {colorVariant?.color_hex && <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: colorVariant.color_hex }} />}
                  <Badge tone={selectable ? "success" : "danger"}>{selectable ? `${stock} in stock` : "Out of stock"}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{optionLabel(variant, colorVariant) || productSku(product)}</p>
                <p className="mt-2 text-sm font-bold">{finalPrice}</p>
              </div>
            </button>
          );
        }) : (
          <EmptyState title="No active variants" message="This product has no active variants configured for POS." />
        )}
      </div>
    </Modal>
  );
}

function Orders({
  orders,
  meta,
  setOrders,
  setMeta,
  reload,
}: {
  orders: ApiTrackedOrder[];
  meta: PageMeta;
  setOrders: (orders: ApiTrackedOrder[]) => void;
  setMeta: (meta: PageMeta) => void;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [ordering, setOrdering] = useState("-created_at");
  const [selected, setSelected] = useState<ApiTrackedOrder | null>(null);
  const [pendingRefund, setPendingRefund] = useState<ApiTrackedOrder | null>(null);

  async function loadOrders(page = meta.page, pageSize = meta.page_size) {
    try {
      const rows = await fetchAdminOrders({
        page,
        page_size: pageSize,
        search: query,
        status: status === "all" ? "" : status,
        payment: payment === "all" ? "" : payment,
        ordering,
      });
      setOrders(rows.results);
      setMeta(rows);
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(1, meta.page_size), 250);
    return () => window.clearTimeout(timer);
  }, [query, status, payment, ordering]);

  async function changeStatus(order: ApiTrackedOrder, nextStatus: string) {
    try {
      await updateAdminOrder(order.id, { status: nextStatus, note: "Admin status update" });
      notify("success", "Order status updated.");
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function verifyPayment(order: ApiTrackedOrder) {
    try {
      await updateAdminOrder(order.id, { payment_status: "success", note: "Payment verified by admin" });
      notify("success", "Payment marked paid.");
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function refundOrder(order: ApiTrackedOrder) {
    try {
      await updateAdminOrder(order.id, { status: "refunded", note: "Admin refund from Order Records" });
      notify("success", "Order refunded.");
      setPendingRefund(null);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  function printOrder(order: ApiTrackedOrder) {
    window.open(`/admin/invoice/${encodeURIComponent(String(order.id || order.number))}/print`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <Toolbar title="Order Records" search={query} setSearch={setQuery} placeholder="Search order, phone, customer..." right={(
        <>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"><option value="all">All status</option>{orderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={payment} onChange={(event) => setPayment(event.target.value)} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"><option value="all">All payments</option>{paymentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={ordering} onChange={(event) => setOrdering(event.target.value)} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"><option value="-created_at">Newest</option><option value="number">Order number</option><option value="-grand_total">Highest total</option><option value="status">Status</option></select>
        </>
      )} />
      <Panel title="Orders" action={<Badge tone="gold">{meta.count} records</Badge>}>
        <OrdersTable orders={orders} onView={setSelected} onStatus={changeStatus} onVerify={verifyPayment} onRefund={setPendingRefund} onPrint={printOrder} />
        <PaginationControls meta={meta} onPage={(page) => loadOrders(page)} onPageSize={(pageSize) => loadOrders(1, pageSize)} />
      </Panel>
      {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} />}
      {pendingRefund && (
        <ConfirmModal
          title="Confirm Refund"
          message={`Refund order ${pendingRefund.tracking_id || pendingRefund.number}? Inventory will be restored and revenue adjusted.`}
          confirmLabel="Confirm Refund"
          icon={AlertTriangle}
          onCancel={() => setPendingRefund(null)}
          onConfirm={() => refundOrder(pendingRefund)}
        />
      )}
    </div>
  );
}

function OrdersTable({ orders, compact = false, onView, onStatus, onVerify, onRefund, onPrint }: { orders: ApiTrackedOrder[]; compact?: boolean; onView?: (order: ApiTrackedOrder) => void; onStatus?: (order: ApiTrackedOrder, status: string) => void; onVerify?: (order: ApiTrackedOrder) => void; onRefund?: (order: ApiTrackedOrder) => void; onPrint?: (order: ApiTrackedOrder) => void }) {
  if (!orders.length) return <EmptyState title="No website orders yet" message="Public website customer orders will appear here." />;
  return (
    <div className="max-w-full overflow-x-auto">
      <table className={`w-full text-sm ${compact ? "min-w-[520px]" : "min-w-[1180px]"}`}>
        <thead><tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground"><th className="py-3">Tracking</th><th>Customer</th>{!compact && <th>Products</th>}<th>Payment</th>{!compact && <th>Method</th>}<th>Status</th>{!compact && <th>Proof</th>}<th>Total</th>{!compact && <th className="text-right">Actions</th>}</tr></thead>
        <tbody>{orders.map((order) => (
          <tr key={order.id} className="border-t border-border">
            <td className="py-4"><p className="font-extrabold">{order.tracking_id || order.number}</p><p className="text-xs text-muted-foreground">{order.number} · {new Date(order.created_at).toLocaleDateString()}</p></td>
            <td><p className="font-bold">{order.customer?.name || "Customer"}</p><p className="text-xs text-muted-foreground">{order.customer?.phone || "No phone"}</p></td>
            {!compact && <td>{order.items?.length ?? 0}</td>}
            <td><Badge tone={statusTone(order.payment_status)}>{paymentStatusLabel(order.payment_status)}</Badge></td>
            {!compact && <td className="capitalize">{paymentMethodLabel(order.payment_method)}</td>}
            <td>{onStatus ? <select defaultValue={order.status} onChange={(event) => onStatus(order, event.target.value)} className="rounded-full border border-border bg-background px-3 py-2 text-xs font-bold">{orderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select> : <Badge tone={statusTone(order.status)}>{order.status}</Badge>}</td>
            {!compact && <td>{order.payment_screenshot_url ? <a href={order.payment_screenshot_url} target="_blank" rel="noreferrer" className="font-bold text-[#7d0020] underline">View</a> : <span className="text-xs text-muted-foreground">None</span>}</td>}
            <td className="font-bold">{money(order.grand_total)}</td>
            {!compact && <td className="text-right"><div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => onView?.(order)} className="rounded-full border border-border px-3 py-2 text-xs font-bold"><Eye className="mr-1 inline h-3.5 w-3.5" />View</button>
              {order.payment_status !== "success" && <button onClick={() => onVerify?.(order)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Verify Payment</button>}
              {!["refunded", "cancelled"].includes(order.status) && <button onClick={() => onRefund?.(order)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Refund</button>}
              <button onClick={() => onPrint?.(order)} className="rounded-full border border-border px-3 py-2 text-xs font-bold"><Printer className="mr-1 inline h-3.5 w-3.5" />Print</button>
            </div></td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function OrderDetailModal({ order, onClose }: { order: ApiTrackedOrder; onClose: () => void }) {
  return (
    <Modal title={`Order ${order.number}`} onClose={onClose} wide>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Customer</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#7d0020]">{order.tracking_id || order.number}</p>
            <p className="mt-2 font-extrabold">{order.customer?.name || "Customer"}</p>
            <p className="text-sm text-muted-foreground">{order.customer?.phone || "No phone"}</p>
            <p className="text-sm text-muted-foreground">{order.customer?.city || "City"}, {order.customer?.country || "Pakistan"}</p>
          </div>
          <div className="rounded-3xl bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
            <div className="mt-3 flex flex-wrap gap-2"><Badge tone={statusTone(order.status)}>{order.status}</Badge><Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge></div>
          </div>
          {order.payment_screenshot_url && (
            <div className="rounded-3xl bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Payment Screenshot</p>
              <a href={order.payment_screenshot_url} target="_blank" rel="noreferrer">
                <img src={order.payment_screenshot_url} alt="Payment proof" className="mt-3 h-40 w-full rounded-2xl object-cover" />
              </a>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="max-w-full overflow-x-auto rounded-3xl border border-border">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/60 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground"><th className="p-3">Product</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>{(order.items ?? []).map((item) => <tr key={`${item.sku}-${item.product_name}`} className="border-t border-border"><td className="p-3 font-bold">{item.product_name}<p className="text-xs text-muted-foreground">{item.sku}</p></td><td>{item.quantity}</td><td>{money(item.line_total)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="rounded-3xl bg-[#13070b] p-5 text-white"><p className="text-sm text-white/55">Grand total</p><p className="mt-1 text-3xl font-extrabold">{money(order.grand_total)}</p></div>
          <div className="rounded-3xl bg-background/70 p-4">
            <p className="font-extrabold">Timeline</p>
            <div className="mt-3 space-y-3">{order.status_events?.length ? order.status_events.map((event, index) => (
              <div key={`${event.created_at}-${index}`} className="border-l-2 border-[#d7ad62] pl-3 text-sm"><p className="font-bold capitalize">{event.to_status}</p><p className="text-muted-foreground">{event.note || "Status updated"} · {new Date(event.created_at).toLocaleString()}</p></div>
            )) : <p className="text-sm text-muted-foreground">No timeline events yet.</p>}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Override({
  orders,
  events,
  eventMeta,
  setEvents,
  setEventMeta,
  reload,
}: {
  orders: ApiTrackedOrder[];
  events: InventoryMove[];
  eventMeta: PageMeta;
  setEvents: (events: InventoryMove[]) => void;
  setEventMeta: (meta: PageMeta) => void;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [selectedId, setSelectedId] = useState(orders[0]?.id ?? 0);
  const [pending, setPending] = useState<Record<string, FormDataEntryValue> | null>(null);
  const [modal, setModal] = useState<ModalKey>(null);
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0] ?? null;
  const visible = orders.filter((order) => [order.number, order.customer.name, order.customer.phone].join(" ").toLowerCase().includes(query.toLowerCase()));

  async function loadEvents(page = eventMeta.page, pageSize = eventMeta.page_size) {
    try {
      const rows = await fetchOrderEvents({ page, page_size: pageSize, search: eventSearch });
      setEvents(rows.results);
      setEventMeta(rows);
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvents(1, eventMeta.page_size), 250);
    return () => window.clearTimeout(timer);
  }, [eventSearch]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "").trim();
    if (!reason) {
      notify("error", "Override reason is required.");
      return;
    }
    setPending(Object.fromEntries(form.entries()));
    setModal("overrideConfirm");
  }

  async function confirmOverride() {
    if (!pending || !selected) return;
    try {
      await updateAdminOrder(selected.id, {
        status: pending.status,
        payment_status: pending.payment_status,
        shipping_name: pending.shipping_name,
        shipping_phone: pending.shipping_phone,
        shipping_city: pending.shipping_city,
        note: `Manual override: ${pending.reason}`,
      });
      notify("success", "Order override saved and logged.");
      setPending(null);
      setModal(null);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
      <Panel title="Search Order">
        <SearchBox value={query} onChange={setQuery} placeholder="Order number, phone, customer..." />
        <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {visible.length ? visible.map((order) => (
            <button key={order.id} onClick={() => setSelectedId(order.id)} className={`w-full rounded-3xl border p-4 text-left transition ${selected?.id === order.id ? "border-[#b21f36] bg-white shadow-lg" : "border-border bg-background/70 hover:border-[#b21f36]"}`}>
              <p className="font-extrabold">{order.number}</p>
              <p className="text-sm text-muted-foreground">{order.customer.name} · {money(order.grand_total)}</p>
            </button>
          )) : <EmptyState title="No matching orders" message="Try another order number, customer, or phone." />}
        </div>
      </Panel>
      <Panel title="Safe Manual Override" action={<Badge tone="danger">Confirmation required</Badge>}>
        {selected ? (
          <form onSubmit={submit} className="grid min-w-0 gap-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <select name="status" defaultValue={selected.status} className="min-w-0 rounded-2xl border border-border bg-background p-3">{orderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select name="payment_status" defaultValue={selected.payment_status} className="min-w-0 rounded-2xl border border-border bg-background p-3">{paymentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <input name="shipping_name" defaultValue={selected.customer.name} placeholder="Customer name" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
              <input name="shipping_phone" defaultValue={selected.customer.phone} placeholder="Phone" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
              <input name="shipping_city" defaultValue={selected.customer.city} placeholder="City" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
            </div>
            <textarea name="reason" required placeholder="Override reason required" className="min-h-24 min-w-0 rounded-2xl border border-border bg-background p-3" />
            <button className="w-full rounded-full px-5 py-3 text-sm font-bold text-white sm:w-fit" style={{ background: CRIMSON }}>Review Override</button>
          </form>
        ) : <EmptyState title="No order selected" message="Select an order before making an override." />}
      </Panel>
      <Panel title="Override History / Logs" className="xl:col-span-2" action={<Badge tone="gold">{eventMeta.count} records</Badge>}>
        <div className="mb-4">
          <SearchBox value={eventSearch} onChange={setEventSearch} placeholder="Search order log, status, reason..." />
        </div>
        {events.length ? (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground"><th className="py-3">Order</th><th>From</th><th>To</th><th>Reason / Note</th><th>Date</th></tr></thead>
              <tbody>{events.map((event, index) => (
                <tr key={`${event.order_number}-${event.created_at}-${index}`} className="border-t border-border">
                  <td className="py-4 font-extrabold">{event.order_number ?? "Order"}</td>
                  <td>{event.from_status || "-"}</td>
                  <td><Badge tone={statusTone(event.to_status ?? "pending")}>{event.to_status ?? "updated"}</Badge></td>
                  <td>{event.note || "Admin update"}</td>
                  <td>{new Date(event.created_at).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState title="No override logs yet" message="Manual overrides and status changes will appear here." />}
        <PaginationControls meta={eventMeta} onPage={(page) => loadEvents(page)} onPageSize={(pageSize) => loadEvents(1, pageSize)} />
      </Panel>
      {modal === "overrideConfirm" && <ConfirmModal title="Confirm order override?" message="This will update customer/payment/status fields and save a timeline log with your reason." confirmLabel="Save Override" onCancel={() => setModal(null)} onConfirm={confirmOverride} />}
    </div>
  );
}

function Sales({
  sales,
  meta,
  setSales,
  setMeta,
  reload,
}: {
  sales: SaleRecord[];
  meta: PageMeta;
  setSales: (rows: SaleRecord[]) => void;
  setMeta: (meta: PageMeta) => void;
  reload: () => Promise<void>;
}) {
  const [date, setDate] = useState("");
  const [payment, setPayment] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [invoice, setInvoice] = useState<ApiTrackedOrder | null>(null);
  const [invoiceAction, setInvoiceAction] = useState<"view" | "print" | "download">("view");
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);
  const [pendingRefundOrder, setPendingRefundOrder] = useState<ApiTrackedOrder | null>(null);
  const [pendingRefundSale, setPendingRefundSale] = useState<SaleRecord | null>(null);
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.grand_total), 0);
  const posRevenue = sales.filter((sale) => sale.source === "pos").reduce((sum, sale) => sum + Number(sale.grand_total), 0);
  const websiteRevenue = totalRevenue - posRevenue;
  const csv = useMemo(() => ["number,source,customer,payment_status,payment_method,total,created_at", ...sales.map((sale) => [sale.number, sale.source, sale.customer, sale.payment_status, sale.payment_method, sale.grand_total, sale.created_at].join(","))].join("\n"), [sales]);

  async function loadSales(page = meta.page, pageSize = meta.page_size) {
    try {
      const rows = await fetchSales({ page, page_size: pageSize, date, payment, search, source });
      setSales(rows.results);
      setMeta(rows);
      notify("success", "Sales filters applied.");
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function verifyPayment(order: ApiTrackedOrder) {
    try {
      await updateAdminOrder(order.id, { payment_status: "success", note: "Payment verified by admin" });
      notify("success", "Payment marked paid.");
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function refundOrder(order: ApiTrackedOrder) {
    try {
      await updateAdminOrder(order.id, { status: "refunded", note: "Admin refund from Order Records" });
      notify("success", "Order refunded.");
      setPendingRefundOrder(null);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  function printOrder(order: ApiTrackedOrder) {
    window.open(`/admin/invoice/${encodeURIComponent(String(order.id || order.number))}/print`, "_blank", "noopener,noreferrer");
  }

  async function openInvoice(sale: SaleRecord, action: "view" | "print" | "download") {
    if (action === "download") {
      // PDF download is not yet available — show a clear message instead of a blank screen
      notify("info", "PDF download is coming soon. Use Print Invoice to save as PDF from your browser.");
      return;
    }
    if (action === "print") {
      window.open(`/admin/invoice/${encodeURIComponent(String(sale.id || sale.number))}/print`, "_blank", "noopener,noreferrer");
      return;
    }
    const invoiceKey = sale.id ? String(sale.id) : sale.number;
    setInvoiceLoading(invoiceKey);
    try {
      const invoiceData = await fetchSaleInvoice(sale.id || sale.number);
      if (!invoiceData) {
        notify("error", "Invoice not found.");
        return;
      }
      setInvoiceAction(action);
      setInvoice(invoiceData);
    } catch (error) {
      notify("error", getErrorMessage(error));
    } finally {
      setInvoiceLoading(null);
    }
  }

  async function refundRecord(sale: SaleRecord) {
    if (sale.refunded_at || ["refunded", "cancelled"].includes(sale.payment_status)) {
      notify("info", "This sale is already refunded.");
      return;
    }
    try {
      await refundSale(sale.id, { reason: "Admin refund from Sales Records", status: "returned" });
      notify("success", "Sale refunded and inventory restored.");
      setPendingRefundSale(null);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Revenue" value={money(totalRevenue)} icon={BadgeDollarSign} />
        <MetricCard title="Website Sales" value={money(websiteRevenue)} icon={ShoppingCart} />
        <MetricCard title="POS Sales" value={money(posRevenue)} icon={Receipt} />
      </div>
      <Panel title="Sales Records" action={<Badge tone="gold">{sales.length} rows</Badge>}>
        <div className="mb-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice/customer" className="min-w-0 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold" />
          <input value={date} onChange={(event) => setDate(event.target.value)} type="date" className="min-w-0 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold" />
          <input value={payment} onChange={(event) => setPayment(event.target.value)} placeholder="Payment filter" className="min-w-0 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold" />
          <select value={source} onChange={(event) => setSource(event.target.value)} className="min-w-0 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"><option value="">All sources</option><option value="website">Website</option><option value="pos">POS</option></select>
          <button onClick={() => loadSales(1, meta.page_size)} className="rounded-full border border-border bg-background px-5 py-2 text-sm font-bold"><SlidersHorizontal className="mr-2 inline h-4 w-4" />Filter</button>
          <a download="sales.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} className="rounded-full px-5 py-2 text-center text-sm font-bold text-white" style={{ background: GOLD }}><Download className="mr-2 inline h-4 w-4" />CSV</a>
          <button onClick={() => window.print()} className="rounded-full border border-border bg-background px-5 py-2 text-sm font-bold"><Printer className="mr-2 inline h-4 w-4" />Print/PDF</button>
        </div>
        {sales.length ? (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground"><th className="py-3">Invoice</th><th>Source</th><th>Customer</th><th>Payment</th><th>Method</th><th>Total</th><th>Date</th><th className="text-right">Actions</th></tr></thead>
              <tbody>{sales.map((sale) => {
                const invoiceKey = sale.id ? String(sale.id) : sale.number;
                const loadingThisInvoice = invoiceLoading === invoiceKey;
                return (
                  <tr key={sale.number} className="border-t border-border">
                    <td className="py-4 font-extrabold">{sale.number}</td>
                    <td><Badge tone={sale.source === "pos" ? "gold" : "neutral"}>{sale.source === "pos" ? "POS" : "Website"}</Badge></td>
                    <td>{sale.customer || "Customer"}</td>
                    <td><Badge tone={statusTone(sale.payment_status)}>{paymentStatusLabel(sale.payment_status)}</Badge></td>
                    <td>{sale.payment_method}</td>
                    <td className="font-bold">
                      {money(sale.grand_total)}
                      {Number(sale.refunded_amount) > 0 && <p className="text-[10px] font-semibold text-muted-foreground">Refunded {money(sale.refunded_amount)}</p>}
                    </td>
                    <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button disabled={loadingThisInvoice} onClick={() => openInvoice(sale, "view")} className="rounded-full border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"><Eye className="mr-1 inline h-3.5 w-3.5" />{loadingThisInvoice ? "Loading..." : "View Invoice"}</button>
                        <button disabled={loadingThisInvoice} onClick={() => openInvoice(sale, "print")} className="rounded-full border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"><Printer className="mr-1 inline h-3.5 w-3.5" />Print Invoice</button>
                        <button disabled={loadingThisInvoice} onClick={() => openInvoice(sale, "download")} className="rounded-full px-3 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ background: CRIMSON }}><Download className="mr-1 inline h-3.5 w-3.5" />Download Invoice</button>
                        {!sale.refunded_at && !["refunded", "cancelled"].includes(sale.payment_status) && (
                          <button onClick={() => setPendingRefundSale(sale)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Refund</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <EmptyState title="No sales records" message="Completed orders and POS invoices will appear here." />}
        <PaginationControls meta={meta} onPage={(page) => loadSales(page)} onPageSize={(pageSize) => loadSales(1, pageSize)} />
      </Panel>
      {pendingRefundOrder && (
        <ConfirmModal
          title="Confirm Refund"
          message={`Refund order ${pendingRefundOrder.tracking_id || pendingRefundOrder.number}? Inventory will be restored and revenue adjusted.`}
          confirmLabel="Confirm Refund"
          icon={AlertTriangle}
          onCancel={() => setPendingRefundOrder(null)}
          onConfirm={() => refundOrder(pendingRefundOrder)}
        />
      )}
      {pendingRefundSale && (
        <ConfirmModal
          title="Confirm Refund"
          message={`Refund order ${pendingRefundSale.number}? Inventory will be restored and revenue adjusted.`}
          confirmLabel="Confirm Refund"
          icon={AlertTriangle}
          onCancel={() => setPendingRefundSale(null)}
          onConfirm={() => refundRecord(pendingRefundSale)}
        />
      )}
      {invoice && (
        <InvoiceErrorBoundary onClose={() => setInvoice(null)}>
          <InvoiceModal
            order={invoice}
            onClose={() => setInvoice(null)}
            autoPrint={invoiceAction === "print"}
          />
        </InvoiceErrorBoundary>
      )}
    </div>
  );
}

function Reviews({
  reviews,
  meta,
  setReviews,
  setMeta,
  reload,
}: {
  reviews: ApiReview[];
  meta: PageMeta;
  setReviews: (reviews: ApiReview[]) => void;
  setMeta: (meta: PageMeta) => void;
  reload: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function loadReviews(page = meta.page, pageSize = meta.page_size) {
    try {
      const rows = await fetchAdminReviews({ page, page_size: pageSize, search, status });
      setReviews(rows.results);
      setMeta(rows);
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function saveReview(id: number, payload: Record<string, unknown>, message: string) {
    try {
      await updateAdminReview(id, payload);
      notify("success", message);
      await loadReviews(meta.page, meta.page_size);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function removeReview(id: number) {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      await deleteAdminReview(id);
      notify("success", "Review deleted.");
      await loadReviews(meta.page, meta.page_size);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReviews(1, meta.page_size), 250);
    return () => window.clearTimeout(timer);
  }, [search, status]);

  return (
    <div className="space-y-4">
      <Toolbar
        title="Customer Reviews"
        search={search}
        setSearch={setSearch}
        placeholder="Search name, product, or review..."
        right={(
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-w-0 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold">
            <option value="">All status</option>
            <option value="approved">Published</option>
            <option value="hidden">Hidden spam</option>
          </select>
        )}
      />
      <Panel title="Review Moderation" action={<Badge tone="gold">{meta.count} reviews</Badge>}>
        {reviews.length ? (
          <div className="space-y-3">
            {reviews.map((review) => {
              const name = review.guest_name || review.customer_name || review.user_email || "Guest customer";
              const text = review.review_text || review.comment || review.title || "";
              const image = resolveMediaUrl(review.image_url || review.review_image_url || review.image || review.review_image);
              return (
                <div key={review.id} className="rounded-3xl bg-background/75 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-extrabold">{name}</p>
                        <Badge tone={review.is_hidden || review.is_spam ? "danger" : "success"}>{review.is_hidden || review.is_spam ? "Hidden" : "Published"}</Badge>
                        {review.is_featured && <Badge tone="gold">Featured</Badge>}
                        {review.is_spam && <Badge tone="danger">Spam</Badge>}
                        {review.verified_purchase && <Badge tone="success">Verified Customer</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {review.product_name || `Product #${review.product}`} · {review.rating}/5 stars · {new Date(review.created_at).toLocaleDateString()}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text || "No review text."}</p>
                      {image && <img src={image} alt="Review upload" className="mt-3 h-20 w-20 rounded-2xl object-cover" loading="lazy" />}
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button onClick={() => saveReview(review.id, { is_featured: !review.is_featured }, review.is_featured ? "Review unfeatured." : "Review featured.")} className="rounded-full border border-border bg-background px-3 py-2 text-xs font-bold">{review.is_featured ? "Unfeature" : "Feature"}</button>
                      <button onClick={() => saveReview(review.id, { hide_spam: !(review.is_hidden || review.is_spam) }, review.is_hidden || review.is_spam ? "Review unhidden." : "Review hidden as spam.")} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{review.is_hidden || review.is_spam ? "Unhide" : "Hide Spam"}</button>
                      <button onClick={() => removeReview(review.id)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No reviews yet" message="Guest and customer reviews will appear here after submission." />
        )}
        <PaginationControls meta={meta} onPage={(page) => loadReviews(page)} onPageSize={(pageSize) => loadReviews(1, pageSize)} />
      </Panel>
    </div>
  );
}

function CareersAdmin({
  careers,
  meta,
  setCareers,
  setMeta,
  reload,
}: {
  careers: ApiCareerOpportunity[];
  meta: PageMeta;
  setCareers: (careers: ApiCareerOpportunity[]) => void;
  setMeta: (meta: PageMeta) => void;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [modal, setModal] = useState<ModalKey>(null);
  const [selected, setSelected] = useState<ApiCareerOpportunity | null>(null);

  async function loadCareers(page = meta.page, pageSize = meta.page_size) {
    try {
      const rows = await fetchAdminCareers({
        page,
        page_size: pageSize,
        search: query,
        status: status === "all" ? "" : status,
      });
      setCareers(rows.results);
      setMeta(rows);
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCareers(1, meta.page_size), 250);
    return () => window.clearTimeout(timer);
  }, [query, status]);

  async function toggleCareer(job: ApiCareerOpportunity) {
    try {
      await saveAdminCareer({ is_active: !job.is_active }, job.id);
      notify("success", job.is_active ? "Opportunity deactivated." : "Opportunity activated.");
      await loadCareers();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function removeCareer() {
    if (!selected) return;
    try {
      await deleteAdminCareer(selected.id);
      notify("success", "Career opportunity deleted.");
      setModal(null);
      setSelected(null);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <Toolbar
        title="Careers / Opportunities"
        search={query}
        setSearch={setQuery}
        placeholder="Search title, department, location..."
        right={(
          <>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={() => { setSelected(null); setModal("career"); }} className="rounded-full px-5 py-2 text-sm font-bold text-white" style={{ background: CRIMSON }}><Plus className="mr-2 inline h-4 w-4" />Add Opportunity</button>
          </>
        )}
      />
      <Panel title="Posted Opportunities" action={<Badge tone="gold">{meta.count} records</Badge>}>
        {careers.length ? (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground"><th className="py-3">Job</th><th>Department</th><th>Location</th><th>Type</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>{careers.map((job) => (
                <tr key={job.id} className="border-t border-border">
                  <td className="py-4">
                    <p className="font-extrabold">{job.title}</p>
                    <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{job.description}</p>
                  </td>
                  <td>{job.department}</td>
                  <td>{job.location}</td>
                  <td>{job.job_type}</td>
                  <td><Badge tone={job.is_active ? "success" : "warning"}>{job.is_active ? "Active" : "Inactive"}</Badge></td>
                  <td className="text-right">
                    <button onClick={() => toggleCareer(job)} className="mr-2 rounded-full border border-border px-3 py-2 text-xs font-bold">{job.is_active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => { setSelected(job); setModal("career"); }} className="mr-2 rounded-full border border-border px-3 py-2 text-xs font-bold"><Pencil className="inline h-3.5 w-3.5" /> Edit</button>
                    <button onClick={() => { setSelected(job); setModal("deleteCareer"); }} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600"><Trash2 className="inline h-3.5 w-3.5" /> Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState title="No career opportunities yet" message="Post active opportunities here to publish them on the Careers page." action={<button onClick={() => setModal("career")} className="rounded-full px-5 py-3 text-sm font-bold text-white" style={{ background: CRIMSON }}>Add Opportunity</button>} />}
        <PaginationControls meta={meta} onPage={(page) => loadCareers(page)} onPageSize={(pageSize) => loadCareers(1, pageSize)} />
      </Panel>
      {modal === "career" && <CareerModal career={selected} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload(); }} />}
      {modal === "deleteCareer" && <ConfirmModal title="Delete opportunity?" message={`This will remove ${selected?.title ?? "this opportunity"} from the Careers page and admin records.`} confirmLabel="Delete Opportunity" onCancel={() => setModal(null)} onConfirm={removeCareer} />}
    </div>
  );
}

function CareerModal({ career, onClose, onSaved }: { career: ApiCareerOpportunity | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await saveAdminCareer({
        title: form.get("title"),
        department: form.get("department"),
        location: form.get("location"),
        job_type: form.get("job_type"),
        description: form.get("description"),
        requirements: form.get("requirements"),
        is_active: form.get("is_active") === "on",
      }, career?.id);
      notify("success", career ? "Opportunity updated." : "Opportunity posted.");
      await onSaved();
    } catch (error) {
      notify("error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={career ? "Edit Opportunity" : "Add Opportunity"} onClose={onClose} wide>
      <form onSubmit={submit} className="grid min-w-0 gap-4">
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <input name="title" defaultValue={career?.title} required placeholder="Job title" className="min-w-0 rounded-2xl border border-border bg-background p-3 text-sm outline-none" />
          <input name="department" defaultValue={career?.department} required placeholder="Department" className="min-w-0 rounded-2xl border border-border bg-background p-3 text-sm outline-none" />
          <input name="location" defaultValue={career?.location} required placeholder="Location" className="min-w-0 rounded-2xl border border-border bg-background p-3 text-sm outline-none" />
          <input name="job_type" defaultValue={career?.job_type} required placeholder="Job type" className="min-w-0 rounded-2xl border border-border bg-background p-3 text-sm outline-none" />
        </div>
        <textarea name="description" defaultValue={career?.description} required placeholder="Description" rows={5} className="min-w-0 resize-none rounded-2xl border border-border bg-background p-3 text-sm outline-none" />
        <textarea name="requirements" defaultValue={career?.requirements} placeholder="Requirements" rows={5} className="min-w-0 resize-none rounded-2xl border border-border bg-background p-3 text-sm outline-none" />
        <label className="rounded-2xl border border-border p-3 text-sm"><input name="is_active" type="checkbox" defaultChecked={career?.is_active ?? true} className="mr-2" />Active</label>
        <button disabled={saving} className="w-full rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-fit" style={{ background: CRIMSON }}>{saving ? "Saving..." : "Save Opportunity"}</button>
      </form>
    </Modal>
  );
}

function HomepageManagement({
  homepage,
  reviews,
  reviewMeta,
  setReviews,
  setReviewMeta,
  reload,
}: {
  homepage: AdminHomepage | null;
  reviews: ApiReview[];
  reviewMeta: PageMeta;
  setReviews: (reviews: ApiReview[]) => void;
  setReviewMeta: (meta: PageMeta) => void;
  reload: () => Promise<void>;
}) {
  const [modal, setModal] = useState<ModalKey>(null);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");

  async function submitHero(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const source = new FormData(event.currentTarget);
    const form = new FormData();
    const media = source.get("hero_media");
    if (media instanceof File && media.size > 0) {
      form.set("hero_media", media);
    }
    try {
      await saveHomepageHero(form);
      notify("success", "Hero settings saved.");
      setModal(null);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function submitStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveHomepageStory(new FormData(event.currentTarget));
      notify("success", "About section saved.");
      setModal(null);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function submitStat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await createHomepageStat({
        stat_type: form.get("stat_type"),
        title: form.get("title"),
        label: form.get("label"),
        icon: form.get("icon"),
        sort_order: Number(form.get("sort_order") || 0),
        is_active: form.get("is_active") === "on",
      });
      notify("success", "Live stat enabled.");
      setModal(null);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function submitDisplay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await saveHomepageDisplay({
        lookbook_title: form.get("lookbook_title"),
        lookbook_limit: Number(form.get("lookbook_limit") || 6),
        reviews_title: form.get("reviews_title"),
        is_lookbook_active: form.get("is_lookbook_active") === "on",
        is_reviews_active: form.get("is_reviews_active") === "on",
      });
      notify("success", "Display settings saved.");
      setModal(null);
      await reload();
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  async function toggleStat(id: number, isActive: boolean) {
    await updateHomepageStat(id, { is_active: !isActive });
    notify("success", "Stat visibility updated.");
    await reload();
  }

  async function moderateReview(review: ApiReview, payload: Record<string, unknown>) {
    await updateAdminReview(review.id, payload);
    notify("success", "Review moderation saved.");
    await loadReviews(reviewMeta.page, reviewMeta.page_size);
  }

  async function loadReviews(page = reviewMeta.page, pageSize = reviewMeta.page_size) {
    try {
      const rows = await fetchAdminReviews({ page, page_size: pageSize, search: reviewSearch, status: reviewStatus });
      setReviews(rows.results);
      setReviewMeta(rows);
    } catch (error) {
      notify("error", getErrorMessage(error));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReviews(1, reviewMeta.page_size), 250);
    return () => window.clearTimeout(timer);
  }, [reviewSearch, reviewStatus]);

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="Hero" value={homepage?.hero?.title || "Not configured"} icon={Sparkles} onEdit={() => setModal("hero")} />
        <SectionCard title="About / Story" value={homepage?.story?.title || "Not configured"} icon={FileText} onEdit={() => setModal("story")} />
        <SectionCard title="Lookbook" value={homepage?.display_settings.is_lookbook_active ? "Real products enabled" : "Hidden"} icon={Eye} onEdit={() => setModal("display")} />
        <SectionCard title="Reviews" value={homepage?.display_settings.is_reviews_active ? "Published reviews enabled" : "Hidden"} icon={Star} onEdit={() => setModal("display")} />
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <Panel title="Live Stats Visibility" action={<button onClick={() => setModal("stat")} className="rounded-full px-4 py-2 text-xs font-bold text-white" style={{ background: CRIMSON }}><Plus className="mr-1 inline h-3.5 w-3.5" />Add Stat</button>}>
          {homepage?.stats.length ? (
            <div className="space-y-3">{homepage.stats.map((stat) => (
              <div key={stat.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-background/70 p-4">
                <div><p className="font-extrabold">{stat.title}</p><p className="text-sm text-muted-foreground">{stat.stat_type} · Live value: {stat.value ?? 0}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => toggleStat(stat.id, stat.is_active)} className="rounded-full border border-border px-3 py-2 text-xs font-bold">{stat.is_active ? "Hide" : "Show"}</button>
                  <button onClick={async () => { await deleteHomepageStat(stat.id); notify("success", "Stat removed."); await reload(); }} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600">Delete</button>
                </div>
              </div>
            ))}</div>
          ) : <EmptyState title="No live stats selected" message="Stats numbers are calculated automatically; choose which ones to show." />}
        </Panel>
        <Panel title="Reviews Moderation" action={<Badge tone="gold">{reviewMeta.count} records</Badge>}>
          <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <SearchBox value={reviewSearch} onChange={setReviewSearch} placeholder="Search customer, product, review..." />
            <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)} className="min-w-0 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold">
              <option value="">All status</option>
              <option value="approved">Published</option>
              <option value="hidden">Hidden spam</option>
            </select>
          </div>
          {reviews.length ? (
            <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">{reviews.map((review) => (
              <div key={review.id} className="rounded-3xl bg-background/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-bold">{review.user_email || "Customer"}</p><p className="text-xs text-muted-foreground">{review.rating}/5 stars · {new Date(review.created_at).toLocaleDateString()}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => moderateReview(review, { is_featured: !review.is_featured })} className="rounded-full border border-border bg-background px-3 py-2 text-xs font-bold">{review.is_featured ? "Unfeature" : "Feature"}</button>
                    <button onClick={() => moderateReview(review, { hide_spam: !(review.is_hidden || review.is_spam) })} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{review.is_hidden || review.is_spam ? "Unhide" : "Hide Spam"}</button>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{review.comment || review.title}</p>
              </div>
            ))}</div>
          ) : <EmptyState title="No real reviews yet" message="Customer-submitted reviews will appear here after submission." />}
          <PaginationControls meta={reviewMeta} onPage={(page) => loadReviews(page)} onPageSize={(pageSize) => loadReviews(1, pageSize)} />
        </Panel>
      </div>
      {modal === "hero" && (
        <Modal title="Edit Hero" onClose={() => setModal(null)}>
          <form onSubmit={submitHero} className="grid min-w-0 gap-3">
            <input name="hero_media" type="file" accept="image/*,video/mp4,video/webm" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
            <button className="rounded-full px-5 py-3 text-sm font-bold text-white" style={{ background: CRIMSON }}>Save Hero</button>
          </form>
        </Modal>
      )}
      {modal === "story" && (
        <Modal title="Edit About / Story" onClose={() => setModal(null)}>
          <form onSubmit={submitStory} className="grid min-w-0 gap-3">
            <input name="title" defaultValue={homepage?.story?.title} required placeholder="Story title" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
            <textarea name="text" defaultValue={homepage?.story?.text} required placeholder="Story text" className="min-h-28 min-w-0 rounded-2xl border border-border bg-background p-3" />
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <input name="cta_text" defaultValue={homepage?.story?.cta_text} placeholder="CTA text" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
              <input name="cta_url" defaultValue={homepage?.story?.cta_url} placeholder="CTA URL" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
            </div>
            <input name="image" type="file" accept="image/*" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
            <label className="text-sm"><input name="is_active" type="checkbox" defaultChecked={homepage?.story?.is_active ?? true} className="mr-2" />Active</label>
            <button className="rounded-full px-5 py-3 text-sm font-bold text-white" style={{ background: CRIMSON }}>Save Story</button>
          </form>
        </Modal>
      )}
      {modal === "stat" && (
        <Modal title="Add Live Stat" onClose={() => setModal(null)}>
          <form onSubmit={submitStat} className="grid min-w-0 gap-3">
            <p className="text-sm text-muted-foreground">Admin selects visibility and label only. Numbers always come from database calculations.</p>
            <select name="stat_type" required className="min-w-0 rounded-2xl border border-border bg-background p-3">{statTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <input name="title" required placeholder="Display label" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
              <input name="icon" placeholder="Icon label optional" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
              <input name="label" placeholder="Small caption optional" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
              <input name="sort_order" type="number" placeholder="Sort order" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
            </div>
            <label className="text-sm"><input name="is_active" type="checkbox" defaultChecked className="mr-2" />Active</label>
            <button className="rounded-full px-5 py-3 text-sm font-bold text-white" style={{ background: CRIMSON }}>Add Stat</button>
          </form>
        </Modal>
      )}
      {modal === "display" && (
        <Modal title="Lookbook & Reviews Settings" onClose={() => setModal(null)}>
          <form onSubmit={submitDisplay} className="grid min-w-0 gap-3">
            <input name="lookbook_title" defaultValue={homepage?.display_settings.lookbook_title} placeholder="Lookbook title" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
            <input name="lookbook_limit" defaultValue={homepage?.display_settings.lookbook_limit ?? 6} type="number" min="1" max="12" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
            <input name="reviews_title" defaultValue={homepage?.display_settings.reviews_title} placeholder="Reviews title" className="min-w-0 rounded-2xl border border-border bg-background p-3" />
            <label className="rounded-2xl border border-border p-3 text-sm"><input name="is_lookbook_active" type="checkbox" defaultChecked={homepage?.display_settings.is_lookbook_active ?? true} className="mr-2" />Show lookbook from latest active products</label>
            <label className="rounded-2xl border border-border p-3 text-sm"><input name="is_reviews_active" type="checkbox" defaultChecked={homepage?.display_settings.is_reviews_active ?? true} className="mr-2" />Show latest published real reviews</label>
            <button className="rounded-full px-5 py-3 text-sm font-bold text-white" style={{ background: CRIMSON }}>Save Settings</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SectionCard({ title, value, icon: Icon, onEdit }: { title: string; value: string; icon: ComponentType<{ className?: string }>; onEdit: () => void }) {
  return (
    <div className={`${CARD_GLASS} rounded-[2rem] p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-[#f5dfb5] p-3 text-[#8b5a18]"><Icon className="h-5 w-5" /></div>
        <button onClick={onEdit} className="rounded-full border border-border bg-background px-3 py-2 text-xs font-bold"><Pencil className="mr-1 inline h-3.5 w-3.5" />Edit</button>
      </div>
      <h3 className="mt-4 font-extrabold">{title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function Toolbar({ title, search, setSearch, placeholder, right }: { title: string; search: string; setSearch: (value: string) => void; placeholder: string; right?: ReactNode }) {
  return (
    <Panel title={title}>
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBox value={search} onChange={setSearch} placeholder={placeholder} />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">{right}</div>
      </div>
    </Panel>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full min-w-0 rounded-full border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-[#b21f36]" />
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className={`${CARD_GLASS} rounded-[2rem] p-5`}>
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-extrabold">{value}</p></div>
        <div className="rounded-2xl bg-[#f5dfb5] p-3 text-[#8b5a18]"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

/** Error boundary that catches rendering crashes inside admin page content panels. */
class AdminContentErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorMessage: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, errorMessage: error instanceof Error ? error.message : "An unexpected error occurred." };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[2.5rem] border border-red-200 bg-red-50/50 p-7 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-extrabold text-red-800" style={POPPINS}>Content Rendering Error</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">
            An error occurred while loading this tab. This crash has been intercepted to prevent the entire Admin panel from going blank.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-white/70 p-4 font-mono text-xs text-red-800 border border-red-200/60 max-w-full whitespace-pre-wrap break-all">
            {this.state.errorMessage}
          </pre>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-full px-5 py-2.5 text-xs font-bold text-white transition hover:brightness-95"
              style={{ background: CRIMSON }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Error boundary that catches rendering crashes inside invoice modals. */
class InvoiceErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { hasError: boolean; errorMessage: string }> {
  constructor(props: { children: ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, errorMessage: error instanceof Error ? error.message : "An unexpected error occurred." };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="invoice-modal fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/25 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className="text-xl font-extrabold text-[#251116]" style={POPPINS}>Invoice Error</h3>
              <button onClick={this.props.onClose} className="rounded-full border border-border p-2 transition hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5">
              <AlertTriangle className="mb-3 h-6 w-6 text-rose-500" />
              <p className="font-extrabold text-rose-700">Invoice not found or failed to load</p>
              <p className="mt-1 text-sm text-rose-600">{this.state.errorMessage}</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={this.props.onClose} className="rounded-full border border-border px-5 py-3 text-sm font-bold">Close</button>
            </div>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}

function InvoiceModal({ order, onClose, autoPrint = false }: { order: ApiTrackedOrder; onClose: () => void; autoPrint?: boolean }) {
  if (!order) return null;

  function openPrintPage() {
    window.open(`/admin/invoice/${encodeURIComponent(String(order.id || order.number))}/print`, "_blank", "noopener,noreferrer");
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(openPrintPage, 350);
    return () => window.clearTimeout(timer);
  }, [autoPrint, order.id]);

  return (
    <Modal title={`Invoice ${order.number ?? ""}`} onClose={onClose} wide>
      <InvoiceView order={order} />
      <div className="invoice-actions no-print mt-5 flex flex-wrap justify-end gap-3 print:hidden">
        <button onClick={onClose} className="rounded-full border border-border px-5 py-3 text-sm font-bold">Close</button>
        <button onClick={openPrintPage} className="rounded-full px-5 py-3 text-sm font-bold text-white" style={{ background: CRIMSON }}><Printer className="mr-2 inline h-4 w-4" />Print Invoice</button>
      </div>
    </Modal>
  );
}
