import * as React from "react";
import {
  Cart3,
  ChatDots,
  Check2,
  ChevronDown,
  ChevronRight,
  CodeSlash,
  StarFill,
  XLg,
} from "react-bootstrap-icons";
import type { Product } from "@/types/api";
import { useT } from "@/lib/i18n";
import { isAlwaysFree, kindBehavior } from "@/lib/productKinds";
import { cn, countLines, formatBytes, formatListingPrice } from "@/lib/utils";
import { includedItems, faqItems } from "@/screens/ProductPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/CodeBlock";
import { ProductCover } from "@/components/ProductCover";
import { AsyncImage } from "@/components/AsyncImage";
import { Lightbox } from "@/components/Lightbox";
import { Avatar } from "@/components/Avatar";

/** A read-only, full-fidelity render of the product page — exactly how a buyer
 * sees it. Used live in the editor and by moderators reviewing a submission.
 * Interactive bits (buy, plan select, screenshot lightbox) work for inspection,
 * but nothing performs a real action. */
export function ProductPreview({ product }: { product: Product }) {
  const t = useT();
  const [planIndex, setPlanIndex] = React.useState(0);
  const [lightbox, setLightbox] = React.useState<number | null>(null);

  const hasPlans = !!product.plans && product.plans.length > 0;
  const selectedPlan =
    hasPlans && product.plans ? product.plans[Math.min(planIndex, product.plans.length - 1)] : null;
  const buyPriceLabel = selectedPlan
    ? formatListingPrice({ ...product, priceCents: selectedPlan.priceCents, plans: undefined })
    : formatListingPrice(product);
  const isCode = kindBehavior(product.kind) === "code" && !!product.codeContent;
  const free = isAlwaysFree(product.kind) || (product.priceCents === 0 && !hasPlans);

  const actionLabel =
    product.kind === "subscription"
      ? `${t("product.subscribe")} · ${buyPriceLabel}`
      : free
        ? t("product.get")
        : `${t("product.buy")} ${buyPriceLabel}`;
  const ActionIcon = product.kind === "code" || product.kind === "free_code" ? CodeSlash : Cart3;

  return (
    <div>
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
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <span className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {t(`kindLabel.${product.kind}`)}
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {product.name || t("preview.untitled")}
          </h1>
          {product.tagline && (
            <p className="mt-1.5 max-w-2xl text-sm text-white/85 sm:text-base">{product.tagline}</p>
          )}
          <p className="mt-1 text-xs text-white/60">
            {product.publisher}
            {product.version && product.version !== "—" ? ` · v${product.version}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* main content */}
        <div className="min-w-0 space-y-8">
          {product.description && (
            <section>
              <h2 className="mb-2 text-lg font-bold tracking-tight">{t("product.aboutTitle")}</h2>
              <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                {product.description}
              </p>
            </section>
          )}

          {isCode && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-lg font-bold tracking-tight">
                <CodeSlash className="size-5 text-primary" /> {t("product.codePreview")}
              </h2>
              <CodeBlock
                code={product.codeContent as string}
                language={product.codeLanguage}
                maxPreviewLines={14}
              />
            </section>
          )}

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
        <aside className="lg:sticky lg:top-6 lg:self-start">
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

            {hasPlans && (
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
                      <span className="block truncate text-sm font-medium">{pl.name || `#${i + 1}`}</span>
                      {pl.description && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {pl.description}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      {formatListingPrice({ ...product, priceCents: pl.priceCents, plans: undefined })}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <Button className="mt-4 w-full justify-center" disabled>
              <ActionIcon className="size-4" /> {actionLabel}
            </Button>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <Fact label={t("product.dType")} value={t(`kindLabel.${product.kind}`)} />
              {product.kind === "subscription" && (
                <Fact label={t("product.dBilling")} value={product.billingPeriod ?? "monthly"} />
              )}
              {product.deliveryType && (
                <Fact label={t("product.dDelivery")} value={t(`delivery.${product.deliveryType}`)} />
              )}
              {product.codeLanguage && <Fact label={t("product.dLanguage")} value={product.codeLanguage} />}
              {product.codeContent && (
                <Fact label={t("product.dLines")} value={String(countLines(product.codeContent))} />
              )}
              {product.version && product.version !== "—" && (
                <Fact label={t("product.dVersion")} value={product.version} />
              )}
              {product.sizeBytes > 0 && <Fact label={t("product.dSize")} value={formatBytes(product.sizeBytes)} />}
              <Fact label={t("product.dUpdated")} value={product.updatedAt} />
              <Fact label={t("product.dCategory")} value={t(`category.${product.category}`)} />
            </dl>
          </div>

          {/* seller card */}
          <div className="mt-3 rounded-lg border border-border bg-card p-3">
            <div className="flex w-full items-center gap-3 rounded-md p-1 text-left">
              <Avatar name={product.publisher} className="size-10 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{t("product.seller")}</div>
                <div className="truncate font-medium">{product.publisher}</div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <Button variant="outline" className="mt-2 w-full" disabled>
              <ChatDots className="size-4" /> {t("product.messageSeller")}
            </Button>
          </div>
        </aside>
      </div>

      {lightbox !== null && product.screenshots.length > 0 && (
        <Lightbox images={product.screenshots} index={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

/** A full-screen overlay showing the product preview, for a true full-page look. */
export function PreviewOverlay({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useT();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm animate-in fade-in">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <span className="text-sm font-medium">{t("preview.title")}</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <XLg className="size-4" /> {t("common.close")}
        </Button>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <ProductPreview product={product} />
      </div>
    </div>
  );
}
