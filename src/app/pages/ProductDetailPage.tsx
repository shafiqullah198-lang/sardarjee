import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, BadgeCheck, Heart, ShoppingBag, Star } from "lucide-react";
import { CRIMSON, GOLD, MONO, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { useStore } from "@/context/StoreContext";
import { createReview, fetchReviews } from "@/services/reviews";
import { ApiRequestError, safeRequest } from "@/services/api";
import type { ApiReview } from "@/services/types";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProduct, addToCart, toggleWishlist, isWishlisted, products, productsLoading } = useStore();
  const productId = Number(id);
  const product = getProduct(productId);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    async function loadReviews() {
      const approved = await safeRequest(() => fetchReviews(productId));
      if (cancelled) return;
      setReviews(approved ?? []);
    }
    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (productsLoading) {
    return <main className="py-20 px-4 text-center text-muted-foreground">Loading product...</main>;
  }

  if (!product) {
    return (
      <main className="py-20 px-4 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4" style={POPPINS}>Product not found</h1>
        <p className="text-muted-foreground mb-8">This item may have been removed or is unavailable.</p>
        <Link to={ROUTES.shop} className="text-[11px] tracking-[0.15em] uppercase font-bold underline">
          Back to shop
        </Link>
      </main>
    );
  }

  const wished = isWishlisted(product.id);
  const related = products.filter((p) => p.id !== product.id && p.cat === product.cat).slice(0, 4);
  const selectedColor = product.colorVariants.find((variant) => variant.id === selectedColorId) ?? null;
  const activeImage = selectedColor?.image || product.img;
  const visibleStock = selectedColor ? selectedColor.stock : product.stock;
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : product.rating || 0;
  const reviewsCount = reviews.length || product.reviews;

  function reviewErrorMessage(error: unknown): string {
    if (error instanceof ApiRequestError) {
      console.error("Guest review submit failed", error.status, error.data);
      const data = error.data;
      if (data && typeof data === "object") {
        if ("detail" in data && typeof data.detail === "string") return data.detail;
        const firstKey = Object.keys(data)[0];
        const value = (data as Record<string, unknown>)[firstKey];
        if (Array.isArray(value) && typeof value[0] === "string") return value[0];
        if (typeof value === "string") return value;
      }
      return error.message;
    }
    console.error("Guest review submit failed", error);
    return "Unable to submit review. Please try again.";
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    setSubmittingReview(true);
    setReviewError("");
    setReviewMessage("");
    try {
      const created = await createReview({
        product: product.id,
        rating: reviewRating,
        guest_name: reviewName.trim(),
        review_text: reviewText.trim(),
        image: reviewImage,
      });
      setReviews((current) => [created, ...current.filter((review) => review.id !== created.id)]);
      setReviewMessage("Review submitted successfully.");
      setReviewName("");
      setReviewText("");
      setReviewImage(null);
    } catch (error) {
      setReviewError(reviewErrorMessage(error));
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase font-semibold text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
          <div className="rounded-2xl overflow-hidden aspect-[3/4] bg-muted max-w-full">
            {activeImage ? (
              <img src={activeImage} alt={selectedColor ? `${product.name} ${selectedColor.colorName}` : product.name} className="w-full h-full object-cover object-center" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No image</div>
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">{product.cat}</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight" style={POPPINS}>
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="text-xl font-bold" style={MONO}>{product.price}</span>
              {product.orig && (
                <span className="text-muted-foreground line-through" style={MONO}>{product.orig}</span>
              )}
              <span
                className="text-[9px] tracking-[0.15em] uppercase font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: product.hasDiscount ? CRIMSON : "rgba(0,0,0,0.5)" }}
              >
                {product.badge}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-8">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className="w-4 h-4" style={{ fill: j < Math.floor(averageRating) ? GOLD : "var(--muted)", color: j < Math.floor(averageRating) ? GOLD : "var(--muted)" }} />
              ))}
              <span className="text-sm text-muted-foreground">{averageRating ? averageRating.toFixed(1) : "0.0"} ({reviewsCount} reviews)</span>
            </div>
            <div className="mb-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] tracking-[0.25em] uppercase font-semibold text-muted-foreground">Available Colors</p>
                <p className="text-sm font-bold">Stock: {visibleStock ?? 0}</p>
              </div>
              {product.colorVariants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.colorVariants.map((variant) => {
                    const selected = selectedColor?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedColorId(selected ? null : variant.id)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition ${selected ? "border-foreground bg-secondary" : "border-border hover:bg-secondary"}`}
                      >
                        <span className="h-5 w-5 rounded-full border border-black/10 shadow-sm" style={{ background: variant.colorHex || "linear-gradient(135deg,#f4efe5,#c9a060)" }} />
                        {variant.colorName}
                        <span className="text-muted-foreground">({variant.stock})</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Total stock: {product.stock ?? 0}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <button
                type="button"
                onClick={() => addToCart(product)}
                className="flex-1 flex items-center justify-center gap-2 text-white py-4 rounded-full text-[11px] tracking-[0.15em] uppercase font-bold"
                style={{ background: CRIMSON }}
              >
                <ShoppingBag className="w-4 h-4" /> Add to Cart
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className="flex items-center justify-center gap-2 border border-border py-4 px-6 rounded-full text-[11px] tracking-[0.15em] uppercase font-bold hover:bg-secondary transition-colors"
              >
                <Heart style={{ fill: wished ? CRIMSON : "none", color: wished ? CRIMSON : "currentColor" }} className="w-4 h-4" />
                Wishlist
              </button>
            </div>
          </div>
        </div>
        <section className="mt-16 sm:mt-20 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">Customer Reviews</p>
                <h2 className="text-xl sm:text-2xl font-bold" style={POPPINS}>Customer Reviews</h2>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">{averageRating ? averageRating.toFixed(1) : "0.0"} average rating</p>
            </div>
            {reviews.length ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {review.image_url || review.review_image_url ? (
                          <img src={review.image_url || review.review_image_url || ""} alt={review.guest_name || review.customer_name || "Customer"} className="h-10 w-10 rounded-full object-cover" loading="lazy" />
                        ) : (
                          <div className="h-10 w-10 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{ background: CRIMSON }}>
                            {(review.guest_name || review.customer_name || review.user_email || "C").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{review.guest_name || review.customer_name || review.user_email || "Customer"}</p>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {review.verified_purchase && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                          <BadgeCheck className="h-3.5 w-3.5" /> Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="mb-3 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className="h-4 w-4" style={{ fill: index < review.rating ? GOLD : "var(--muted)", color: index < review.rating ? GOLD : "var(--muted)" }} />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/75">{review.review_text || review.comment || review.title}</p>
                    {(review.image_url || review.review_image_url) && (
                      <img src={review.image_url || review.review_image_url || ""} alt="Customer review" className="mt-4 h-28 w-28 rounded-xl object-cover" loading="lazy" />
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">No reviews yet for this product.</p>
            )}
          </div>
          <aside className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="text-lg font-bold mb-2" style={POPPINS}>Write a Review</h3>
            <p className="mb-5 text-sm text-muted-foreground">No login required. Reviews appear instantly unless hidden later.</p>
            <form onSubmit={submitReview} className="space-y-4">
                <input value={reviewName} onChange={(event) => setReviewName(event.target.value)} required placeholder="Name" className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none" />
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Rating</p>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      return (
                        <button key={value} type="button" onClick={() => setReviewRating(value)} aria-label={`${value} stars`}>
                          <Star className="h-6 w-6" style={{ fill: value <= reviewRating ? GOLD : "var(--muted)", color: value <= reviewRating ? GOLD : "var(--muted)" }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} required placeholder="Review text" rows={5} className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none" />
                <label className="block text-xs font-semibold text-muted-foreground">
                  Review image optional
                  <input type="file" accept="image/*" onChange={(event) => setReviewImage(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs" />
                </label>
                {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
                {reviewMessage && <p className="text-sm font-semibold" style={{ color: CRIMSON }}>{reviewMessage}</p>}
                <button type="submit" disabled={submittingReview} className="w-full rounded-full py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white disabled:opacity-60" style={{ background: CRIMSON }}>
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
          </aside>
        </section>
        {related.length > 0 && (
          <section className="mt-16 sm:mt-20">
            <h2 className="text-xl font-bold mb-6" style={POPPINS}>You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {related.map((p, i) => (
                <Link key={p.id} to={ROUTES.product(p.id)} className="group min-w-0">
                  <div className="rounded-2xl overflow-hidden aspect-[3/4] bg-muted mb-2">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <p className="text-sm font-semibold line-clamp-1">{p.name}</p>
                  <p className="text-xs font-bold" style={MONO}>{p.price}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
