import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRepeat, ArrowsFullscreen, ExclamationTriangle, PlusLg, XLg } from "react-bootstrap-icons";
import type { DeliveryKind, Product, ProductCategory, ProductInput, ProductKind } from "@/types/api";
import { addInventory, clearInventory, createProduct, getProduct, inventorySummary, submitForReview, updateProduct } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useApp } from "@/store/app-context";
import { ProductPreview, PreviewOverlay } from "@/components/ProductPreview";
import {
  MAX_INLINE_CODE_LINES,
  PRODUCT_KINDS,
  defaultDeliveryForKind,
  deliveryOptionsForKind,
  isAlwaysFree,
  isStockKind,
  usesInlineCode,
} from "@/lib/productKinds";
import { AsyncImage } from "@/components/AsyncImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, countLines } from "@/lib/utils";

const CATEGORIES: ProductCategory[] = [
  "tools",
  "security",
  "development",
  "productivity",
  "media",
  "other",
];

const PERIODS = ["monthly", "yearly"] as const;
const MAX_SHOTS = 6;
const DELIVERY_KEY: Record<DeliveryKind, string> = {
  license_key: "editor.dkLicense",
  account: "editor.dkAccount",
  file: "editor.dkFile",
  link: "editor.dkLink",
  code: "editor.dkCode",
  contact: "editor.dkContact",
  stock: "editor.dkStock",
};

