import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRepeat, Check2, ChevronDown, ChevronLeft, ChevronRight, Grid, Heart, HeartFill, Search, SortDown, Tag } from "react-bootstrap-icons";
import type { Product, ProductKind } from "@/types/api";
import { getProducts } from "@/lib/api";
import { useT, type TFunc } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { ProductCover } from "@/components/ProductCover";
import { AsyncImage } from "@/components/AsyncImage";
import { Logo } from "@/components/Logo";
import { PRODUCT_KINDS } from "@/lib/productKinds";
import { FAVORITES_EVENT, getFavorites } from "@/lib/favorites";
import { Input } from "@/components/ui/input";
import { cn, formatListingPrice } from "@/lib/utils";
import { AsciiBackground } from "@/components/AsciiBackground";

const KINDS: (ProductKind | "all")[] = ["all", ...PRODUCT_KINDS];

type SortKey = "popular" | "new" | "rating" | "priceAsc" | "priceDesc";
const SORTS: SortKey[] = ["popular", "new", "rating", "priceAsc", "priceDesc"];

function sortProducts(list: Product[], key: SortKey): Product[] {
  const a = [...list];
  switch (key) {
    case "new":
      return a.sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
    case "rating":
      return a.sort((x, y) => y.rating - x.rating || y.ratingCount - x.ratingCount);
    case "priceAsc":
      return a.sort((x, y) => x.priceCents - y.priceCents);
    case "priceDesc":
      return a.sort((x, y) => y.priceCents - x.priceCents);
    case "popular":
    default:
      return a.sort((x, y) => y.ratingCount - x.ratingCount || y.rating - x.rating);
  }
}

