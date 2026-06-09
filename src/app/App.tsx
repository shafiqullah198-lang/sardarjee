import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router";
import { StoreProvider } from "@/context/StoreContext";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/app/layout/AppLayout";
import { HomePage } from "@/app/pages/HomePage";
import { ShopPage } from "@/app/pages/ShopPage";
import { ProductDetailPage } from "@/app/pages/ProductDetailPage";
import { CartPage } from "@/app/pages/CartPage";
import { WishlistPage } from "@/app/pages/WishlistPage";
import { AuthPage } from "@/app/pages/AuthPage";
import { AccountPage } from "@/app/pages/AccountPage";
import { CheckoutPage } from "@/app/pages/CheckoutPage";
import { LogoutPage } from "@/app/pages/LogoutPage";
import { StoresPage } from "@/app/pages/StoresPage";
import { SearchPage } from "@/app/pages/SearchPage";
import { OrderTrackingPage } from "@/app/pages/OrderTrackingPage";
import { AdminPage } from "@/app/pages/AdminPage";
import { AdminInvoicePrintPage } from "@/app/pages/AdminInvoicePrintPage";
import { ReceiptPrintPage } from "@/app/pages/ReceiptPrintPage";
import { NotFoundPage } from "@/app/pages/NotFoundPage";
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
        </BrowserRouter>
      </AuthProvider>
    </StoreProvider>
  );
}
