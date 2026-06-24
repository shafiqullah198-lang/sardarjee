import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import sardarjeeLogo from "@/imports/Sardar_jee_3.jpg";
import { CRIMSON, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { ApiRequestError } from "@/services/api";
import { verifyPasswordResetOtp } from "@/services/auth";

export function VerifyOTPPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setEmail(sessionStorage.getItem("password_reset_email") ?? "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await verifyPasswordResetOtp(email.trim(), otp.trim());
      sessionStorage.setItem("password_reset_email", email.trim());
      sessionStorage.setItem("password_reset_otp", otp.trim());
      setMessage(response.detail);
      navigate(ROUTES.newPassword);
    } catch (submitError) {
      if (submitError instanceof ApiRequestError) {
        setError(submitError.message);
      } else if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Unable to verify OTP right now.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-70px)] bg-[radial-gradient(circle_at_top_left,rgba(201,160,96,0.2),transparent_28%),linear-gradient(135deg,#fff8ee_0%,#f7efe3_52%,#fffdf8_100%)] px-4 py-10 sm:px-6 sm:py-14">
      <section className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-[#e7d8ca] bg-[#fffaf3]/90 p-7 shadow-xl shadow-[#7d0020]/8 sm:p-10">
          <div className="flex items-center gap-4">
            <img src={sardarjeeLogo} alt="Sardar-G Fabrics" className="h-14 w-14 rounded-2xl object-cover" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#9b7a43]">Customer Access</p>
              <h1 className="mt-2 text-3xl font-extrabold text-[#1a0808]" style={POPPINS}>
                Enter OTP
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-xl text-sm leading-6 text-[#72514e]">
            Enter the 6-digit code sent to your email. The code expires in 10 minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7a6267]">
                <span className="text-[#9b7a43]"><KeyRound className="h-4 w-4" /></span>
                OTP
              </span>
              <input
                name="password_reset_otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                className="auth-input text-center tracking-[0.45em]"
                placeholder="000000"
              />
            </label>

            {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            {message && <p className="rounded-2xl border border-[#ead2a8] bg-[#fff8e8] px-4 py-3 text-sm font-semibold text-[#7d0020]">{message}</p>}

            <button
              type="submit"
              disabled={submitting || !email}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-[11px] font-extrabold uppercase tracking-[0.22em] text-white shadow-lg shadow-[#7d0020]/18 transition hover:brightness-110 disabled:opacity-60"
              style={{ background: CRIMSON }}
            >
              {submitting ? "Verifying..." : "Verify OTP"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <Link to={ROUTES.resetPassword} className="mt-6 inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] transition hover:opacity-75" style={{ color: CRIMSON }}>
            <ArrowLeft className="h-4 w-4" />
            Change Email
          </Link>
        </div>
      </section>
    </main>
  );
}
