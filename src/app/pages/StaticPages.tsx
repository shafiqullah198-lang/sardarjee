import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, BriefcaseBusiness, MapPin, Phone, Send } from "lucide-react";
import { CRIMSON, GOLD, POPPINS } from "@/app/constants";
import { ProductCard } from "@/app/components/ProductCard";
import { useHomepageData, type UiProduct } from "@/hooks/useHomepageData";
import { useStore } from "@/context/StoreContext";
import { ROUTES } from "@/app/routes";
import { fetchCareerOpportunities } from "@/services/cms";
import type { ApiCareerOpportunity } from "@/services/types";

const PHONE = "0315-9457186";
const PHONE_HREF = "tel:03159457186";
const ADDRESS = "Shop # G-5, Malikabad Shopping Mall, Rehmanabad Chowk, Murree Road, Rawalpindi";
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;

function PageShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-4 py-12 text-[var(--text-main)] sm:px-6 sm:py-16 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-3xl sm:mb-12">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--accent-color)]">{eyebrow}</p>
          <h1 className="text-3xl font-extrabold leading-tight text-[var(--heading-color)] sm:text-5xl" style={POPPINS}>{title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">{intro}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

function InfoCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-border bg-[var(--card-bg)] text-[var(--text-main)] shadow-xl shadow-black/5 backdrop-blur-2xl dark:shadow-black/40 ${className}`}>
      {children}
    </div>
  );
}

function InfoGrid({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <InfoCard key={item.title} className="rounded-3xl p-6">
          <h2 className="text-lg font-bold text-[var(--heading-color)]" style={POPPINS}>{item.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{item.text}</p>
        </InfoCard>
      ))}
    </div>
  );
}

export function AboutUsPage() {
  return (
    <PageShell eyebrow="About Us" title="Sardar-G Fabrics" intro="A Rawalpindi fabric house focused on men's suiting, stitching cloth, and dependable everyday elegance.">
      <InfoGrid items={[
        { title: "Premium Cloth", text: "We curate suiting and stitching fabrics with attention to fall, feel, finish, and long-term wear." },
        { title: "Local Trust", text: "Our shop serves customers from Rehmanabad, Murree Road, and nearby communities with honest fabric guidance." },
        { title: "Men's Wardrobe", text: "From shalwar kameez to formal wedding wear, our collections are selected for Pakistani style and climate." },
      ]} />
    </PageShell>
  );
}

export function OurStoryPage() {
  return (
    <PageShell eyebrow="Our Story" title="25 Years of Hard Work & Trusted Quality" intro="Sardar-G Fabrics is built on patient service, practical fabric knowledge, and relationships that continue across generations.">
      <InfoCard className="max-w-4xl rounded-3xl p-6 sm:p-8">
        <p className="text-sm leading-7 text-[var(--text-muted)]">
          Our story is simple: help customers choose cloth with confidence. Every cut, color, and texture is selected with the realities of tailoring, comfort, and occasion in mind.
        </p>
        <Link to={ROUTES.shop} className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white" style={{ background: CRIMSON }}>
          Explore Collection <ArrowRight className="h-4 w-4" />
        </Link>
      </InfoCard>
    </PageShell>
  );
}

export function LookbookPage() {
  const homepage = useHomepageData();
  const products = homepage.lookbookProducts.length ? homepage.lookbookProducts : homepage.fabricHouseProducts;
  return (
    <PageShell eyebrow="Lookbook" title="Our Lookbook" intro="A dynamic gallery from uploaded product images and latest active fabric collections.">
      {homepage.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted" />)}</div>
      ) : products.length ? (
        <div className="grid auto-rows-[240px] gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[280px]">
          {products.slice(0, 6).map((product, index) => (
            <Link key={product.id} to={ROUTES.product(product.id)} className={`group overflow-hidden rounded-3xl bg-muted shadow-xl ${index === 0 ? "lg:row-span-2" : ""}`}>
              <img src={product.img} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </Link>
          ))}
        </div>
      ) : (
        <InfoCard className="rounded-3xl p-8 text-sm text-[var(--text-muted)]">Lookbook images will appear when uploaded products are available.</InfoCard>
      )}
    </PageShell>
  );
}

export function ContactPage() {
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <PageShell eyebrow="Contact" title="Visit Sardar-G Fabrics" intro="Call us, visit the shop, or send a message and our team will respond as soon as possible.">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <InfoCard className="rounded-3xl p-0">
          <a href={PHONE_HREF} className="flex items-center gap-4 p-5">
            <Phone className="h-5 w-5" style={{ color: GOLD }} />
            <span className="font-bold">{PHONE}</span>
          </a>
          </InfoCard>
          <InfoCard className="rounded-3xl p-0">
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-5">
            <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: GOLD }} />
            <span className="text-sm font-semibold leading-relaxed">{ADDRESS}</span>
          </a>
          </InfoCard>
        </div>
        <InfoCard className="rounded-3xl p-6">
        <form onSubmit={submit} className="grid gap-4">
          <input required placeholder="Name" className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          <input required type="tel" placeholder="Phone" className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          <textarea required placeholder="Message" rows={5} className="resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          {sent && <p className="text-sm font-semibold" style={{ color: CRIMSON }}>Message received. We will contact you shortly.</p>}
          <button className="inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white" style={{ background: CRIMSON }}>
            Send Message <Send className="h-4 w-4" />
          </button>
        </form>
        </InfoCard>
      </div>
    </PageShell>
  );
}

export function FaqsPage() {
  return (
    <PageShell eyebrow="FAQs" title="Frequently Asked Questions" intro="Helpful answers for fabric selection, orders, tailoring preparation, and store visits.">
      <InfoGrid items={[
        { title: "Can I order online?", text: "Yes. Browse products online and contact us for availability, cutting, and delivery guidance." },
        { title: "Are colors exact?", text: "Product photos are uploaded from real items, but color may vary slightly by screen and lighting." },
        { title: "Can admin update this page?", text: "This placeholder content is ready to be replaced by admin-managed FAQ content later." },
      ]} />
    </PageShell>
  );
}

export function ReturnsPage() {
  return (
    <PageShell eyebrow="Returns" title="Returns & Exchanges" intro="Clear return guidance for customers. Admin can replace this placeholder policy later.">
      <InfoGrid items={[
        { title: "Inspection", text: "Please inspect your fabric at delivery or pickup and contact us quickly if there is a concern." },
        { title: "Uncut Fabric", text: "Returns are easiest for unused, uncut, and undamaged fabric with original purchase details." },
        { title: "Support", text: "Call 0315-9457186 with your order number or visit the shop for help." },
      ]} />
    </PageShell>
  );
}

export function SizeGuidePage() {
  return (
    <PageShell eyebrow="Size Guide" title="Men's Fabric & Stitching Guide" intro="A simple guide to help customers plan fabric quantity before tailoring.">
      <InfoGrid items={[
        { title: "Shalwar Kameez", text: "Typical fabric needs vary by height, width, and design. Confirm with your tailor before cutting." },
        { title: "Suiting", text: "Formal suits require careful measurement for coat, trouser, and waistcoat combinations." },
        { title: "Wedding Wear", text: "Embroidered or premium fabrics may need extra margin for matching patterns and finishing." },
      ]} />
    </PageShell>
  );
}

export function PressPage() {
  return (
    <PageShell eyebrow="Press" title="Press & Media" intro="News, announcements, and future media coverage for Sardar-G Fabrics.">
      <InfoCard className="rounded-3xl p-8 text-sm text-[var(--text-muted)]">No press updates available right now. Please check again later.</InfoCard>
    </PageShell>
  );
}

export function CareersPage() {
  const [jobs, setJobs] = useState<ApiCareerOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCareerOpportunities()
      .then((rows) => {
        if (active) setJobs(rows);
      })
      .catch(() => {
        if (active) setJobs([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell eyebrow="Careers" title="Work With Sardar-G Fabrics" intro="Join a fabric house that values customer care, product knowledge, and dependable service.">
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-3xl bg-muted" />)}
        </div>
      ) : jobs.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <InfoCard key={job.id} className="flex min-h-72 flex-col rounded-3xl p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-color)]">{job.department}</p>
                  <h2 className="mt-2 text-xl font-extrabold text-[var(--heading-color)]" style={POPPINS}>{job.title}</h2>
                </div>
                <BriefcaseBusiness className="h-5 w-5 flex-shrink-0 text-[var(--accent-color)]" />
              </div>
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold text-[var(--text-main)]">
                <span className="rounded-full border border-border px-3 py-1">{job.location}</span>
                <span className="rounded-full border border-border px-3 py-1">{job.job_type}</span>
              </div>
              <p className="text-sm leading-6 text-[var(--text-muted)]">{job.description}</p>
              {job.requirements && (
                <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-[var(--text-muted)]">{job.requirements}</p>
              )}
            </InfoCard>
          ))}
        </div>
      ) : (
        <InfoCard className="rounded-3xl p-8 text-sm text-[var(--text-muted)]">
          No career opportunities available right now. Please check again later.
        </InfoCard>
      )}
    </PageShell>
  );
}

export function SalePage() {
  const homepage = useHomepageData();
  const saleProducts = homepage.saleProducts;
  const loading = homepage.loading;

  return (
    <PageShell eyebrow="Sale" title="Sale Collection" intro="Discounted fabrics and limited offers from the active product catalog.">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted" />)}</div>
      ) : saleProducts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{saleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} badgeOverride={`${Math.round(product.discountPercent)}% OFF`} />)}</div>
      ) : (
        <InfoCard className="rounded-3xl p-8 text-sm text-[var(--text-muted)]">No sale products available.</InfoCard>
      )}
    </PageShell>
  );
}

export function NewArrivalsPage() {
  const homepage = useHomepageData();
  const newArrivalProducts = homepage.newArrivals;
  const loading = homepage.loading;

  return (
    <PageShell eyebrow="Fresh Stock" title="New Arrivals" intro="The latest products marked as new arrivals by our team.">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted" />)}</div>
      ) : newArrivalProducts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{newArrivalProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} badgeOverride="NEW ARRIVAL" />)}</div>
      ) : (
        <InfoCard className="rounded-3xl p-8 text-sm text-[var(--text-muted)]">No new arrival products available.</InfoCard>
      )}
    </PageShell>
  );
}

export function CollectionPage({ title, slug, intro }: { title: string; slug: string; intro: string }) {
  const { products, productsLoading } = useStore();
  const filtered = useMemo(() => {
    const words = slug.split("-").filter(Boolean);
    return products.filter((product) => words.some((word) => `${product.name} ${product.cat}`.toLowerCase().includes(word)));
  }, [products, slug]);

  return (
    <PageShell eyebrow="Collection" title={title} intro={intro}>
      {productsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted" />)}</div>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
      ) : (
        <InfoCard className="rounded-3xl p-8">
          <p className="text-sm text-[var(--text-muted)]">This collection will show matching uploaded products when available.</p>
          <Link to={ROUTES.shop} className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white" style={{ background: CRIMSON }}>
            Browse All Products <ArrowRight className="h-4 w-4" />
          </Link>
        </InfoCard>
      )}
    </PageShell>
  );
}
