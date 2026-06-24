/**
 * GoogleAuthButton
 *
 * Renders a premium "Continue with Google" button that:
 *  1. ALWAYS shows — never returns null, even when VITE_GOOGLE_CLIENT_ID is not yet set.
 *  2. Uses Google Identity Services (GSI) renderButton() — NOT deprecated gapi.auth2.
 *  3. Uses an invisible overlay technique:
 *       - Google's real button (iframe) is rendered at full container width, invisible,
 *         scaled to fill the container height, and captures the actual click.
 *       - Our premium styled div sits on top (pointer-events:none) purely for visuals.
 *       - Result: user sees our button, clicks it, Google popup opens. Works for ALL users.
 *  4. When VITE_GOOGLE_CLIENT_ID is not configured, shows a grayed-out button that
 *     displays an error on click (so the UI is always present).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ROUTES } from "@/app/routes";
import { useAuth } from "@/context/AuthContext";
import { ApiRequestError } from "@/services/api";

/* ── env ─────────────────────────────────────────────────────────────── */
const RAW_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const CLIENT_ID =
  RAW_ID && RAW_ID !== "your_google_client_id_here" && RAW_ID.trim() !== ""
    ? RAW_ID.trim()
    : "";

/* ── GSI type declarations ────────────────────────────────────────────── */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (r: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            el: HTMLElement,
            opts: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              text?: string;
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
            },
          ) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
        };
      };
    };
  }
}

/* ── component ───────────────────────────────────────────────────────── */
interface Props {
  label?: string;
}