export function ProductEditor() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const t = useT();

  const [loading, setLoading] = React.useState(editing);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fullPreview, setFullPreview] = React.useState(false);

  const [form, setForm] = React.useState<ProductInput>({
    name: "",
    tagline: "",
    description: "",
    category: "tools",
    version: "1.0.0",
    priceCents: 0,
    tags: [],
    kind: "program",
    billingPeriod: null,
    deliveryType: "file",
    codeContent: "",
    codeLanguage: "",
    iconUrl: "",
    coverImage: "",
    bannerImage: "",
    screenshots: [],
    faq: [],
    plans: [],
  });
  const [priceDollars, setPriceDollars] = React.useState("0");
  const [tagsText, setTagsText] = React.useState("");

  React.useEffect(() => {
    if (!editing || !id) return;
    getProduct(id)
      .then((p) => {
        setForm({
          name: p.name,
          tagline: p.tagline,
          description: p.description,
          category: p.category,
          version: p.version,
          priceCents: p.priceCents,
          tags: p.tags,
          kind: p.kind,
          billingPeriod: p.billingPeriod ?? null,
          deliveryType: p.deliveryType ?? defaultDeliveryForKind(p.kind),
          codeContent: p.codeContent ?? "",
          codeLanguage: p.codeLanguage ?? "",
          // Use the seller's custom icon only; never preload the generated placeholder.
          iconUrl: p.iconImage ?? "",
          coverImage: p.coverImage ?? "",
          bannerImage: p.bannerImage ?? "",
          screenshots: p.screenshots ?? [],
          faq: p.faq ?? [],
          plans: p.plans ?? [],
        });
        setPriceDollars((p.priceCents / 100).toString());
        setTagsText(p.tags.join(", "));
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("editor.failSave")))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const patch = (p: Partial<ProductInput>) => setForm((f) => ({ ...f, ...p }));

  const addScreenshots = (files: FileList | null) => {
    if (!files) return;
    const slots = MAX_SHOTS - (form.screenshots?.length ?? 0);
    Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, slots)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () =>
          setForm((f) => ({ ...f, screenshots: [...(f.screenshots ?? []), String(reader.result)] }));
        reader.readAsDataURL(file);
      });
  };
  const removeScreenshot = (i: number) =>
    setForm((f) => ({ ...f, screenshots: (f.screenshots ?? []).filter((_, j) => j !== i) }));

  const setImage = (field: "iconUrl" | "coverImage" | "bannerImage", files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, [field]: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const addFaq = () =>
    setForm((f) => ({ ...f, faq: [...(f.faq ?? []), { q: "", a: "" }] }));
  const updateFaq = (i: number, field: "q" | "a", value: string) =>
    setForm((f) => ({ ...f, faq: (f.faq ?? []).map((it, j) => (j === i ? { ...it, [field]: value } : it)) }));
  const removeFaq = (i: number) =>
    setForm((f) => ({ ...f, faq: (f.faq ?? []).filter((_, j) => j !== i) }));

  const addPlan = () =>
    setForm((f) => ({ ...f, plans: [...(f.plans ?? []), { name: "", priceCents: 0, description: "" }] }));
  const updatePlan = (i: number, field: "name" | "priceCents" | "description", value: string | number) =>
    setForm((f) => ({
      ...f,
      plans: (f.plans ?? []).map((it, j) => (j === i ? { ...it, [field]: value } : it)),
    }));
  const removePlan = (i: number) =>
    setForm((f) => ({ ...f, plans: (f.plans ?? []).filter((_, j) => j !== i) }));

  // Switching kind resets delivery to that kind's default.
  const selectKind = (kind: ProductKind) =>
    patch({ kind, deliveryType: defaultDeliveryForKind(kind) });

  const deliveryOptions = deliveryOptionsForKind(form.kind);
  const inlineCode = usesInlineCode(form.kind, form.deliveryType);
  const free = isAlwaysFree(form.kind);
  const codeLines = countLines(form.codeContent ?? "");
  const codeTooLong = inlineCode && codeLines > MAX_INLINE_CODE_LINES;

  const buildInput = (): ProductInput => ({
    ...form,
    priceCents: free ? 0 : Math.max(0, Math.round(parseFloat(priceDollars || "0") * 100)),
    tags: tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    billingPeriod: form.kind === "subscription" ? form.billingPeriod ?? "monthly" : null,
    deliveryType: form.deliveryType ?? defaultDeliveryForKind(form.kind),
    codeContent: inlineCode ? (form.codeContent ?? "").trimEnd() : null,
    codeLanguage: inlineCode ? (form.codeLanguage || "").trim() || null : null,
    // Send the current value as-is: a data: URI (newly uploaded), a stored
    // filename (unchanged — server preserves it), or empty (cleared).
    iconUrl: form.iconUrl || undefined,
    coverImage: form.coverImage || null,
    bannerImage: form.bannerImage || null,
    faq: (form.faq ?? [])
      .map((it) => ({ q: it.q.trim(), a: it.a.trim() }))
      .filter((it) => it.q && it.a),
    plans: (form.plans ?? [])
      .map((it) => ({
        name: it.name.trim(),
        priceCents: Math.max(0, Math.round(it.priceCents)),
        description: (it.description ?? "").trim() || undefined,
      }))
      .filter((it) => it.name),
  });

  const canSave = Boolean(form.name.trim()) && !codeTooLong && !(inlineCode && !form.codeContent?.trim());

  const { user, reloadUser } = useApp();
  const previewProduct: Product = {
    id: id ?? "preview",
    slug: "preview",
    name: form.name,
    tagline: form.tagline,
    description: form.description,
    category: form.category,
    version: form.version,
    priceCents: free ? 0 : Math.max(0, Math.round(parseFloat(priceDollars || "0") * 100)),
    currency: "USD",
    iconUrl: form.iconUrl || "",
    iconImage: form.iconUrl || null,
    coverImage: form.coverImage || null,
    bannerImage: form.bannerImage || null,
    screenshots: form.screenshots ?? [],
    sizeBytes: 0,
    rating: 0,
    ratingCount: 0,
    publisher: user?.seller?.storeName || user?.displayName || "—",
    owned: false,
    tags: tagsText.split(",").map((s) => s.trim()).filter(Boolean),
    updatedAt: new Date().toISOString().slice(0, 10),
    status: "draft",
    sellerId: user?.id ?? "",
    rejectionReason: null,
    kind: form.kind,
    billingPeriod: form.kind === "subscription" ? form.billingPeriod ?? "monthly" : null,
    deliveryType: form.deliveryType ?? null,
    codeContent: form.codeContent ?? null,
    codeLanguage: form.codeLanguage ?? null,
    faq: (form.faq ?? []).filter((f) => f.q && f.a),
    plans: (form.plans ?? []).filter((p) => p.name),
  };

  const save = async (thenSubmit: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const input = buildInput();
      const saved = editing && id ? await updateProduct(id, input) : await createProduct(input);
      if (thenSubmit) await submitForReview(saved.id);
      // The first listing implicitly makes the account a seller — refresh so the
      // nav/store UI reflects it.
      if (!editing && !user?.isSeller) await reloadUser().catch(() => {});
      navigate("/sell");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editor.failSave"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-8 py-6">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" onClick={() => navigate("/sell")}>
        <ArrowLeft className="size-4" /> {t("editor.backToDashboard")}
      </Button>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">
            {editing ? t("editor.editListing") : t("editor.newListing")}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">{t("editor.hint")}</p>

          <div className="space-y-4">
        <Field label={t("editor.listingType")}>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_KINDS.map((k) => (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={form.kind === k ? "default" : "outline"}
                onClick={() => selectKind(k)}
              >
                {t(`kindLabel.${k}`)}
              </Button>
            ))}
          </div>
        </Field>

        {form.kind === "subscription" && (
          <Field label={t("editor.billingPeriod")}>
            <div className="flex gap-2">
              {PERIODS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={(form.billingPeriod ?? "monthly") === p ? "secondary" : "ghost"}
                  className={cn((form.billingPeriod ?? "monthly") === p && "ring-1 ring-border")}
                  onClick={() => patch({ billingPeriod: p })}
                >
                  {t(p === "yearly" ? "editor.yearly" : "editor.monthly")}
                </Button>
              ))}
            </div>
          </Field>
        )}

        <Field label={t("editor.delivery")}>
          <div className="flex flex-wrap gap-2">
            {deliveryOptions.map((d) => (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={form.deliveryType === d ? "secondary" : "ghost"}
                className={cn(form.deliveryType === d && "ring-1 ring-border")}
                onClick={() => patch({ deliveryType: d })}
              >
                {t(DELIVERY_KEY[d])}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t(`editor.deliveryHint.${form.deliveryType}`)}</p>
        </Field>

        {inlineCode && (
          <Field label={t("editor.codeSource")}>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("editor.codeLanguage")}</Label>
                <Input
                  value={form.codeLanguage ?? ""}
                  onChange={(e) => patch({ codeLanguage: e.target.value })}
                  placeholder="python"
                />
              </div>
              <span
                className={cn(
                  "pb-2 text-xs tabular-nums",
                  codeTooLong ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {codeLines} / {MAX_INLINE_CODE_LINES} {t("code.lines")}
              </span>
            </div>
            <Textarea
              className={cn(
                "mt-2 min-h-[200px] font-mono text-xs leading-relaxed",
                codeTooLong && "border-destructive focus-visible:ring-destructive",
              )}
              value={form.codeContent ?? ""}
              onChange={(e) => patch({ codeContent: e.target.value })}
              placeholder={t("editor.codePlaceholder")}
              spellCheck={false}
            />
            {codeTooLong && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <ExclamationTriangle className="size-3.5" />
                {t("editor.codeTooLong", { max: MAX_INLINE_CODE_LINES })}
              </p>
            )}
          </Field>
        )}

        {isStockKind(form.kind) && (
          <Field label={t("editor.stock")}>
            {id ? (
              <StockPanel productId={id} />
            ) : (
              <p className="text-xs text-muted-foreground">{t("editor.stockAfterSave")}</p>
            )}
          </Field>
        )}

        <Field label={t("editor.name")}>
          <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder={t("editor.namePlaceholder")} />
        </Field>
        <Field label={t("editor.tagline")}>
          <Input value={form.tagline} onChange={(e) => patch({ tagline: e.target.value })} placeholder={t("editor.taglinePlaceholder")} />
        </Field>

        <Field label={t("editor.category")}>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={form.category === c ? "secondary" : "ghost"}
                className={cn(form.category === c && "ring-1 ring-border")}
                onClick={() => patch({ category: c })}
              >
                {t(`category.${c}`)}
              </Button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          {free ? (
            <Field label={t("editor.price")}>
              <Input value={t("editor.alwaysFree")} disabled />
            </Field>
          ) : (
            <Field
              label={
                form.kind === "subscription"
                  ? form.billingPeriod === "yearly"
                    ? t("editor.pricePerYear")
                    : t("editor.pricePerMonth")
                  : t("editor.price")
              }
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
              />
            </Field>
          )}
          <Field label={t("editor.version")}>
            <Input value={form.version} onChange={(e) => patch({ version: e.target.value })} />
          </Field>
        </div>

        {!free && (
          <Field label={t("editor.plans")}>
            <div className="space-y-3">
              {(form.plans ?? []).map((pl, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={pl.name}
                      onChange={(e) => updatePlan(i, "name", e.target.value)}
                      placeholder={t("editor.planName")}
                    />
                    <div className="relative w-32 shrink-0">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-5"
                        value={pl.priceCents ? pl.priceCents / 100 : 0}
                        onChange={(e) =>
                          updatePlan(
                            i,
                            "priceCents",
                            Math.max(0, Math.round(parseFloat(e.target.value || "0") * 100)),
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePlan(i)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <XLg className="size-4" />
                    </button>
                  </div>
                  <Input
                    value={pl.description ?? ""}
                    onChange={(e) => updatePlan(i, "description", e.target.value)}
                    placeholder={t("editor.planDesc")}
                    className="mt-2"
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addPlan}>
                <PlusLg className="size-4" /> {t("editor.addPlan")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("editor.plansHint")}</p>
          </Field>
        )}

        <Field label={t("editor.description")}>
          <Textarea
            className="min-h-[140px]"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder={t("editor.descPlaceholder")}
          />
        </Field>

        <Field label={t("editor.tags")}>
          <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="encryption, privacy, cli" />
        </Field>

        <div className="grid grid-cols-[auto_1fr] gap-4">
          <Field label={t("editor.icon")}>
            <ImageSlot
              value={form.iconUrl}
              boxClass="size-24"
              addLabel={t("editor.addImage")}
              changeLabel={t("editor.changeImage")}
              onPick={(files) => setImage("iconUrl", files)}
              onClear={() => patch({ iconUrl: "" })}
            />
            <p className="text-xs text-muted-foreground">{t("editor.iconHint")}</p>
          </Field>

          <Field label={t("editor.cover")}>
            <ImageSlot
              value={form.coverImage}
              boxClass="aspect-[3/2] h-24"
              addLabel={t("editor.addImage")}
              changeLabel={t("editor.changeImage")}
              onPick={(files) => setImage("coverImage", files)}
              onClear={() => patch({ coverImage: "" })}
            />
            <p className="text-xs text-muted-foreground">{t("editor.coverHint")}</p>
          </Field>
        </div>

        <Field label={t("editor.banner")}>
          <ImageSlot
            value={form.bannerImage}
            boxClass="aspect-[16/6] w-full max-w-md"
            addLabel={t("editor.addImage")}
            changeLabel={t("editor.changeImage")}
            onPick={(files) => setImage("bannerImage", files)}
            onClear={() => patch({ bannerImage: "" })}
          />
          <p className="text-xs text-muted-foreground">{t("editor.bannerHint")}</p>
        </Field>

        <Field label={t("editor.screenshots")}>
          <div className="flex flex-wrap gap-2">
            {(form.screenshots ?? []).map((s, i) => (
              <div key={i} className="group relative size-20 overflow-hidden rounded-lg border border-border">
                <AsyncImage src={s} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeScreenshot(i)}
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <XLg className="size-3" />
                </button>
              </div>
            ))}
            {(form.screenshots?.length ?? 0) < MAX_SHOTS && (
              <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-accent">
                <PlusLg className="size-4" />
                <span className="text-[10px]">{t("editor.addImage")}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addScreenshots(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("editor.screenshotsHint")}</p>
        </Field>

        <Field label={t("editor.faq")}>
          <div className="space-y-3">
            {(form.faq ?? []).map((it, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={it.q}
                    onChange={(e) => updateFaq(i, "q", e.target.value)}
                    placeholder={t("editor.faqQ")}
                  />
                  <button
                    type="button"
                    onClick={() => removeFaq(i)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <XLg className="size-4" />
                  </button>
                </div>
                <Textarea
                  value={it.a}
                  onChange={(e) => updateFaq(i, "a", e.target.value)}
                  placeholder={t("editor.faqA")}
                  className="mt-2 min-h-[70px]"
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addFaq}>
              <PlusLg className="size-4" /> {t("editor.addFaq")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("editor.faqHint")}</p>
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" onClick={() => save(false)} disabled={busy || !canSave}>
            {busy ? <ArrowRepeat className="size-4 animate-spin" /> : null}
            {t("editor.saveDraft")}
          </Button>
          <Button onClick={() => save(true)} disabled={busy || !canSave}>
            {t("editor.saveSubmit")}
          </Button>
        </div>
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{t("preview.title")}</span>
              <Button variant="ghost" size="sm" onClick={() => setFullPreview(true)}>
                <ArrowsFullscreen className="size-3.5" /> {t("preview.expand")}
              </Button>
            </div>
            <div className="max-h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border border-border bg-background/40 p-4">
              <ProductPreview product={previewProduct} />
            </div>
          </div>
        </aside>
      </div>

      {fullPreview && (
        <PreviewOverlay product={previewProduct} onClose={() => setFullPreview(false)} />
      )}
    </div>
  );
}

/** A single image upload slot. Clicking the whole box (re)opens the file picker
 * so the image can be replaced at any time; the ✕ clears it. */
function ImageSlot({
  value,
  boxClass,
  addLabel,
  changeLabel,
  onPick,
  onClear,
}: {
  value?: string | null;
  boxClass: string;
  addLabel: string;
  changeLabel: string;
  onPick: (files: FileList | null) => void;
  onClear: () => void;
}) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border text-muted-foreground transition-colors",
        value ? "border-border" : "border-dashed border-border hover:bg-accent",
        boxClass,
      )}
    >
      {value ? (
        <>
          <AsyncImage src={value} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1 text-[10px] font-medium text-white">
              <ArrowRepeat className="size-3.5" /> {changeLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <XLg className="size-3" />
          </button>
        </>
      ) : (
        <>
          <PlusLg className="size-4" />
          <span className="text-[10px]">{addLabel}</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/** Seller stock manager: shows available/sold counts and bulk-loads credential
 *  lines (one unit per line) for account listings. */
function StockPanel({ productId }: { productId: string }) {
  const t = useT();
  const [summary, setSummary] = React.useState<{ available: number; sold: number; total: number } | null>(null);
  const [raw, setRaw] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const s = await inventorySummary(productId);
      setSummary({ available: s.available, sold: s.sold, total: s.total });
    } catch {
      /* listing may not be saved server-side yet */
    }
  }, [productId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const newLineCount = raw.split("\n").filter((l) => l.trim()).length;

  const upload = async () => {
    if (!newLineCount) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await addInventory(productId, raw);
      setRaw("");
      setMsg(t("editor.stockAdded", { n: r.added }));
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("editor.stockError"));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await clearInventory(productId);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("editor.stockError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      {summary && (
        <div className="flex gap-4 text-xs tabular-nums text-muted-foreground">
          <span><span className="font-semibold text-foreground">{summary.available}</span> {t("editor.stockAvailable")}</span>
          <span><span className="font-semibold text-foreground">{summary.sold}</span> {t("editor.stockSold")}</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("editor.stockHint")}</p>
      <Textarea
        className="min-h-[140px] font-mono text-xs leading-relaxed"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={"login1:password1\nlogin2:password2\ntoken:xxxxx"}
        spellCheck={false}
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={upload} disabled={busy || !newLineCount}>
          {busy ? <ArrowRepeat className="size-4 animate-spin" /> : <PlusLg className="size-4" />}
          {t("editor.stockUpload", { n: newLineCount })}
        </Button>
        {summary && summary.available > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={busy}>
            {t("editor.stockClear")}
          </Button>
        )}
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
