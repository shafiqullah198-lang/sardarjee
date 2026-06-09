import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "@/app/routes";
import { useAuth } from "@/context/AuthContext";

export function LogoutPage() {
  const navigate = useNavigate();
  const { logoutCustomer } = useAuth();

  useEffect(() => {
    let active = true;
    void (async () => {
      await logoutCustomer();
      if (active) navigate(ROUTES.login, { replace: true });
    })();
    return () => {
      active = false;
    };
  }, [logoutCustomer, navigate]);

  return (
    <main className="min-h-[50vh] px-4 py-16">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-[#e4d5c4] bg-white/88 p-8 text-center shadow-xl">
        <p className="text-sm font-semibold text-[#72514e]">Signing you out...</p>
      </div>
    </main>
  );
}
