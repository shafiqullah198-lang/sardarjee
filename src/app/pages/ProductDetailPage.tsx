import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Heart, ShoppingBag, Star } from "lucide-react";
import { CRIMSON, GOLD, MONO, POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";
import { ProductCard } from "@/app/components/ProductCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import { mapApiProduct, type UiColorVariant, type UiProduct, type UiProductVariant } from "@/hooks/useHomepageData";
import { useStore } from "@/context/StoreContext";
import { ApiRequestError, resolveMediaUrl } from "@/services/api";
import { fetchProductById } from "@/services/products";
import { createReview, fetchReviews } from "@/services/reviews";
import type { ApiProduct, ApiReview } from "@/services/types";



function ProductDetailSkeleton() {
  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <Skeleton className="mb-8 h-4 w-24 rounded-full" />
        <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
          <Skeleton className="aspect-[3/4] w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-20 w-full rounded-3xl" />
            <Skeleton className="h-16 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    </main>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isWishlisted, products } = useStore();
  const productId = Number(id);
  const storeProduct = useMemo(() => products.find((item) => item.id === productId) ?? null, [productId, products]);

  const [productData, setProductData] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedFabric, setSelectedFabric] = useState("");
  const [selectedStitch, setSelectedStitch] = useState<boolean | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const uiProduct = useMemo(() => {
    if (productData) return mapApiProduct(productData, 0, storeProduct ?? undefined);
    return storeProduct;
  }, [productData, storeProduct]);

  const activeVariants = useMemo(
    () => (uiProduct?.variants ?? []).filter((variant) => variant.isActive),
    [uiProduct],
  );
  const selectedColor = useMemo(
    () => uiProduct?.colorVariants.find((variant) => variant.id === selectedColorId) ?? null,
    [selectedColorId, uiProduct],
  );
  const sizes = useMemo(
    () => [...new Set(activeVariants.map((variant) => variant.size).filter(Boolean))],
    [activeVariants],
  );
  const fabrics = useMemo(
    () => [...new Set(activeVariants.map((variant) => variant.fabric).filter(Boolean))],
    [activeVariants],
  );
  const hasStitchedOption = useMemo(
    () => activeVariants.some((variant) => variant.isStitched) && activeVariants.some((variant) => !variant.isStitched),
    [activeVariants],
  );
  const resolvedVariant = useMemo<UiProductVariant | null>(() => {
    if (!activeVariants.length) return null;
    const byId = activeVariants.find((variant) => variant.id === selectedVariantId);
    if (byId) return byId;
    let candidates = [...activeVariants];
    if (selectedColor) {
      const byColor = candidates.filter((variant) => variant.colorVariantId === selectedColor.id);
      if (byColor.length) candidates = byColor;
      else {
        const byColorName = candidates.filter((variant) => variant.color.toLowerCase() === selectedColor.colorName.toLowerCase());
        if (byColorName.length) candidates = byColorName;
      }
    }
    if (selectedSize) {
      const bySize = candidates.filter((variant) => variant.size === selectedSize);
      if (bySize.length) candidates = bySize;
    }
    if (selectedFabric) {
      const byFabric = candidates.filter((variant) => variant.fabric === selectedFabric);
      if (byFabric.length) candidates = byFabric;
    }
    if (selectedStitch !== null) {
      const byStitch = candidates.filter((variant) => variant.isStitched === selectedStitch);
      if (byStitch.length) candidates = byStitch;
    }
    return candidates[0] ?? activeVariants[0] ?? null;
  }, [activeVariants, selectedColor, selectedSize, selectedFabric, selectedStitch, selectedVariantId]);

  const placeholderImage = "";
  const selectedVariant = resolvedVariant;
  const product = productData;

  const galleryImages = useMemo(() => {
    const variantImages = selectedVariant?.images?.map((img) => img.imageUrl || img.thumbnailUrl) ?? [];
    const colorImages = selectedColor?.images?.map((img) => img.imageUrl || img.thumbnailUrl) ?? [];
    const legacyColorImage = selectedColor?.image ? [selectedColor.image] : [];
    const apiProductImages = product?.product_images?.length ? product.product_images : (product?.images ?? []);
    const productImages = apiProductImages
      .map((img) => resolveMediaUrl(img.thumbnail_url || img.image_url || img.image))
      .filter((url): url is string => Boolean(url));

    if (variantImages.length > 0) return variantImages;
    if (colorImages.length > 0) return colorImages;
    if (legacyColorImage.length > 0) return legacyColorImage;
    if (productImages.length > 0) return productImages;
    return [placeholderImage];
  }, [selectedVariant, selectedColor, product]);

  const visibleStock = useMemo(() => {
    if (resolvedVariant && selectedColor) {
      return Math.max(resolvedVariant.stock ?? 0, selectedColor.stock ?? 0);
    }
    if (resolvedVariant) return resolvedVariant.stock ?? 0;
    if (selectedColor) return selectedColor.stock ?? 0;
    return uiProduct?.stock ?? 0;
  }, [resolvedVariant, selectedColor, uiProduct?.stock]);
  const isOutOfStock = visibleStock <= 0;
  const wished = uiProduct ? isWishlisted(uiProduct.id) : false;
  const related = useMemo(
    () => products.filter((product) => product.id !== productId && product.cat === uiProduct?.cat).slice(0, 4),
    [productId, products, uiProduct?.cat],
  );
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : uiProduct?.rating || 0;
  const reviewsCount = reviews.length || uiProduct?.reviews || 0;

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setError("Invalid product ID.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    async function loadProduct() {
      try {
        const data = await fetchProductById(productId);
        if (cancelled) return;
        setProductData(data);
      } catch (loadError) {
        if (cancelled) return;
        const message = loadError instanceof Error ? loadError.message : "Unable to load product.";
        setError(message);
        setProductData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    async function loadReviews() {
      try {
        const productReviews = await fetchReviews(productId);
        if (!cancelled) setReviews(productReviews);
      } catch {
        if (!cancelled) setReviews([]);
      }
    }
    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [selectedVariantId, productId]);

  useEffect(() => {
    if (!uiProduct) return;
    const firstVariant = activeVariants[0] ?? null;
    setSelectedColorId(firstVariant?.colorVariantId ?? uiProduct.colorVariants[0]?.id ?? null);
    setSelectedSize(firstVariant?.size ?? "");
    setSelectedFabric(firstVariant?.fabric ?? "");
    setSelectedStitch(typeof firstVariant?.isStitched === "boolean" ? firstVariant.isStitched : null);
    setSelectedVariantId(firstVariant?.id ?? null);
  }, [activeVariants, uiProduct]);

  function applyVariantSelection(variant: UiProductVariant | null) {
    if (!variant) return;
    setSelectedVariantId(variant.id);
    setSelectedColorId(variant.colorVariantId ?? null);
    setSelectedSize(variant.size ?? "");
    setSelectedFabric(variant.fabric ?? "");
    setSelectedStitch(typeof variant.isStitched === "boolean" ? variant.isStitched : null);
  }

  function selectByColor(colorVariant: UiColorVariant) {
    setSelectedColorId(colorVariant.id);
    setActiveImageIdx(0);
    const colorName = colorVariant.colorName.toLowerCase();
    const matchesColor = (variant: UiProductVariant) =>
      variant.colorVariantId === colorVariant.id || variant.color.toLowerCase() === colorName;
    const strict = activeVariants.find((variant) =>
      matchesColor(variant) &&
      (!selectedSize || variant.size === selectedSize) &&
      (!selectedFabric || variant.fabric === selectedFabric) &&
      (selectedStitch === null || variant.isStitched === selectedStitch)
    );
    const matchedVariant = strict ?? activeVariants.find(matchesColor) ?? null;
    if (matchedVariant) {
      applyVariantSelection(matchedVariant);
    }
  }

  function selectBySize(size: string) {
    const strict = activeVariants.find((variant) =>
      variant.size === size &&
      (!selectedColor || variant.colorVariantId === selectedColor.id || variant.color.toLowerCase() === selectedColor.colorName.toLowerCase()) &&
      (!selectedFabric || variant.fabric === selectedFabric) &&
      (selectedStitch === null || variant.isStitched === selectedStitch)
    );
    applyVariantSelection(strict ?? activeVariants.find((variant) => variant.size === size) ?? null);
  }

  function selectByFabric(fabric: string) {
    const strict = activeVariants.find((variant) =>
      variant.fabric === fabric &&
      (!selectedColor || variant.colorVariantId === selectedColor.id || variant.color.toLowerCase() === selectedColor.colorName.toLowerCase()) &&
      (!selectedSize || variant.size === selectedSize) &&
      (selectedStitch === null || variant.isStitched === selectedStitch)
    );
    applyVariantSelection(strict ?? activeVariants.find((variant) => variant.fabric === fabric) ?? null);
  }

  function selectByStitch(isStitched: boolean) {
    const strict = activeVariants.find((variant) =>
      variant.isStitched === isStitched &&
      (!selectedColor || variant.colorVariantId === selectedColor.id || variant.color.toLowerCase() === selectedColor.colorName.toLowerCase()) &&
      (!selectedSize || variant.size === selectedSize) &&
      (!selectedFabric || variant.fabric === selectedFabric)
    );
    applyVariantSelection(strict ?? activeVariants.find((variant) => variant.isStitched === isStitched) ?? null);
  }

  function reviewErrorMessage(loadError: unknown): string {
    if (loadError instanceof ApiRequestError) {
      const data = loadError.data;
      if (data && typeof data === "object") {
        if ("detail" in data && typeof data.detail === "string") return data.detail;
        const firstKey = Object.keys(data)[0];
        const value = (data as Record<string, unknown>)[firstKey];
        if (Array.isArray(value) && typeof value[0] === "string") return value[0];
        if (typeof value === "string") return value;
      }
      return loadError.message;
    }
    return "Unable to submit review. Please try again.";
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (!uiProduct) return;
    setSubmittingReview(true);
    setReviewError("");
    setReviewMessage("");
    try {
      const created = await createReview({
        product: uiProduct.id,
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
    } catch (loadError) {
      setReviewError(reviewErrorMessage(loadError));
    } finally {
      setSubmittingReview(false);
    }
  }

  function handleAddToCart() {
    if (!uiProduct || !resolvedVariant) return;
    addToCart(uiProduct, resolvedVariant, selectedColor, 1);
    setAddedToCart(true);
    window.setTimeout(() => setAddedToCart(false), 2000);
  }

  function prevImage() {
    setActiveImageIdx((index) => (index === 0 ? galleryImages.length - 1 : index - 1));
  }

  function nextImage() {
    setActiveImageIdx((index) => (index === galleryImages.length - 1 ? 0 : index + 1));
  }

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !uiProduct) {
    return (
      <main className="py-20 px-4 text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4" style={POPPINS}>Unable to load product</h1>
        <p className="text-muted-foreground mb-8">{error || "This product could not be loaded right now."}</p>
        <Link to={ROUTES.shop} className="text-[11px] tracking-[0.15em] uppercase font-bold underline">
          Back to shop
        </Link>
      </main>
    );
  }

  const displayPrice = resolvedVariant?.price ?? uiProduct.price;
  const displayOrig = resolvedVariant?.salePrice ? resolvedVariant.regularPrice : uiProduct.orig;
  const displaySku = resolvedVariant?.sku ?? "";
  const canSlide = galleryImages.length > 1;

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
          <div className="flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-muted">
              {galleryImages[0] ? (
                <img
                  src={galleryImages[activeImageIdx] || galleryImages[0]}
                  alt={resolvedVariant ? `${uiProduct.name} ${resolvedVariant.color}` : uiProduct.name}
                  className="w-full h-full object-cover object-center transition-opacity duration-300"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No image</div>
              )}
              {canSlide && (
                <>
                  <button type="button" onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-md hover:bg-white transition-colors" aria-label="Previous image">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-md hover:bg-white transition-colors" aria-label="Next image">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {galleryImages.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveImageIdx(index)}
                        className="h-1.5 rounded-full transition-all duration-200"
                        style={{
                          width: index === activeImageIdx ? "1.5rem" : "0.375rem",
                          background: index === activeImageIdx ? CRIMSON : "rgba(255,255,255,0.7)",
                        }}
                        aria-label={`Image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {galleryImages.map((thumb, index) => (
                  <button key={index} type="button" onClick={() => setActiveImageIdx(index)} className="flex-shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-colors" style={{ borderColor: index === activeImageIdx ? CRIMSON : "transparent" }}>
                    <img src={thumb} alt={`Thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 flex flex-col">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">{uiProduct.cat}</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight" style={POPPINS}>{uiProduct.name}</h1>

            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="text-xl font-bold" style={MONO}>{displayPrice}</span>
              {displayOrig && <span className="text-muted-foreground line-through" style={MONO}>{displayOrig}</span>}
              {uiProduct.hasDiscount && (
                <span className="text-[9px] tracking-[0.15em] uppercase font-bold px-2.5 py-1 rounded-full text-white" style={{ background: CRIMSON }}>
                  {Math.round(uiProduct.discountPercent)}% OFF
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mb-5 text-xs text-muted-foreground">
              {displaySku && <span>SKU: <strong className="text-foreground">{displaySku}</strong></span>}
              <span className={isOutOfStock ? "text-red-500 font-bold" : "font-semibold"}>
                {isOutOfStock ? "Out of stock" : `In stock: ${visibleStock}`}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="w-4 h-4" style={{ fill: index < Math.floor(averageRating) ? GOLD : "var(--muted)", color: index < Math.floor(averageRating) ? GOLD : "var(--muted)" }} />
              ))}
              <span className="text-sm text-muted-foreground">{averageRating ? averageRating.toFixed(1) : "0.0"} ({reviewsCount} reviews)</span>
            </div>

            {uiProduct.colorVariants.length > 0 && (
              <div className="mb-5 space-y-2">
                <p className="text-[10px] tracking-[0.25em] uppercase font-semibold text-muted-foreground">
                  Color{selectedColor ? `: ${selectedColor.colorName}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {uiProduct.colorVariants.map((variant) => {
                    const isSelected = selectedColor?.id === variant.id;
                    return (
                      <button key={variant.id} type="button" onClick={() => selectByColor(variant)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition ${isSelected ? "border-foreground bg-secondary" : "border-border hover:bg-secondary"}`}>
                        <span className="h-5 w-5 rounded-full border border-black/10 shadow-sm" style={{ background: variant.colorHex || "linear-gradient(135deg,#f4efe5,#c9a060)" }} />
                        {variant.colorName}
                        <span className="text-muted-foreground">({variant.stock})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="mb-5 space-y-2">
                <p className="text-[10px] tracking-[0.25em] uppercase font-semibold text-muted-foreground">Size{selectedSize ? `: ${selectedSize}` : ""}</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button key={size} type="button" onClick={() => selectBySize(size)} className={`rounded-lg border px-4 py-2 text-xs font-bold transition ${selectedSize === size ? "border-foreground bg-secondary" : "border-border hover:bg-secondary"}`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fabrics.length > 0 && (
              <div className="mb-5 space-y-2">
                <p className="text-[10px] tracking-[0.25em] uppercase font-semibold text-muted-foreground">Fabric{selectedFabric ? `: ${selectedFabric}` : ""}</p>
                <div className="flex flex-wrap gap-2">
                  {fabrics.map((fabric) => (
                    <button key={fabric} type="button" onClick={() => selectByFabric(fabric)} className={`rounded-lg border px-4 py-2 text-xs font-bold transition ${selectedFabric === fabric ? "border-foreground bg-secondary" : "border-border hover:bg-secondary"}`}>
                      {fabric}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasStitchedOption && (
              <div className="mb-5 space-y-2">
                <p className="text-[10px] tracking-[0.25em] uppercase font-semibold text-muted-foreground">
                  Stitching{selectedStitch !== null ? `: ${selectedStitch ? "Stitched" : "Unstitched"}` : ""}
                </p>
                <div className="flex gap-2">
                  {[true, false].map((value) => (
                    <button key={String(value)} type="button" onClick={() => selectByStitch(value)} className={`rounded-lg border px-4 py-2 text-xs font-bold transition ${selectedStitch === value ? "border-foreground bg-secondary" : "border-border hover:bg-secondary"}`}>
                      {value ? "Stitched" : "Unstitched"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-4">
              <button type="button" disabled={isOutOfStock || !resolvedVariant} onClick={handleAddToCart} className="flex-1 flex items-center justify-center gap-2 text-white py-4 rounded-full text-[11px] tracking-[0.15em] uppercase font-bold disabled:opacity-50 transition-all" style={{ background: addedToCart ? "#15803d" : CRIMSON }}>
                <ShoppingBag className="w-4 h-4" />
                {addedToCart ? "Added!" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
              <button type="button" onClick={() => toggleWishlist(uiProduct.id)} className="flex items-center justify-center gap-2 border border-border py-4 px-6 rounded-full text-[11px] tracking-[0.15em] uppercase font-bold hover:bg-secondary transition-colors">
                <Heart style={{ fill: wished ? CRIMSON : "none", color: wished ? CRIMSON : "currentColor" }} className="w-4 h-4" />
                Wishlist
              </button>
            </div>

            {!resolvedVariant && (
              <p className="mt-3 text-xs text-muted-foreground">No matching variant is available for this selection.</p>
            )}
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
              {related.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
