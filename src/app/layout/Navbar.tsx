import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Heart, ShoppingBag, Menu, X, Sun, Moon, UserCircle2,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import sardarjeeLogo from "@/imports/Sardar_jee_3.jpg";
import {
  GLASS, CRIMSON, GOLD, MONO, POPPINS, NAV_LINKS,
} from "@/app/constants";
import { NAV_ROUTES, ROUTES } from "@/app/routes";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { isDark, setIsDark, cartCount, wishlistCount } = useStore();
  const { currentUser, isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mOpen, setMOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    setMOpen(false);
  }, [location.pathname]);

  const solidNav = scrolled || !isHome;
  const iconColor = solidNav ? "var(--foreground)" : "rgba(255,255,255,0.90)";
  const desktopNavBase = solidNav
    ? isDark
      ? "rgba(201,160,96,0.88)"
      : "rgba(125,0,32,0.88)"
    : "rgba(255,244,232,0.82)";
  const desktopNavHover = solidNav
    ? isDark
      ? "#E7C78A"
      : CRIMSON
    : "#F6D7A2";
  const desktopNavActive = solidNav
    ? isDark
      ? GOLD
      : CRIMSON
    : "#F6D7A2";
  const desktopNavUnderline = solidNav
    ? isDark
      ? "linear-gradient(90deg, rgba(201,160,96,0.9), rgba(245,223,175,0.95))"
      : "linear-gradient(90deg, rgba(125,0,32,0.95), rgba(201,160,96,0.9))"
    : "linear-gradient(90deg, rgba(246,215,162,0.95), rgba(255,255,255,0.95))";
  const accountLabel = isAuthenticated
    ? currentUser?.full_name || currentUser?.first_name || currentUser?.email || "My Account"
    : "Login";

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative text-[11px] tracking-[0.15em] uppercase font-semibold transition-all duration-300 ${
      isActive ? "active" : ""
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-[15px] tracking-[0.1em] uppercase font-semibold transition-all duration-300 ${
      isActive ? "active" : ""
    }`;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          solidNav ? `${GLASS} dark:bg-black/30 shadow-lg shadow-black/10` : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-[64px] sm:h-[70px] flex items-center gap-3 sm:gap-6 min-w-0">
          <Link to={ROUTES.home} className="flex-shrink-0 flex items-center gap-2 sm:gap-3 min-w-0">
            <ImageWithFallback
              src={sardarjeeLogo}
              alt="Sardar-Jee Fabrics"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl object-cover shadow"
            />
            <div className="hidden sm:flex flex-col leading-none">
              <span
                className="text-[13px] font-800 tracking-widest uppercase transition-colors duration-300"
                style={{
                  ...POPPINS,
                  fontWeight: 800,
                  color: solidNav ? "var(--foreground)" : "white",
                }}
              >
                Sardar-Jee
              </span>
              <span
                className="text-[9px] tracking-[0.25em] uppercase font-medium transition-colors duration-300"
                style={{ color: solidNav ? "var(--muted-foreground)" : "rgba(255,255,255,0.55)" }}
              >
                Fabrics
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex flex-1 items-center justify-center gap-6 xl:gap-8 min-w-0">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l}
                to={NAV_ROUTES[l]}
                className={desktopLinkClass}
                style={({ isActive }) => ({
                  color: isActive ? desktopNavActive : desktopNavBase,
                  textShadow: isActive ? "0 0 18px rgba(201,160,96,0.16)" : "none",
                })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = desktopNavHover;
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.classList.contains("active")) {
                    e.currentTarget.style.color = desktopNavBase;
                  }
                }}
              >
                {({ isActive }) => (
                  <>
                    <span>{l}</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute -bottom-1 left-0 h-px w-full origin-left rounded-full transition-all duration-300 ${
                        isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-70 group-hover:scale-x-100"
                      }`}
                      style={{
                        backgroundImage: desktopNavUnderline,
                        boxShadow: isActive ? "0 0 10px rgba(201,160,96,0.35)" : "none",
                      }}
                    />
                  </>
                )}
              </NavLink>
            ))}
            <NavLink
              to={ROUTES.products}
              className="text-[11px] tracking-[0.15em] uppercase font-bold px-4 py-2 rounded-full transition-all duration-200"
              style={({ isActive }) => ({
                background: isActive ? CRIMSON : solidNav ? "rgba(125,0,32,0.10)" : "rgba(255,255,255,0.13)",
                color: isActive ? "white" : solidNav ? CRIMSON : "white",
                border: `1px solid ${isActive ? CRIMSON : solidNav ? "rgba(125,0,32,0.25)" : "rgba(255,255,255,0.3)"}`,
              })}
            >
              Browse All
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
            <Link
              to={isAuthenticated ? ROUTES.account : ROUTES.login}
              className="hidden md:inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200"
              style={{
                background: solidNav ? "rgba(125,0,32,0.10)" : "rgba(255,255,255,0.13)",
                color: solidNav ? CRIMSON : "white",
                border: `1px solid ${solidNav ? "rgba(125,0,32,0.25)" : "rgba(255,255,255,0.28)"}`,
              }}
              title={accountLabel}
            >
              <UserCircle2 className="h-4 w-4" />
              <span className="max-w-[130px] truncate">{accountLabel}</span>
            </Link>
            <button
              type="button"
              onClick={() => navigate(ROUTES.search)}
              className="hidden sm:flex p-2.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Search"
            >
              <Search className="w-[17px] h-[17px]" style={{ color: iconColor }} />
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.wishlist)}
              className="relative hidden sm:flex p-2.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-[17px] h-[17px]" style={{ color: iconColor }} />
              {wishlistCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: CRIMSON, ...MONO }}
                >
                  {wishlistCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.cart)}
              className="relative p-2.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag className="w-[17px] h-[17px]" style={{ color: iconColor }} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: CRIMSON, ...MONO }}
                >
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              className="relative w-[46px] h-[24px] rounded-full transition-all duration-300 flex-shrink-0"
              style={{ background: isDark ? GOLD : solidNav ? "var(--muted)" : "rgba(255,255,255,0.28)" }}
              aria-label="Toggle theme"
            >
              <motion.div
                animate={{ x: isDark ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 600, damping: 35 }}
                className="absolute top-[2px] w-5 h-5 rounded-full shadow flex items-center justify-center"
                style={{ background: isDark ? "#0C0406" : "white" }}
              >
                {isDark ? (
                  <Moon className="w-2.5 h-2.5" style={{ color: GOLD }} />
                ) : (
                  <Sun className="w-2.5 h-2.5 text-amber-600" />
                )}
              </motion.div>
            </button>
            <button
              type="button"
              onClick={() => setMOpen(true)}
              className="lg:hidden p-2.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" style={{ color: iconColor }} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] lg:hidden"
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="absolute right-0 top-0 bottom-0 w-[min(100%,20rem)] bg-background border-l border-border flex flex-col p-6 sm:p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <Link to={ROUTES.home} className="flex items-center gap-3" onClick={() => setMOpen(false)}>
                  <ImageWithFallback src={sardarjeeLogo} alt="Sardar-Jee" className="h-10 w-10 rounded-xl object-cover" />
                  <span className="font-extrabold tracking-widest text-sm uppercase" style={POPPINS}>
                    Sardar-Jee
                  </span>
                </Link>
                <button type="button" onClick={() => setMOpen(false)} className="p-2 rounded-full hover:bg-foreground/5">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-4 overflow-y-auto">
                {NAV_LINKS.map((l) => (
                  <NavLink
                    key={l}
                    to={NAV_ROUTES[l]}
                    onClick={() => setMOpen(false)}
                    className={mobileLinkClass}
                    style={({ isActive }) => ({
                      color: isActive ? CRIMSON : isDark ? "rgba(201,160,96,0.88)" : "rgba(125,0,32,0.8)",
                    })}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = isDark ? "#E7C78A" : CRIMSON;
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.classList.contains("active")) {
                        e.currentTarget.style.color = isDark ? "rgba(201,160,96,0.88)" : "rgba(125,0,32,0.8)";
                      }
                    }}
                  >
                    {l}
                  </NavLink>
                ))}
                <NavLink
                  to={ROUTES.account}
                  onClick={() => setMOpen(false)}
                  className="text-[15px] tracking-[0.1em] uppercase font-semibold text-muted-foreground hover:text-foreground"
                >
                  Account
                </NavLink>
                <NavLink
                  to={ROUTES.products}
                  onClick={() => setMOpen(false)}
                  className="mt-1 text-[13px] tracking-[0.1em] uppercase font-bold rounded-full px-4 py-3 text-center text-white transition-all"
                  style={{ background: CRIMSON }}
                >
                  Browse All Products
                </NavLink>
              </nav>
              <div className="mt-auto pt-8 border-t border-border flex gap-3">
                <button type="button" onClick={() => { navigate(ROUTES.search); setMOpen(false); }} className="p-3 rounded-full border border-border hover:bg-foreground/5">
                  <Search className="w-4 h-4 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => { navigate(ROUTES.wishlist); setMOpen(false); }} className="p-3 rounded-full border border-border hover:bg-foreground/5">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => { navigate(ROUTES.cart); setMOpen(false); }} className="p-3 rounded-full border border-border hover:bg-foreground/5">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
