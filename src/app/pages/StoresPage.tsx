import { ExternalLink, MapPin, Phone, Store } from "lucide-react";
import { CRIMSON, GOLD, POPPINS, STORE } from "@/app/constants";

export function StoresPage() {
  return (
    <main
      className="min-h-[calc(100vh-70px)] px-4 py-14 sm:px-6 sm:py-20"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(201,160,96,0.15), transparent 30%), linear-gradient(135deg, #fff8ee 0%, #f7efe3 55%, #fffdf8 100%)",
      }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.4em] text-[#9b7a43]">
            Visit Us
          </p>
          <h1 className="text-3xl font-extrabold text-[#1a0808] sm:text-4xl" style={POPPINS}>
            Our Store
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#72514e]">
            Come visit us in Rawalpindi. We'd love to welcome you in person.
          </p>
        </div>

        <div
          className="relative overflow-hidden rounded-[2rem] border border-[#e7d8ca] bg-[#fffaf3]/92 shadow-xl shadow-[#7d0020]/8"
          style={{ backdropFilter: "blur(20px)" }}
        >
          <div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${CRIMSON} 0%, #C9A060 50%, ${CRIMSON} 100%)`,
            }}
          />

          <div className="p-8 sm:p-10">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: CRIMSON }}>
                <Store className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.35em]" style={{ color: GOLD }}>
                  Flagship Store
                </p>
                <h2 className="mt-0.5 text-xl font-extrabold text-[#1a0808] sm:text-2xl" style={POPPINS}>
                  {STORE.name}
                </h2>
              </div>
            </div>

            <div
              className="mb-8 h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #e7d8ca 30%, #e7d8ca 70%, transparent)",
              }}
            />

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(201,160,96,0.12)" }}>
                  <MapPin className="h-4 w-4" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9b7a43]">
                    Address
                  </p>
                  <p className="text-sm leading-6 text-[#3d2020]">{STORE.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(201,160,96,0.12)" }}>
                  <Phone className="h-4 w-4" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9b7a43]">
                    Phone
                  </p>
                  <a href={STORE.phoneHref} className="text-sm font-semibold text-[#3d2020] transition-colors hover:underline" style={{ textDecorationColor: CRIMSON }}>
                    {STORE.phoneDisplay}
                  </a>
                </div>
              </div>
            </div>

            <div
              className="mt-6 h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #e7d8ca 30%, #e7d8ca 70%, transparent)",
              }}
            />

            <div className="mt-6 flex items-start gap-4">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(125,0,32,0.08)" }}>
                <Store className="h-4 w-4" style={{ color: CRIMSON }} />
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9b7a43]">
                  Business Hours
                </p>
                <p className="text-[15px] font-extrabold leading-6 text-[#3d2020]" style={POPPINS}>
                  Saturday - Thursday
                </p>
                <p className="text-[15px] font-bold leading-6 text-[#3d2020]">
                  10:00 AM - 9:00 PM
                </p>
                <p className="mt-1 text-xs font-semibold text-[#a08070]">
                  Closed on Friday
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href={STORE.mapsUrl}
                id="store-maps-btn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2.5 rounded-full px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white transition hover:brightness-110 hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${CRIMSON} 0%, #a00029 100%)`,
                  boxShadow: `0 6px 24px ${CRIMSON}24`,
                }}
              >
                <MapPin className="h-4 w-4" />
                Open in Google Maps
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>

              <a
                href={STORE.phoneHref}
                id="store-call-btn"
                className="inline-flex flex-1 items-center justify-center gap-2.5 rounded-full border border-[#e7d8ca] bg-[#fff8ee] px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#1a0808] transition hover:border-[#c9a060] hover:bg-[#fdf6ee] hover:-translate-y-0.5 active:scale-95"
              >
                <Phone className="h-4 w-4" style={{ color: CRIMSON }} />
                Call Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
