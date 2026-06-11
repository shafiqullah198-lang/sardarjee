import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router";
import { StoreProvider } from "@/context/StoreContext";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/app/layout/AppLayout";
import {
  AboutUsPage,
  CareersPage,
  CollectionPage,
  ContactPage,
  FaqsPage,
  LookbookPage,
  NewArrivalsPage,
  OurStoryPage,
  PressPage,
  ReturnsPage,
  SalePage,
  SizeGuidePage,
} from "@/app/pages/StaticPages";

const HomePage = lazy(() => import("@/app/pages/HomePage").then((module) => ({ default: module.HomePage })));
const ShopPage = lazy(() => import("@/app/pages/ShopPage").then((module) => ({ default: module.ShopPage })));
const ProductDetailPage = lazy(() => import("@/app/pages/ProductDetailPage").then((module) => ({ default: module.ProductDetailPage })));
const CartPage = lazy(() => import("@/app/pages/CartPage").then((module) => ({ default: module.CartPage })));
const WishlistPage = lazy(() => import("@/app/pages/WishlistPage").then((module) => ({ default: module.WishlistPage })));
const AuthPage = lazy(() => import("@/app/pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const AccountPage = lazy(() => import("@/app/pages/AccountPage").then((module) => ({ default: module.AccountPage })));
const CheckoutPage = lazy(() => import("@/app/pages/CheckoutPage").then((module) => ({ default: module.CheckoutPage })));
const LogoutPage = lazy(() => import("@/app/pages/LogoutPage").then((module) => ({ default: module.LogoutPage })));
const StoresPage = lazy(() => import("@/app/pages/StoresPage").then((module) => ({ default: module.StoresPage })));
const SearchPage = lazy(() => import("@/app/pages/SearchPage").then((module) => ({ default: module.SearchPage })));
const OrderTrackingPage = lazy(() => import("@/app/pages/OrderTrackingPage").then((module) => ({ default: module.OrderTrackingPage })));
const AdminPage = lazy(() => import("@/app/pages/AdminPage").then((module) => ({ default: module.AdminPage })));
const AdminInvoicePrintPage = lazy(() => import("@/app/pages/AdminInvoicePrintPage").then((module) => ({ default: module.AdminInvoicePrintPage })));
const ReceiptPrintPage = lazy(() => import("@/app/pages/ReceiptPrintPage").then((module) => ({ default: module.ReceiptPrintPage })));
const NotFoundPage = lazy(() => import("@/app/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

function RouteLoader() {
  return <div className="min-h-[40vh] bg-[#fffaf1]" />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <StoreProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="admin/invoice/:saleId/print" element={<AdminInvoicePrintPage />} />
              <Route path="receipt/:trackingId/print" element={<ReceiptPrintPage />} />
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="shop" element={<ShopPage />} />
                <Route path="shop/:category" element={<ShopPage />} />
                <Route path="products" element={<ShopPage />} />
                <Route path="products/:category" element={<ShopPage />} />
                <Route path="men" element={<ShopPage section="men" />} />
                <Route path="wedding" element={<ShopPage section="wedding" />} />
                <Route path="fabrics" element={<ShopPage section="fabrics" />} />
                <Route path="product/:id" element={<ProductDetailPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="login" element={<AuthPage />} />
                <Route path="signup" element={<AuthPage />} />
                <Route path="register" element={<Navigate to="/signup" replace />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="logout" element={<LogoutPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="stores" element={<StoresPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="track-order" element={<OrderTrackingPage />} />
                <Route path="about-us" element={<AboutUsPage />} />
                <Route path="our-story" element={<OurStoryPage />} />
                <Route path="lookbook" element={<LookbookPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="faqs" element={<FaqsPage />} />
                <Route path="returns" element={<ReturnsPage />} />
                <Route path="size-guide" element={<SizeGuidePage />} />
                <Route path="press" element={<PressPage />} />
                <Route path="careers" element={<CareersPage />} />
                <Route path="sale" element={<SalePage />} />
                <Route path="new-arrivals" element={<NewArrivalsPage />} />
                <Route path="collections/shalwar-kameez" element={<CollectionPage title="Shalwar Kameez" slug="shalwar-kameez" intro="Classic men's shalwar kameez fabrics selected for daily wear, formal visits, and seasonal comfort." />} />
                <Route path="collections/embroidered-kurta" element={<CollectionPage title="Embroidered Kurta" slug="embroidered-kurta" intro="Elegant kurta fabrics and embroidered styles for refined occasions and festive dressing." />} />
                <Route path="collections/wedding-wear" element={<CollectionPage title="Wedding Wear" slug="wedding-wear" intro="Premium wedding-ready fabrics for formal gatherings, family events, and celebration wardrobes." />} />
                <Route path="admin/*" element={<AdminPage />} />
                <Route path="dashboard/*" element={<AdminPage />} />
                <Route path="404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </StoreProvider>
  );
}