export function Catalog() {
  const t = useT();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<ProductKind | "all">("all");
  const [sort, setSort] = React.useState<SortKey>("popular");
  const [freeOnly, setFreeOnly] = React.useState(false);
  const [favOnly, setFavOnly] = React.useState(false);
  const [favIds, setFavIds] = React.useState<Set<string>>(() => new Set(getFavorites().map((f) => f.id)));

  React.useEffect(() => {
    const refresh = () => setFavIds(new Set(getFavorites().map((f) => f.id)));
    window.addEventListener(FAVORITES_EVENT, refresh);
    return () => window.removeEventListener(FAVORITES_EVENT, refresh);
  }, []);

  // Track scroll so the logo can bounce (and act as a "back to top" button).
  const topRef = React.useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProducts()
      .then((p) => mounted && setProducts(p))
      .catch((e) => mounted && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const browsing = query.trim() !== "" || kind !== "all" || freeOnly || favOnly;

  const filtered = products.filter((p) => {
    const matchesKind = kind === "all" || p.kind === kind;
    const matchesFree = !freeOnly || p.priceCents === 0 || p.kind === "free_code";
    const matchesFav = !favOnly || favIds.has(p.id);
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchesKind && matchesFree && matchesFav && matchesQuery;
  });

  // Offers shown in the hero carousel. Random for now; later curated in admin.
  const offers = React.useMemo(() => {
    const a = [...products];
    for (let j = a.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [a[j], a[k]] = [a[k], a[j]];
    }
    return a.slice(0, 5);
  }, [products]);

  return (
    <div className="relative min-h-full w-full">
      <AsciiBackground className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,transparent_10%,black_80%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1760px] px-10 py-8 animate-in fade-in duration-700 zoom-in-95">
        {/* scroll sentinel for "back to top" + bounce trigger */}
        <div ref={topRef} aria-hidden className="h-0" />

        {/* Floating Glass Header */}
        <div className="sticky top-4 z-40 mx-auto mb-10 flex w-full items-center gap-4 rounded-full border border-white/10 bg-black/40 px-8 py-3 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all">
          <button
            type="button"
            onClick={scrollToTop}
            title={t("catalog.toTop")}
            className="flex shrink-0 items-center gap-2 pr-2 transition-opacity hover:opacity-80 group"
          >
            <Logo className={cn("size-8 drop-shadow-[0_0_10px_rgba(var(--primary),0.5)] group-hover:drop-shadow-[0_0_15px_rgba(var(--primary),0.8)]", scrolled && "fv-logo-bounce")} />
            <span className="hidden text-xl font-extrabold tracking-tight sm:inline drop-shadow-md">Fovea</span>
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder={t("catalog.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-full border border-white/5 bg-black/30 pl-11 text-base font-medium text-foreground shadow-inner transition-all hover:bg-black/50 focus-visible:ring-primary/50"
            />
          </div>
          <SortMenu value={sort} onChange={setSort} t={t} />
          <CatalogMenu value={kind} onChange={setKind} t={t} />
          <button
            onClick={() => setFreeOnly((v) => !v)}
            title={t("storePanel.freeOnly")}
            aria-label={t("storePanel.freeOnly")}
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full border transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]",
              freeOnly
                ? "border-primary/40 bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.4)]"
                : "border-white/10 bg-black/40 text-foreground hover:bg-black/60",
            )}
          >
            <Tag className="size-5" />
          </button>
          <button
            onClick={() => setFavOnly((v) => !v)}
            title={t("storePanel.favorites")}
            aria-label={t("storePanel.favorites")}
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full border transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]",
              favOnly
                ? "border-primary/40 bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.4)]"
                : "border-white/10 bg-black/40 text-foreground hover:bg-black/60",
            )}
          >
            {favOnly ? <HeartFill className="size-5 drop-shadow-md" /> : <Heart className="size-5" />}
          </button>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("catalog.loading")}
        </div>
      ) : error ? (
        <div className="py-24 text-center text-destructive">{error}</div>
      ) : (
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-10 min-w-0">
            {!browsing && (
              <>
                {offers.length > 0 && <OffersCarousel offers={offers} t={t} />}

                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-primary/20 p-10 backdrop-blur-xl shadow-[0_0_50px_rgba(var(--primary),0.15)] group">
                  {/* Glowing background blob */}
                  <div className="absolute right-10 top-10 size-64 rounded-full bg-primary/30 blur-[100px] pointer-events-none group-hover:bg-primary/40 transition-colors" />
                  
                  {/* scattered logo marks, like snow */}
                  <div aria-hidden className="pointer-events-none absolute inset-0">
                    <Logo fill="currentColor" className="absolute -right-3 -top-3 size-24 rotate-12 text-primary/20 drop-shadow-lg" />
                    <Logo fill="currentColor" className="absolute right-32 top-6 size-12 -rotate-12 text-primary/15 drop-shadow-lg" />
                    <Logo fill="currentColor" className="absolute -bottom-4 right-16 size-20 -rotate-6 text-primary/20 drop-shadow-lg" />
                    <Logo fill="currentColor" className="absolute right-1/3 -bottom-2 size-8 rotate-6 text-primary/10 drop-shadow-lg" />
                    <Logo fill="currentColor" className="absolute right-1/2 top-4 size-8 -rotate-12 text-primary/10 drop-shadow-lg" />
                    <Logo fill="currentColor" className="absolute right-[58%] bottom-4 size-14 rotate-12 text-primary/15 drop-shadow-lg" />
                  </div>
                  <div className="relative z-10 mr-auto max-w-2xl text-left">
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-primary drop-shadow-md">
                      {t("catalog.sloganTitle")}
                    </h2>
                    <p className="mt-3 text-base font-medium text-primary/90 leading-relaxed max-w-xl">
                      {t("catalog.sloganSub")}
                    </p>
                  </div>
                </div>
              </>
            )}

            {filtered.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground">{t("catalog.empty")}</div>
            ) : (
              <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {sortProducts(filtered, sort).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </section>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

/** "Catalog" dropdown listing product kinds (programs, checkers, …). */
function CatalogMenu({
  value,
  onChange,
  t,
}: {
  value: ProductKind | "all";
  onChange: (k: ProductKind | "all") => void;
  t: TFunc;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = value === "all" ? t("catalog.catalog") : t(`kind.${value}`);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-12 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-5 text-sm font-bold transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-black/60",
          value !== "all" && "border-primary/40 bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]",
        )}
      >
        <Grid className="size-4" />
        {label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-all hover:bg-black/40",
                value === k ? "text-primary bg-primary/10" : "text-foreground/90",
              )}
            >
              {t(`kind.${k}`)}
              {value === k && <Check2 className="size-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sort selector for the product grids. */
function SortMenu({
  value,
  onChange,
  t,
}: {
  value: SortKey;
  onChange: (k: SortKey) => void;
  t: TFunc;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-5 text-sm font-bold transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-black/60 text-foreground"
      >
        <SortDown className="size-4" />
        <span className="hidden sm:inline">{t(`sort.${value}`)}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          {SORTS.map((k) => (
            <button
              key={k}
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-all hover:bg-black/40",
                value === k ? "text-primary bg-primary/10" : "text-foreground/90",
              )}
            >
              {t(`sort.${k}`)}
              {value === k && <Check2 className="size-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Auto-rotating hero carousel of featured offers. */
function OffersCarousel({ offers, t }: { offers: Product[]; t: TFunc }) {
  const [i, setI] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const n = offers.length;

  React.useEffect(() => {
    setI((p) => (p >= n ? 0 : p));
  }, [n]);

  React.useEffect(() => {
    if (n <= 1 || paused) return;
    const id = setInterval(() => setI((p) => (p + 1) % n), 5000);
    return () => clearInterval(id);
  }, [n, paused]);

  if (n === 0) return null;
  const go = (d: number) => setI((p) => (p + d + n) % n);

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${i * 100}%)` }}
      >
        {offers.map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.id}`}
            className="relative block h-56 w-full shrink-0 sm:h-72"
          >
            {p.bannerImage || p.coverImage ? (
              <AsyncImage
                src={p.bannerImage || p.coverImage}
                className="absolute inset-0 size-full object-cover"
                fallback={
                  <ProductCover
                    product={p}
                    align="right"
                    circle={false}
                    className="absolute inset-0 size-full"
                    iconClassName="size-56 sm:size-72"
                  />
                }
              />
            ) : (
              <ProductCover
                product={p}
                align="right"
                circle={false}
                className="absolute inset-0 size-full"
                iconClassName="size-56 sm:size-72"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-transparent" />
            <div className="relative flex h-full max-w-xl flex-col justify-center gap-2.5 p-8 sm:p-12">
              <span className="w-fit rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                {t("catalog.offer")}
              </span>
              <h3 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">{p.name}</h3>
              <p className="line-clamp-2 max-w-md text-sm text-white/80 sm:text-base">{p.tagline}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xl font-bold text-white sm:text-2xl">{formatListingPrice(p)}</span>
                <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
                  {t("catalog.view")}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-80 backdrop-blur transition hover:bg-black/60 hover:opacity-100"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-80 backdrop-blur transition hover:bg-black/60 hover:opacity-100"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {offers.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setI(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === i ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
