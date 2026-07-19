import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRepeat,
  Cart3,
  ChatDots,
  Check2,
  ChevronDown,
  ChevronRight,
  CodeSlash,
  Download,
  KeyFill,
  StarFill,
} from "react-bootstrap-icons";
import type { DigitalDelivery, DownloadBundle, Product, Subscription } from "@/types/api";
import {
  downloadItem,
  getDelivery,
  getProduct,
  getProducts,
  getSubscriptions,
  purchaseProduct,
  startConversation,
  subscribeProduct,
} from "@/lib/api";
import { useApp } from "@/store/app-context";
import { useT, type TFunc } from "@/lib/i18n";
import { isAlwaysFree, isStockKind, kindBehavior } from "@/lib/productKinds";
import { pushRecent } from "@/lib/recentlyViewed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reviews } from "@/components/Reviews";
import { DeliveryBox } from "@/components/DeliveryBox";
import { CodeBlock } from "@/components/CodeBlock";
import { ProductCover } from "@/components/ProductCover";
import { AsyncImage } from "@/components/AsyncImage";
import { ProductCard } from "@/components/ProductCard";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Lightbox } from "@/components/Lightbox";
import { Avatar } from "@/components/Avatar";
import { CUT } from "@/components/brutalist";
import { ProjectViewer } from "@/components/ProjectViewer";
import { cn, countLines, formatBytes, formatListingPrice } from "@/lib/utils";

type DlState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; bundle: DownloadBundle }
  | { kind: "error"; message: string };

