import { Link } from "react-router";
import { Instagram, Facebook, Twitter, Phone, MapPin } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import sardarjeeLogo from "@/imports/Sardar_jee_3.jpg";
import { GOLD, POPPINS, FOOTER_LINKS, STORE } from "@/app/constants";
import { ROUTES } from "@/app/routes";


export function Footer() {
  return (
    <footer className="pt-12 sm:pt-16 pb-6 sm:pb-8 px-4 sm:px-6 lg:px-10" style={{ background: "#060103", color: "rgba(248,240,238,0.5)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 pb-12 sm:pb-14 border-b" style={{ borderColor: "rgba(248,240,238,0.07)" }}>
          <div className="sm:col-span-2 md:col-span-1">
            <Link to={ROUTES.home} className="flex items-center gap-3 mb-4">
              <ImageWithFallback src={sardarjeeLogo} alt="Sardar-G Fabrics" className="h-12 w-12 rounded-xl object-cover" />
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-white font-extrabold tracking-widest text-[13px] uppercase" style={POPPINS}>Sardar-G</span>
                <span className="text-[9px] tracking-[0.2em] uppercase font-medium" style={{ color: GOLD }}>Fabrics</span>
              </div>
            </Link>
            <p className="text-[12px] leading-relaxed mb-4 max-w-[240px]" style={{ color: "rgba(248,240,238,0.38)" }}>
              Sardar-G Fabrics — Men&apos;s Suiting &amp; Stitching Cloth House
            </p>
            <div className="space-y-2 mb-5">
              <a href={STORE.phoneHref} className="text-[12px] flex items-center gap-2 transition hover:opacity-90" style={{ color: "rgba(248,240,238,0.42)" }}>
                <Phone className="w-3 h-3 flex-shrink-0" style={{ color: GOLD }} /> {STORE.phoneDisplay}
              </a>
              <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] flex items-start gap-2 transition hover:opacity-90" style={{ color: "rgba(248,240,238,0.42)" }}>
                <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                <span>{STORE.address}</span>
              </a>
            </div>
            <div className="flex gap-2.5">
              {[Instagram, Facebook, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{ border: "1px solid rgba(248,240,238,0.1)", color: "rgba(248,240,238,0.4)" }}
                  aria-label="Social link"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="text-[10px] tracking-[0.35em] uppercase font-bold mb-4 sm:mb-5" style={{ color: GOLD }}>{title}</p>
              <ul className="space-y-2.5 sm:space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="text-[12px] transition-colors hover:opacity-90" style={{ color: "rgba(248,240,238,0.45)" }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(248,240,238,0.22)" }}>
            © 2026 Sardar-G Fabrics. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Visa", "Mastercard", "JazzCash", "EasyPaisa"].map((method) => (
              <span key={method} className="text-[9px] tracking-[0.1em] uppercase rounded-md px-2.5 py-1" style={{ border: "1px solid rgba(248,240,238,0.1)", color: "rgba(248,240,238,0.28)" }}>
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
