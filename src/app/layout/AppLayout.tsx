import { Outlet, useLocation } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function AppLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/dashboard");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {!isAdmin && <Navbar />}
      <div className={isAdmin || isHome ? "" : "pt-[64px] sm:pt-[70px]"}>
        <Outlet />
      </div>
      {!isAdmin && <Footer />}
    </div>
  );
}