export function ProductPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
  const t = useT();
  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [all, setAll] = React.useState<Product[]>([]);

  const [dl, setDl] = React.useState<DlState>({ kind: "idle" });
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [subscription, setSubscription] = React.useState<Subscription | null>(null);
  const [delivery, setDelivery] = React.useState<DigitalDelivery | null>(null);
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [planIndex, setPlanIndex] = React.useState(0);
  const [projectViewerBundle, setProjectViewerBundle] = React.useState<DownloadBundle | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setDelivery(null);
    setDl({ kind: "idle" });
    getProduct(id)
      .then(async (p) => {
        if (!mounted) return;
        setProduct(p);
        pushRecent(p);
        if (p.kind === "subscription") {
          const subs = await getSubscriptions().catch(() => []);
          if (mounted) setSubscription(subs.find((s) => s.product.id === p.id) ?? null);
        }
      })
      .catch((e) => mounted && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  React.useEffect(() => {
    getProducts().then(setAll).catch(() => {});
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const hasPlans = !!product?.plans && product.plans.length > 0;
  const selectedPlanIndex = hasPlans ? planIndex : undefined;

  const handleBuy = () =>
    run(async () => {
      if (product) setProduct(await purchaseProduct(product.id, selectedPlanIndex));
    });

  const handleSubscribe = () =>
    run(async () => {
      if (!product) return;
      const sub = await subscribeProduct(product.id, selectedPlanIndex);
      setSubscription(sub);
      setProduct({ ...product, owned: true });
    });

  const handleReveal = () =>
    run(async () => {
      if (product) setDelivery(await getDelivery(product.id));
    });

  const handleDownload = async () => {
    if (!product) return;
    setDl({ kind: "working" });
    try {
      const bundle = await downloadItem(product.id);
      setDl({ kind: "done", bundle });
    } catch (e) {
      setDl({ kind: "error", message: e instanceof Error ? e.message : "Download failed" });
    }
  };

  const handleContact = async () => {
    if (!product) return;
    const conv = await startConversation(product.sellerId, product.id);
    navigate(`/messages/${conv.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("common.loading")}
      </div>
    );
  }
  if (error || !product) {
    return <div className="p-8 text-center text-destructive">{error ?? t("product.notFound")}</div>;
  }

  const selectedPlan =
    hasPlans && product.plans ? product.plans[Math.min(planIndex, product.plans.length - 1)] : null;
  const buyPriceLabel = selectedPlan
    ? formatListingPrice({ ...product, priceCents: selectedPlan.priceCents, plans: undefined })
    : formatListingPrice(product);

  const isCode = kindBehavior(product.kind) === "code" && !!product.codeContent;
  const related = all
    .filter((p) => p.id !== product.id && (p.category === product.category || p.sellerId === product.sellerId))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-8 py-6">
      <Button variant="ghost" size="sm" className="mb-5 -ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" /> {t("common.back")}
      </Button>

      {/* hero cover */}
      <div className="relative mb-6 overflow-hidden rounded-xl">
        {product.bannerImage || product.coverImage || product.screenshots.length > 0 ? (
          <AsyncImage
            src={product.bannerImage || product.coverImage || product.screenshots[0]}
            className="h-48 w-full object-cover sm:h-64"
            fallback={
              <ProductCover
                product={product}
                align="right"
                circle={false}
                className="h-48 w-full sm:h-64"
                iconClassName="size-48 sm:size-64"
              />
            }
          />
        ) : (
          <ProductCover
            product={product}
            align="right"
            circle={false}
            className="h-48 w-full sm:h-64"
            iconClassName="size-48 sm:size-64"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <FavoriteButton
          product={product}
          className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
        />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <span className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {t(`kindLabel.${product.kind}`)}
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-white/85 sm:text-base">{product.tagline}</p>
          <p className="mt-1 text-xs text-white/60">
            {product.publisher}
            {product.version !== "—" ? ` · v${product.version}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* main content */}
        <div className="min-w-0 space-y-8">
          {/* description */}
          <section>
            <h2 className="mb-2 text-lg font-bold tracking-tight">{t("product.aboutTitle")}</h2>
            <p className="whitespace-pre-line leading-relaxed text-foreground/90">{product.description}</p>
          </section>

          {/* code preview */}
          {isCode && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-lg font-bold tracking-tight">
                <CodeSlash className="size-5 text-primary" /> {t("product.codePreview")}
              </h2>
              <CodeBlock
                code={product.codeContent as string}
                language={product.codeLanguage}
                maxPreviewLines={product.owned ? undefined : 14}
              />
            </section>
          )}

          {/* screenshots */}
          {product.screenshots.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold tracking-tight">{t("product.screenshotsTitle")}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {product.screenshots.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox(i)}
                    className="group relative overflow-hidden rounded-lg border border-border"
                  >
                    <AsyncImage
                      src={s}
                      className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* what's included */}
          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">{t("product.includedTitle")}</h2>
            <ul className="space-y-2 text-sm">
              {includedItems(product, t).map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-foreground/90">{line}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* faq */}
          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">{t("product.faqTitle")}</h2>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {(product.faq && product.faq.length > 0
                ? product.faq.map((f) => [f.q, f.a] as [string, string])
                : faqItems(t)
              ).map(([q, a]) => (
                <details key={q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium hover:bg-accent/40">
                    {q}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-4 pb-4 text-sm text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="muted">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* sticky purchase box + seller */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-3xl font-bold text-primary">{buyPriceLabel}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {product.ratingCount > 0 ? (
                <span className="flex items-center gap-1">
                  <StarFill className="size-3.5 text-amber-400" />
                  {product.rating.toFixed(1)} ({product.ratingCount})
                </span>
              ) : (
                <span>{t("catalog.new")}</span>
              )}
              {product.sizeBytes > 0 && <span>· {formatBytes(product.sizeBytes)}</span>}
            </div>

            {/* pricing plans */}
            {hasPlans && !product.owned && !subscription && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">{t("product.choosePlan")}</div>
                {product.plans!.map((pl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPlanIndex(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                      i === planIndex
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-accent/40",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{pl.name}</span>
                      {pl.description && (
                        <span className="block truncate text-xs text-muted-foreground">{pl.description}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      {formatListingPrice({ ...product, priceCents: pl.priceCents, plans: undefined })}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-2 [&_button]:w-full [&_button]:justify-center">
              <PrimaryAction
                product={product}
                busy={busy}
                dl={dl}
                subscription={subscription}
                hasDelivery={!!delivery}
                priceLabel={buyPriceLabel}
                t={t}
                onBuy={handleBuy}
                onSubscribe={handleSubscribe}
                onReveal={handleReveal}
                onDownload={handleDownload}
                onContact={handleContact}
                onManage={() => navigate("/library")}
              />
            </div>

            {actionError && <p className="mt-3 text-sm text-destructive">{actionError}</p>}
            {dl.kind === "error" && <p className="mt-3 text-sm text-destructive">{dl.message}</p>}
            {dl.kind === "done" && (
              <div className="mt-3 flex items-center justify-between rounded-md border border-lime/30 bg-lime/10 px-3 py-2">
                <p className="flex items-center gap-1.5 text-sm text-lime">
                  <Check2 className="size-4" />{" "}
                  {t("product.decrypted", { size: formatBytes(dl.bundle.sizeBytes), file: dl.bundle.filename })}
                </p>
                {dl.bundle.filename.endsWith(".zip") && (
                  <Button size="sm" variant="outline" onClick={() => setProjectViewerBundle(dl.bundle)}>
                    <CodeSlash className="mr-1 size-4" /> View Code
                  </Button>
                )}
              </div>
            )}

            {delivery && <DeliveryBox delivery={delivery} className="mt-3" onContact={handleContact} />}

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <Fact label={t("product.dType")} value={t(`kindLabel.${product.kind}`)} />
              {product.kind === "subscription" && (
                <Fact label={t("product.dBilling")} value={product.billingPeriod ?? "monthly"} />
              )}
              {product.deliveryType && (
                <Fact label={t("product.dDelivery")} value={t(`delivery.${product.deliveryType}`)} />
              )}
              {isStockKind(product.kind) && (
                <Fact
                  label={t("product.dStock")}
                  value={
                    (product.stockCount ?? 0) > 0
                      ? t("product.inStock", { n: product.stockCount ?? 0 })
                      : t("product.soldOut")
                  }
                />
              )}
              {product.codeLanguage && <Fact label={t("product.dLanguage")} value={product.codeLanguage} />}
              {product.codeContent && (
                <Fact label={t("product.dLines")} value={String(countLines(product.codeContent))} />
              )}
              {product.version !== "—" && <Fact label={t("product.dVersion")} value={product.version} />}
              {product.sizeBytes > 0 && <Fact label={t("product.dSize")} value={formatBytes(product.sizeBytes)} />}
              <Fact label={t("product.dUpdated")} value={product.updatedAt} />
              <Fact label={t("product.dCategory")} value={t(`category.${product.category}`)} />
            </dl>
          </div>

          {/* seller card */}
          <div className="mt-3 rounded-lg border border-border bg-card p-3">
            <button
              type="button"
              onClick={() => navigate(`/sellers/${product.sellerId}`)}
              className="flex w-full items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-accent/40"
            >
              <Avatar name={product.publisher} className="size-10 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{t("product.seller")}</div>
                <div className="truncate font-medium">{product.publisher}</div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
            {user && product.sellerId !== user.id && (
              <Button variant="outline" className="mt-2 w-full" onClick={handleContact}>
                <ChatDots className="size-4" /> {t("product.messageSeller")}
              </Button>
            )}
          </div>
        </aside>
      </div>

      {lightbox !== null && product.screenshots.length > 0 && (
        <Lightbox images={product.screenshots} index={lightbox} onClose={() => setLightbox(null)} />
      )}

      <ProjectViewer 
        bundle={projectViewerBundle} 
        open={!!projectViewerBundle} 
        onOpenChange={(o) => !o && setProjectViewerBundle(null)} 
      />

      {/* reviews — full-width section */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold tracking-tight">
          {t("product.reviewsTitle")}{" "}
          <span className="text-muted-foreground">({product.ratingCount})</span>
        </h2>
        <Reviews
          productId={product.id}
          canReview={product.owned}
          onChanged={() => getProduct(product.id).then(setProduct).catch(() => {})}
        />
      </section>

      {/* similar / more */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold tracking-tight">{t("product.similar")}</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function includedItems(product: Product, t: TFunc): string[] {
  const items: string[] = [];
  const d = product.deliveryType ?? "file";
  items.push(t("product.incDelivery", { what: t(`delivery.${d}`) }));
  if (product.kind === "subscription") {
    items.push(t("product.incSubscription", { period: t(product.billingPeriod === "yearly" ? "editor.yearly" : "editor.monthly") }));
  } else {
    items.push(t("product.incLifetime"));
  }
  if (product.version !== "—") items.push(t("product.incVersion", { version: product.version }));
  items.push(t("product.incSupport"));
  return items;
}

export function faqItems(t: TFunc): Array<[string, string]> {
  return [
    [t("product.faqDeliveryQ"), t("product.faqDeliveryA")],
    [t("product.faqPaymentQ"), t("product.faqPaymentA")],
    [t("product.faqRefundQ"), t("product.faqRefundA")],
    [t("product.faqPrivacyQ"), t("product.faqPrivacyA")],
  ];
}

function PrimaryAction({
  product,
  busy,
  dl,
  subscription,
  hasDelivery,
  priceLabel,
  t,
  onBuy,
  onSubscribe,
  onReveal,
  onDownload,
  onContact,
  onManage,
}: {
  product: Product;
  busy: boolean;
  dl: DlState;
  subscription: Subscription | null;
  hasDelivery: boolean;
  priceLabel: string;
  t: TFunc;
  onBuy: () => void;
  onSubscribe: () => void;
  onReveal: () => void;
  onDownload: () => void;
  onContact: () => void;
  onManage: () => void;
}) {
  const spinner = <ArrowRepeat className="size-4 animate-spin" />;
  const delivery = product.deliveryType ?? "file";

  // ---- Subscriptions: subscribe, then fulfil by code reveal or seller contact.
  if (product.kind === "subscription") {
    if (subscription) {
      return (
        <div className="space-y-2">
          <span className="flex items-center justify-center gap-1.5 text-sm text-primary">
            <Check2 className="size-4" />
            {subscription.autoRenew ? t("product.renews") : t("product.ends")}{" "}
            {subscription.currentPeriodEnd}
          </span>
          {delivery === "contact" ? (
            <Button variant="outline" onClick={onContact}>
              <ChatDots className="size-4" /> {t("delivery.contactSeller")}
            </Button>
          ) : (
            <Button variant="outline" onClick={onReveal} disabled={busy || hasDelivery}>
              {busy ? spinner : <KeyFill className="size-4" />}
              {hasDelivery ? t("product.revealedBelow") : t("product.getAccess")}
            </Button>
          )}
          <Button variant="ghost" onClick={onManage}>
            {t("product.manage")}
          </Button>
        </div>
      );
    }
    return (
      <Button onClick={onSubscribe} disabled={busy} className={CUT}>
        {busy ? spinner : <ArrowRepeat className="size-4" />}
        {t("product.subscribe")} · {priceLabel}
      </Button>
    );
  }

  // ---- Stock listings (accounts): buy pulls one unit; allow repeat buys while
  // stock lasts. When sold out, owners can still reveal what they bought.
  if (isStockKind(product.kind)) {
    const soldOut = (product.stockCount ?? 0) <= 0;
    if (!soldOut) {
      return (
        <Button onClick={onBuy} disabled={busy} className={CUT}>
          {busy ? spinner : <Cart3 className="size-4" />}
          {t("product.buy")} {priceLabel}
        </Button>
      );
    }
    if (!product.owned) {
      return (
        <Button disabled className={CUT}>
          {t("product.soldOut")}
        </Button>
      );
    }
    // sold out but owned → fall through to the reveal logic below.
  }

  // ---- Not owned yet: acquire (free for free_code / zero price, else buy).
  if (!product.owned) {
    const hasPlans = !!product.plans && product.plans.length > 0;
    const free = isAlwaysFree(product.kind) || (product.priceCents === 0 && !hasPlans);
    const Icon = product.kind === "code" || product.kind === "free_code" ? CodeSlash : Cart3;
    return (
      <Button onClick={onBuy} disabled={busy} className={CUT}>
        {busy ? spinner : <Icon className="size-4" />}
        {free ? t("product.get") : t("product.buy")}
        {free ? "" : ` ${priceLabel}`}
      </Button>
    );
  }

  // ---- Owned: fulfil by delivery method.
  if (delivery === "file") {
    if (dl.kind === "working") {
      return (
        <Button disabled className={CUT}>
          {spinner} {t("product.fetching")}
        </Button>
      );
    }
    return (
      <Button onClick={onDownload} className={CUT}>
        <Download className="size-4" /> {t("product.download")}
      </Button>
    );
  }

  if (delivery === "contact") {
    return (
      <Button onClick={onContact} className={CUT}>
        <ChatDots className="size-4" /> {t("delivery.contactSeller")}
      </Button>
    );
  }

  // code / license_key / account / link → reveal
  const RevealIcon = delivery === "code" ? CodeSlash : KeyFill;
  return (
    <Button onClick={onReveal} disabled={busy || hasDelivery} className={CUT}>
      {busy ? spinner : <RevealIcon className="size-4" />}
      {hasDelivery
        ? t("product.revealedBelow")
        : delivery === "code"
          ? t("product.revealCode")
          : t("product.reveal")}
    </Button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  );
}
