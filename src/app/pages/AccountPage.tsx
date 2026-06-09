import { Link } from "react-router";
import { LogOut, ShoppingBag, UserRound } from "lucide-react";
import sardarjeeLogo from "@/imports/Sardar_jee_3.jpg";
import { CRIMSON, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { useAuth } from "@/context/AuthContext";

export function AccountPage() {
  const { authLoading, currentUser, isAuthenticated } = useAuth();

  if (authLoading) {
    return (
      <main className="min-h-[60vh] px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#e4d5c4] bg-white/85 p-8 text-center shadow-xl">
          <p className="text-sm font-semibold text-[#72514e]">Loading your account...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <main className="min-h-[70vh] bg-[linear-gradient(135deg,#fff8ee_0%,#f7efe3_52%,#fffdf8_100%)] px-4 py-16">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#e4d5c4] bg-white/88 p-8 text-center shadow-2xl shadow-[#7d0020]/8 sm:p-10">
          <img src={sardarjeeLogo} alt="Sardar-G Fabrics" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-md" />
          <h1 className="mt-6 text-3xl font-extrabold text-[#1a0808]" style={POPPINS}>Customer Account</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#72514e]">
            Sign in to save your customer details for faster checkout. Browsing and ordering are still available without login.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={ROUTES.login} className="rounded-full px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white" style={{ background: CRIMSON }}>
              Sign In
            </Link>
            <Link to={ROUTES.signup} className="rounded-full border border-[#7d0020]/20 bg-white px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#7d0020]">
              Create Account
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-[radial-gradient(circle_at_top_left,rgba(201,160,96,0.2),transparent_28%),linear-gradient(135deg,#fff8ee_0%,#f7efe3_52%,#fffdf8_100%)] px-4 py-10 sm:px-6 sm:py-14">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-[#e4d5c4] bg-white/88 p-7 shadow-2xl shadow-[#7d0020]/8 sm:p-10">
          <div className="flex items-center gap-4">
            <img src={sardarjeeLogo} alt="Sardar-G Fabrics" className="h-14 w-14 rounded-2xl object-cover shadow-md" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#9b7a43]">My Account</p>
              <h1 className="mt-2 text-3xl font-extrabold text-[#1a0808]" style={POPPINS}>
                {currentUser.full_name || currentUser.first_name || "Customer"}
              </h1>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoCard label="Phone" value={currentUser.phone || "Not added"} />
            <InfoCard label="Email" value={currentUser.email || "Optional account email"} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={ROUTES.home} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white shadow-lg shadow-[#7d0020]/18 transition hover:brightness-110 hover:-translate-y-0.5 active:scale-95" style={{ background: CRIMSON }}>
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Link>
            <Link to={ROUTES.logout} className="inline-flex items-center gap-2 rounded-full border border-[#7d0020]/20 bg-white px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#7d0020]">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#eadfd4] bg-[#fffaf5] p-5 dark:border-[#43332b] dark:bg-[#221915]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9b7a43]">{label}</p>
      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#1a0808] dark:text-[#f6eee8]">
        <UserRound className="h-4 w-4 text-[#7d0020]" />
        {value}
      </p>
    </div>
  );
}