export function GoogleAuthButton({ label = "Continue with Google" }: Props) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  /* track whether renderButton was already called so we don't duplicate */
  const renderedRef = useRef(false);

  /* ── 1. Load GSI script ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!CLIENT_ID) return; // no-op when not configured

    // Script already loaded
    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    // Script tag already injected by another component instance
    const existing = document.getElementById("gsi-script");
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.id = "gsi-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => setScriptReady(true);
    document.head.appendChild(s);
  }, []);

  /* ── 2. Credential callback ─────────────────────────────────────────── */
  const handleCredential = useCallback(
    async (resp: { credential: string }) => {
      setLoading(true);
      setError("");
      try {
        await loginWithGoogle(resp.credential);
        const from = searchParams.get("from");
        navigate(from === "checkout" ? ROUTES.checkout : ROUTES.home, {
          replace: true,
        });
      } catch (err) {
        setError(
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Google sign-in failed. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, navigate, searchParams],
  );

  /* ── 3. Initialize GSI and render Google's real button ─────────────── */
  useEffect(() => {
    if (!scriptReady || !window.google?.accounts?.id) return;
    if (!CLIENT_ID || !googleBtnRef.current || !containerRef.current) return;

    /* Re-render when handleCredential reference changes (e.g. searchParams update).
       Clear previous button content first. */
    googleBtnRef.current.innerHTML = "";
    renderedRef.current = false;

    const containerWidth = containerRef.current.offsetWidth || 480;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    /* renderButton creates a real, clickable iframe button at the given width.
       This is the correct modern GSI approach — it works regardless of whether
       the user has a Google account in the browser (unlike prompt()). */
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline",
      size: "large",
      type: "standard",
      logo_alignment: "center",
      width: Math.floor(containerWidth),
    });

    renderedRef.current = true;
  }, [scriptReady, handleCredential]);

  /* ── 4. Direct click handler — programmatically trigger Google sign-in ── */
  function handleGoogleClick() {
    if (loading) return;
    if (!isConfigured) {
      setError(
        "Google login is not configured yet. Set VITE_GOOGLE_CLIENT_ID in your .env file.",
      );
      return;
    }
    if (!scriptReady || !window.google?.accounts?.id) {
      setError("Google sign-in is still loading. Please try again in a moment.");
      return;
    }
    // Try to programmatically click the hidden Google iframe button first
    const iframe = googleBtnRef.current?.querySelector("iframe");
    if (iframe) {
      try {
        // The iframe's parent div is the actual clickable Google button
        const googleDiv = googleBtnRef.current?.querySelector("div[role=button]") as HTMLElement | null;
        if (googleDiv) {
          googleDiv.click();
          return;
        }
      } catch { /* cross-origin — fallback to prompt */ }
    }
    // Fallback: use Google's One Tap prompt
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // If prompt can't display (e.g. no Google account in browser),
        // try clicking the iframe button as last resort
        const btn = googleBtnRef.current?.querySelector("div[role=button]") as HTMLElement | null;
        if (btn) btn.click();
      }
    });
  }

  const isConfigured = Boolean(CLIENT_ID);

  return (
    <div style={{ width: "100%" }}>
      {/*
        ┌─────────────────────────────────────────────────────┐
        │  Container — 52 px tall, pill-shaped, overflow:hidden│
        │                                                       │
        │  [Google iframe — scaled to fill 52 px]  z-index: 0  │
        │  [Our pretty overlay — pointer-events:none] z-index:5 │
        │                                                       │
        │  Click → passes through overlay → hits iframe → popup │
        └─────────────────────────────────────────────────────┘
      */}
      <div
        ref={containerRef}
        id="google-auth-container"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "400px",
          margin: "0 auto",
          height: "52px",
          borderRadius: "9999px",
          overflow: "hidden",
          border: "1.5px solid #e2d5c8",
          background: "#ffffff",
          boxShadow: "0 2px 16px rgba(125,0,32,0.07)",
          cursor: loading || !isConfigured ? "not-allowed" : "pointer",
          opacity: loading ? 0.65 : 1,
          transition: "border-color 0.18s, box-shadow 0.18s, transform 0.14s",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.borderColor = "#c9a060";
            e.currentTarget.style.boxShadow = "0 4px 22px rgba(125,0,32,0.14)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#e2d5c8";
          e.currentTarget.style.boxShadow = "0 2px 16px rgba(125,0,32,0.07)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* ── Google's real iframe button (invisible, captures clicks) ───
            • Centered vertically with absolute positioning
            • scaleY(1.3): Google "large" button is 40 px; 40 × 1.3 = 52 px
              which fills the container exactly.
            • CSS transforms affect pointer-event hit areas in all modern
              browsers, so clicking anywhere in the 52 px triggers the iframe.
            • Covered by our visual overlay → user never sees Google's styling.
        */}
        {isConfigured && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              transform: "translateY(-50%) scaleY(1.3)",
              transformOrigin: "center center",
              zIndex: 2,
              pointerEvents: loading ? "none" : "auto",
              /* Ensure the iframe fills the full width */
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div ref={googleBtnRef} style={{ width: "100%" }} />
          </div>
        )}

        {/* ── Our premium visual layer (pointer-events:none when configured) ──
            Clicks pass straight through to the Google iframe below.
            When NOT configured, pointer-events:auto so we handle the click. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            background: "#ffffff",
            pointerEvents: isConfigured ? "none" : "auto",
            zIndex: 5,
            cursor: loading || !isConfigured ? "not-allowed" : "pointer",
          }}
          onClick={!isConfigured ? handleGoogleClick : undefined}
        >
          {loading ? <SpinnerSVG /> : <GoogleLogoSVG />}
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#1a0808",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Signing in…" : label}
          </span>
        </div>
      </div>

      {/* ── Error message ───────────────────────────────────────────────── */}
      {error && (
        <p
          role="alert"
          style={{
            marginTop: "10px",
            borderRadius: "14px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#b91c1c",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ── SVG icons ────────────────────────────────────────────────────────── */
function GoogleLogoSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="20"
      height="20"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

function SpinnerSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7D0020"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
        animation: "gauth-spin 0.75s linear infinite",
      }}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <style>{`@keyframes gauth-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
