import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowRight, LockKeyhole, Phone, UserRound } from "lucide-react";
import sardarjeeLogo from "@/imports/Sardar_jee_3.jpg";
import { CRIMSON, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { ApiRequestError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { GoogleAuthButton } from "@/app/components/GoogleAuthButton";
import { PasswordInput } from "@/app/components/PasswordInput";

function splitName(fullName: string) {
  return fullName.trim().split(/\s+/).filter(Boolean).join(" ");
}

export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authLoading, isAuthenticated, loginCustomer, registerCustomer } = useAuth();
  const isSignup = pathname === ROUTES.signup || pathname === "/register";
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const from = searchParams.get("from");
      navigate(from === "checkout" ? ROUTES.checkout : ROUTES.account, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, searchParams]);

  const intro = useMemo(() => (
    isSignup
      ? "Create a customer account for faster checkout and order convenience."
      : "Sign in to your customer account. Shopping still works without login."
  ), [isSignup]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (isSignup) {
        const normalizedName = splitName(fullName);
        if (!normalizedName) {
          setError("Full name is required.");
          return;
        }
        await registerCustomer({
          full_name: normalizedName,
          phone: phone.trim(),
          email: email.trim() || undefined,
          password,
          confirm_password: confirmPassword,
        });
        setMessage("Account created. You can sign in now.");
        setTimeout(() => navigate(ROUTES.login), 1000);
        return;
      }

      await loginCustomer({ login: loginValue.trim(), password });
      navigate(ROUTES.account, { replace: true });
    } catch (submitError) {
      if (submitError instanceof ApiRequestError) {
        setError(submitError.message);
      } else if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Unable to continue right now.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-70px)] bg-[radial-gradient(circle_at_top_left,rgba(201,160,96,0.2),transparent_28%),linear-gradient(135deg,#fff8ee_0%,#f7efe3_52%,#fffdf8_100%)] px-4 py-10 sm:px-6 sm:py-14">
      <section className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-[#e7d8ca] bg-white/86 p-7 shadow-2xl shadow-[#7d0020]/8 sm:p-10">
          <div className="flex items-center gap-4">
            <img src={sardarjeeLogo} alt="Sardar-G Fabrics" className="h-14 w-14 rounded-2xl object-cover shadow-md" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#9b7a43]">Customer Access</p>
              <h1 className="mt-2 text-3xl font-extrabold text-[#1a0808]" style={POPPINS}>
                {isSignup ? "Create Account" : "Welcome Back"}
              </h1>
            </div>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#72514e]">{intro}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <Field label="Full name" icon={<UserRound className="h-4 w-4" />}>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="auth-input" placeholder="Your full name" />
              </Field>
            )}

            {isSignup ? (
              <>
                <Field label="Phone" icon={<Phone className="h-4 w-4" />}>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} required type="tel" className="auth-input" placeholder="03xx-xxxxxxx" />
                </Field>
                <Field label="Email (optional)" icon={<UserRound className="h-4 w-4" />}>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="auth-input" placeholder="name@example.com" />
                </Field>
              </>
            ) : (
              <Field label="Phone or email" icon={<UserRound className="h-4 w-4" />}>
                <input value={loginValue} onChange={(event) => setLoginValue(event.target.value)} required className="auth-input" placeholder="Phone number or email" />
              </Field>
            )}

            <Field label="Password" icon={<LockKeyhole className="h-4 w-4" />}>
              <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className="auth-input" placeholder="Minimum 8 characters" />
            </Field>

            {!isSignup && (
              <div className="flex justify-end">
                <Link
                  to={ROUTES.resetPassword}
                  className="text-[11px] font-extrabold uppercase tracking-[0.16em] transition hover:opacity-75"
                  style={{ color: CRIMSON }}
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            {isSignup && (
              <Field label="Confirm password" icon={<LockKeyhole className="h-4 w-4" />}>
                <PasswordInput value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} className="auth-input" placeholder="Retype your password" />
              </Field>
            )}

            {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            {message && <p className="rounded-2xl border border-[#ead2a8] bg-[#fff8e8] px-4 py-3 text-sm font-semibold text-[#7d0020]">{message}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-[11px] font-extrabold uppercase tracking-[0.22em] text-white shadow-lg shadow-[#7d0020]/18 transition hover:brightness-110 disabled:opacity-60"
              style={{ background: CRIMSON }}
            >
              {submitting ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* ── Divider ── */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#e7d8ca] to-transparent" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#b8a090]">
              or
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#e7d8ca] to-transparent" />
          </div>

          {/* ── Google OAuth ── */}
          <div className="mt-6">
            <GoogleAuthButton
              label={isSignup ? "Sign up with Google" : "Continue with Google"}
            />
          </div>

          <p className="mt-6 text-sm text-[#72514e]">
            {isSignup ? "Already have an account?" : "New to Sardar-G?"}{" "}
            <Link to={isSignup ? ROUTES.login : ROUTES.signup} className="font-extrabold transition hover:opacity-80" style={{ color: CRIMSON }}>
              {isSignup ? "Sign in" : "Create account"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7a6267]">
        <span className="text-[#9b7a43]">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}
