import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, ChevronRight, ImageIcon, Package, Search, Star } from "lucide-react";
import { CARD_GLASS, CRIMSON, GLASS, GOLD, POPPINS } from "@/app/constants";
import { ProductCard } from "@/app/components/ProductCard";
import { ROUTES } from "@/app/routes";
import { resolveMediaUrl } from "@/services/api";
import { subscribeNewsletter } from "@/services/cms";
import { useHomepageData, type UiCategory, type UiProduct, type UiTestimonial } from "@/hooks/useHomepageData";

const FALLBACK_HEROES = [
  {
     id: -1,
  title: "Premium Fabric & Timeless Style",
  subtitle: "Pakistan's No.1 Men's Fabric House",
  image: null,
  hero_media: "/media/hero/hero-video.mp4",
  media_type: "video" as const,
  media_url: "/media/hero/hero-video.mp4",
  hero_media_url: "/media/hero/hero-video.mp4",
  cta_text: "Men's Collection",
  cta_url: "/shop/men",
  secondary_cta_text: "Shop Now",
  secondary_cta_url: "/shop",
  is_active: true,
  sort_order: 0,
  },

];

function HeroSection({ heroes }: { heroes: ReturnType<typeof useHomepageData>["heroBanners"] }) {
  const [slide, setSlide] = useState(0);
  const [failedMedia, setFailedMedia] = useState<Set<string>>(() => new Set());
  const source = heroes.length ? heroes : FALLBACK_HEROES;
  const fallbackHero = FALLBACK_HEROES[0];
  const fallbackImage = FALLBACK_HEROES.find((hero) => hero.image)?.image ?? "";
  const heroMediaPath = (hero: (typeof source)[number]) => hero.hero_media_url || hero.media_url || hero.hero_media || hero.image;
  const heroMediaUrl = (hero: (typeof source)[number]) => resolveMediaUrl(heroMediaPath(hero));
  const heroImageFallback = (hero: (typeof source)[number]) => resolveMediaUrl(hero.image || fallbackImage);
  const isHeroVideo = (hero: (typeof source)[number]) => {
    const url = heroMediaUrl(hero).toLowerCase();
    return hero.media_type === "video" || url.includes(".mp4") || url.includes(".webm");
  };
  const slides = source.filter((hero) => heroMediaUrl(hero));
  const activeHero = slides[slide] ?? heroes[0] ?? null;
  const hasHeroMedia = Boolean(activeHero && heroMediaUrl(activeHero));

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setTimeout(() => {
      setSlide((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [slide, slides.length]);

  const heroTitle = activeHero?.title?.trim() || fallbackHero.title;
  const heroSubtitle = activeHero?.subtitle?.trim() || fallbackHero.subtitle;
  const primaryText = activeHero?.cta_text?.trim() || fallbackHero.cta_text;
  const primaryUrl = activeHero?.cta_url?.trim() || fallbackHero.cta_url || ROUTES.shop;
  const secondaryText = activeHero?.secondary_cta_text?.trim() || fallbackHero.secondary_cta_text;
  const secondaryUrl = activeHero?.secondary_cta_url?.trim() || fallbackHero.secondary_cta_url || ROUTES.shop;

  return (
    <section className="relative min-h-[650px] overflow-hidden">
      {hasHeroMedia ? (
        slides.map((hero, index) => (
          <div
            key={hero.id ?? `${heroMediaUrl(hero)}-${index}`}
            className="absolute inset-0 z-0 transition-opacity duration-[1800ms]"
            style={{ opacity: slide === index ? 1 : 0 }}
          >
            {(() => {
              const mediaUrl = heroMediaUrl(hero);
              const imageFallbackUrl = heroImageFallback(hero);
              const mediaType = mediaUrl.toLowerCase().includes(".webm") ? "video/webm" : "video/mp4";
              const shouldShowVideo = isHeroVideo(hero) && !failedMedia.has(mediaUrl);
              return shouldShowVideo ? (
                <video
                  key={mediaUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={imageFallbackUrl || undefined}
                  src={mediaUrl}
                  className="absolute inset-0 h-full w-full object-cover z-0"
                  onCanPlay={(event) => {
                    event.currentTarget.muted = true;
                    void event.currentTarget.play();
                  }}
                  onLoadedData={(event) => {
                    event.currentTarget.muted = true;
                    void event.currentTarget.play();
                  }}
                  onError={(event) => {
                    event.preventDefault();
                    setFailedMedia((current) => new Set(current).add(mediaUrl));
                  }}
                >
                  <source src={mediaUrl} type={mediaType} />
                </video>
              ) : (
                <img src={isHeroVideo(hero) ? imageFallbackUrl : mediaUrl} alt={hero.title || "Homepage hero"} className="absolute inset-0 h-full w-full object-cover z-0" />
              );
            })()}
          </div>
        ))
      ) : (
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_30%,rgba(201,160,96,0.24),transparent_34%),linear-gradient(135deg,#16070b_0%,#050505_55%,#270912_100%)]" />
      )}
      <div className="absolute inset-0 z-10 bg-black/25" />
      <div className="relative z-20 min-h-[650px] flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-16 max-w-full">
        {heroSubtitle && (
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="text-[10px] sm:text-[11px] tracking-[0.35em] sm:tracking-[0.45em] uppercase font-semibold mb-4 sm:mb-5 max-w-[90vw]" style={{ color: GOLD }}>
            {heroSubtitle}
          </motion.p>
        )}
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 1 }} className="text-[30px] min-[380px]:text-[36px] sm:text-[58px] md:text-[74px] lg:text-[88px] font-extrabold leading-[1.08] text-white mb-5 px-2 text-balance max-w-[95vw]" style={POPPINS}>
          {heroTitle || "Homepage Hero"}
        </motion.h1>
        {!activeHero && (
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.8 }} className="text-[12px] sm:text-[14px] tracking-[0.16em] uppercase font-medium mb-8 sm:mb-10 px-2 max-w-xl text-white/55">
            Configure homepage hero from admin
          </motion.p>
        )}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72, duration: 0.8 }} className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full max-w-md sm:max-w-none px-2">
          {primaryText && (
            <Link to={primaryUrl} className="px-5 sm:px-8 py-3 sm:py-3.5 rounded-full text-white text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.15em] uppercase font-semibold hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg" style={{ background: CRIMSON }}>
              {primaryText}
            </Link>
          )}
          {secondaryText && (
            <Link to={secondaryUrl} className={`${GLASS} px-5 sm:px-8 py-3 sm:py-3.5 rounded-full text-white text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.15em] uppercase font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105`}>
              {secondaryText}
            </Link>
          )}
        </motion.div>
        {slides.length > 1 && (
          <div className="absolute bottom-6 sm:bottom-10 z-20 flex gap-2.5">
            {slides.map((hero, index) => (
              <button
                key={hero.id ?? index}
                type="button"
                onClick={() => setSlide(index)}
                aria-label={`Slide ${index + 1}`}
                className="h-px rounded-full transition-all duration-500"
                style={{
                  width: slide === index ? 32 : 16,
                  background: slide === index ? GOLD : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CollectionsSection({ categories }: { categories: UiCategory[] }) {
  if (!categories.length) return null;

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.4em] uppercase font-semibold text-muted-foreground mb-2">Browse Categories</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight" style={POPPINS}>What Are You Looking For?</h2>
          </div>
          <Link to={ROUTES.shop} className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase font-semibold text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {categories.map((cat, index) => (
            <motion.div key={cat.slug || `${cat.name}-${index}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.07, duration: 0.6 }}>
              <Link to={cat.slug ? ROUTES.shopCategory(cat.slug) : ROUTES.shop} className="group relative overflow-hidden rounded-2xl aspect-[3/4] bg-secondary block border border-white/10 shadow-xl shadow-black/10">
                {cat.img ? (
                  <img src={cat.img} alt={cat.name} className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_25%_20%,rgba(201,160,96,0.26),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(125,0,32,0.18)_48%,rgba(201,160,96,0.22))] transition-transform duration-700 group-hover:scale-105">
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-full border border-white/20 bg-white/10 p-5 text-white/70 backdrop-blur-xl">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/32 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-70" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
                  <p className="text-[8px] sm:text-[9px] tracking-[0.25em] sm:tracking-[0.3em] uppercase font-semibold mb-1 truncate" style={{ color: GOLD }}>{cat.sub}</p>
                  <p className="text-[14px] sm:text-[16px] font-bold text-white leading-tight line-clamp-2" style={POPPINS}>{cat.name}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductEmptyState() {
  return (
    <div className={`${CARD_GLASS} rounded-3xl p-8 sm:p-12 text-center`}>
      <Search className="w-9 h-9 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-xl font-bold" style={POPPINS}>No products available yet.</h3>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="min-w-0">
          <div className="mb-3 aspect-[3/4] animate-pulse rounded-2xl bg-muted sm:mb-4" />
          <div className="mb-2 h-3 w-1/3 animate-pulse rounded-full bg-muted" />
          <div className="mb-2 h-4 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ProductsSection({
  products,
  loading,
  eyebrow,
  title,
  subtitle,
  viewAllTo,
  badge,
  muted = true,
}: {
  products: UiProduct[];
  loading: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  viewAllTo: string;
  badge?: (product: UiProduct) => string;
  muted?: boolean;
}) {
  return (
    <section className="py-14 sm:py-20" style={{ background: muted ? "var(--secondary)" : "var(--background)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <p className="text-[10px] tracking-[0.4em] uppercase font-semibold text-muted-foreground mb-2">{eyebrow}</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={POPPINS}>{title}</h2>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Link to={viewAllTo} className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase font-semibold text-muted-foreground hover:text-foreground">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? <ProductsSkeleton /> : products.length === 0 ? <ProductEmptyState /> : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product, index) => <ProductCard key={product.id} product={product} index={index} badgeOverride={badge?.(product)} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function FabricHouseSection({ products }: { products: UiProduct[] }) {
  const imageProducts = products.filter((product) => product.img).slice(0, 4);

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-10 text-white bg-[radial-gradient(circle_at_18%_20%,rgba(201,160,96,0.22),transparent_32%),radial-gradient(circle_at_82%_70%,rgba(125,0,32,0.34),transparent_34%),linear-gradient(135deg,#120609_0%,#050505_52%,#230811_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08),transparent_35%,rgba(201,160,96,0.08))]" />
      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="max-w-xl">
          <p className="text-[10px] tracking-[0.42em] uppercase font-semibold mb-3" style={{ color: GOLD }}>Premium Fabric House</p>
          <h2 className="text-[30px] sm:text-[42px] md:text-[54px] font-extrabold leading-tight mb-5" style={POPPINS}>Pakistan&apos;s Best Fabric House</h2>
          <p className="text-white/70 text-[14px] sm:text-[16px] leading-relaxed mb-8">
            Discover refined fabrics, elevated tailoring, and timeless pieces selected from our latest uploaded collections.
          </p>
          <Link to={ROUTES.shop} className="inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[11px] tracking-[0.18em] uppercase font-bold text-white shadow-xl shadow-black/30 transition-all duration-300 hover:gap-4 hover:scale-[1.02]" style={{ background: CRIMSON }}>
            Explore Collection <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
        {imageProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:pl-4">
            {imageProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.65 }}
                className={index % 2 === 0 ? "translate-y-0 sm:-translate-y-5" : "translate-y-5 sm:translate-y-8"}
              >
                <Link to={ROUTES.product(product.id)} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-white/10 shadow-2xl shadow-black/45 ring-1 ring-white/15">
                  <img src={product.img} alt={product.name} className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10 opacity-90" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StorySection({ stats, story, products }: { stats: ReturnType<typeof useHomepageData>["stats"]; story: ReturnType<typeof useHomepageData>["story"]; products: UiProduct[] }) {
  const storyImage = story?.image || products.find((product) => product.img)?.img || "";
  const storyText =
    story?.text ||
    "Built through years of hard work, careful sourcing, and trusted customer relationships, Sardar-Jee continues to bring quality fabric selections to wardrobes across Pakistan.";

  return (
    <section id="story" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-10 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        {stats.length > 0 && (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-12 sm:mb-16">
            {stats.map((stat) => (
              <div key={stat.id} className={`${CARD_GLASS} rounded-2xl p-4 sm:p-6 text-center min-w-0`}>
                <p className="text-[28px] sm:text-[38px] md:text-[44px] font-extrabold mb-1 leading-none" style={{ ...POPPINS, color: CRIMSON }}>{stat.value ?? 0}</p>
                <p className="text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.25em] uppercase font-semibold text-muted-foreground">{stat.title || stat.label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="min-w-0">
            <p className="text-[10px] tracking-[0.4em] uppercase font-semibold text-muted-foreground mb-3">Our Story</p>
            <h2 className="text-[26px] sm:text-[36px] md:text-[44px] font-bold mb-6 leading-tight" style={POPPINS}>25 Years of Hard Work &amp; Trusted Quality</h2>
            <p className="text-muted-foreground leading-relaxed mb-5 text-[14px] sm:text-[15px]">{storyText}</p>
            {story?.cta_text && (
              <Link to={story.cta_url || ROUTES.stores} className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.2em] uppercase font-bold hover:gap-5 transition-all" style={{ color: CRIMSON }}>
                {story.cta_text} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>
          {storyImage && (
            <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="aspect-[4/5] overflow-hidden rounded-3xl bg-muted shadow-2xl shadow-black/10">
              <img src={storyImage} alt="25 Years of Hard Work and Trusted Quality" className="w-full h-full object-cover object-center" loading="lazy" />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

function LookbookSection({ products }: { products: UiProduct[] }) {
  const imageProducts = products.filter((product) => product.img).slice(0, 6);
  const tileClasses = [
    "md:col-span-2 md:row-span-2",
    "",
    "",
    "",
    "md:col-span-2",
    "",
  ];

  if (!imageProducts.length) return null;

  return (
    <section id="lookbook" className="py-14 sm:py-20 scroll-mt-20" style={{ background: "var(--secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-[10px] tracking-[0.4em] uppercase font-semibold text-muted-foreground mb-2">Style Gallery</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={POPPINS}>Our Lookbook</h2>
        </div>
        <div className="grid auto-rows-[220px] grid-cols-1 gap-2.5 sm:grid-cols-2 sm:auto-rows-[260px] sm:gap-4 md:grid-cols-4 md:auto-rows-[190px] lg:auto-rows-[230px]">
          {imageProducts.map((product, index) => (
            <Link key={`${product.id}-${index}`} to={ROUTES.product(product.id)} className={`group relative overflow-hidden rounded-2xl bg-muted shadow-xl shadow-black/10 ${tileClasses[index] ?? ""}`}>
              <img src={product.img} alt={product.name} className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10 opacity-70" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ testimonials }: { testimonials: UiTestimonial[] }) {
  if (!testimonials.length) return null;
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[10px] tracking-[0.4em] uppercase font-semibold text-muted-foreground mb-2">Customer Reviews</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={POPPINS}>What Our Customers Say</h2>
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:gap-6">
          {testimonials.map((review) => (
            <div key={`${review.name}-${review.text}`} className={`${CARD_GLASS} min-h-[280px] w-[82vw] max-w-sm flex-none snap-center rounded-2xl p-6 sm:w-[380px] sm:p-7 flex flex-col`}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => <Star key={index} className="w-3.5 h-3.5" style={{ fill: index < Math.floor(review.rating) ? GOLD : "var(--muted)", color: index < Math.floor(review.rating) ? GOLD : "var(--muted)" }} />)}
                </div>
                {review.verifiedPurchase && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                    <BadgeCheck className="h-3 w-3" /> Verified Customer
                  </span>
                )}
              </div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground line-clamp-1">{review.productName}</p>
              <p className="text-[14px] text-foreground/75 leading-relaxed mb-6 flex-1">&ldquo;{review.text}&rdquo;</p>
              <div className="flex items-center gap-3 min-w-0">
                {review.image ? (
                  <img src={review.image} alt={review.name} className="h-10 w-10 flex-shrink-0 rounded-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: CRIMSON }}>{review.init}</div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate">{review.name}</p>
                  <p className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-10 relative overflow-hidden" style={{ background: "var(--secondary)" }}>
      <div className={`relative max-w-xl mx-auto ${CARD_GLASS} rounded-3xl p-8 sm:p-14 text-center`}>
        <Package className="w-8 h-8 mx-auto mb-5" style={{ color: CRIMSON }} />
        <h2 className="text-[22px] sm:text-[32px] font-bold mb-3" style={POPPINS}>Join the Sardar-Jee Family</h2>
        {sent ? (
          <p className="text-[14px] font-semibold" style={{ color: CRIMSON }}>Thank you! You are now subscribed.</p>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!email) return;
              await subscribeNewsletter(email);
              setSent(true);
            }}
            className="flex flex-col sm:flex-row gap-3 w-full"
          >
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" required className="flex-1 min-w-0 border border-border rounded-full px-5 py-3.5 text-[14px] focus:outline-none" style={{ background: "var(--input-background)" }} />
            <button type="submit" className="text-white px-7 py-3.5 rounded-full text-[11px] tracking-[0.2em] uppercase font-bold whitespace-nowrap" style={{ background: CRIMSON }}>Subscribe</button>
          </form>
        )}
      </div>
    </section>
  );
}

export function HomePage() {
  const homepage = useHomepageData();

  return (
    <main>
      <HeroSection heroes={homepage.heroBanners} />
      <CollectionsSection categories={homepage.categories} />
      <ProductsSection
        products={homepage.newArrivals}
        loading={homepage.loading}
        eyebrow="Fresh Stock"
        title="New Arrivals"
        viewAllTo={ROUTES.newArrivals}
        badge={() => "NEW ARRIVAL"}
      />
      <ProductsSection
        products={homepage.saleProducts}
        loading={homepage.loading}
        eyebrow="On Sale"
        title="On Sale"
        subtitle="Limited time offers"
        viewAllTo={ROUTES.sale}
        badge={(product) => `${Math.round(product.discountPercent)}% OFF`}
        muted={false}
      />
      <FabricHouseSection products={homepage.fabricHouseProducts} />
      <StorySection stats={homepage.stats} story={homepage.story} products={homepage.fabricHouseProducts.length ? homepage.fabricHouseProducts : homepage.newArrivals} />
      <LookbookSection products={homepage.lookbookProducts} />
      <TestimonialsSection testimonials={homepage.testimonials} />
      <NewsletterSection />
    </main>
  );
}
