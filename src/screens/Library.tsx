import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowClockwise,
  ArrowRepeat,
  BoxSeam,
  Check2,
  CodeSlash,
  Download,
  Eye,
  XCircle,
  Bag,
  Wallet2,
} from "react-bootstrap-icons";
import type { DigitalDelivery, DownloadBundle, LibraryItem, Subscription, Wallet } from "@/types/api";
import {
  cancelSubscription,
  downloadItem,
  getDelivery,
  getLibrary,
  getSubscriptions,
  getWallet,
  resumeSubscription,
  startConversation,
} from "@/lib/api";
import { useT, type TFunc } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryBox } from "@/components/DeliveryBox";
import { AsyncImage } from "@/components/AsyncImage";
import { ProductCover } from "@/components/ProductCover";
import { ProjectViewer } from "@/components/ProjectViewer";
import { formatBytes, formatMoney } from "@/lib/utils";

export function Library() {
  const t = useT();
  const [purchases, setPurchases] = React.useState<LibraryItem[]>([]);
  const [subs, setSubs] = React.useState<Subscription[]>([]);
  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadSubs = React.useCallback(() => getSubscriptions().then(setSubs).catch(() => {}), []);

  React.useEffect(() => {
    Promise.all([
      getLibrary().then((l) => setPurchases(l.filter((i) => i.product.kind !== "subscription"))),
      loadSubs(),
      getWallet().then(setWallet).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [loadSubs]);

  const activeSubs = subs.filter((s) => s.status === "active").length;

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      {/* header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Bag className="size-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("library.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("library.subtitle")}</p>
        </div>
      </div>

      {/* summary */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat icon={BoxSeam} label={t("library.statPurchases")} value={String(purchases.length)} />
        <Stat icon={ArrowClockwise} label={t("library.statSubs")} value={String(activeSubs)} />
        <Stat
          icon={Wallet2}
          label={t("library.statSpent")}
          value={wallet ? formatMoney(wallet.totalSpentCents, wallet.currency) : "—"}
        />
      </div>

      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases">
            {t("library.tabPurchases")}
            {purchases.length > 0 && <span className="ml-1.5 text-muted-foreground">{purchases.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            {t("library.tabSubscriptions")}
            {subs.length > 0 && <span className="ml-1.5 text-muted-foreground">{subs.length}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="purchases">
          {loading ? <Loading /> : <Purchases items={purchases} t={t} />}
        </TabsContent>
        <TabsContent value="subscriptions">
          {loading ? <Loading /> : <Subscriptions subs={subs} reload={loadSubs} t={t} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function PurchaseCover({ product }: { product: LibraryItem["product"] }) {
  const cover = product.coverImage || product.screenshots?.[0];
  return cover ? (
    <AsyncImage
      src={cover}
      className="size-full object-cover"
      fallback={<ProductCover product={product} circle={false} className="size-full" iconClassName="size-12" />}
    />
  ) : (
    <ProductCover product={product} circle={false} className="size-full" iconClassName="size-12" />
  );
}

function Purchases({ items, t }: { items: LibraryItem[]; t: TFunc }) {
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const [bundles, setBundles] = React.useState<Record<string, DownloadBundle>>({});
  const [deliveries, setDeliveries] = React.useState<Record<string, DigitalDelivery>>({});
  const [projectViewerBundle, setProjectViewerBundle] = React.useState<DownloadBundle | null>(null);

  const contactSeller = async (sellerId: string, productId: string) => {
    const conv = await startConversation(sellerId, productId);
    navigate(`/messages/${conv.id}`);
  };

  const act = async (pid: string, fn: () => Promise<void>) => {
    setBusy((b) => ({ ...b, [pid]: true }));
    try {
      await fn();
    } finally {
      setBusy((b) => ({ ...b, [pid]: false }));
    }
  };

  if (items.length === 0) {
    return (
      <Empty icon={BoxSeam} text={t("library.noPurchases")}>
        <Button asChild variant="outline" size="sm">
          <Link to="/catalog">{t("library.browse")}</Link>
        </Button>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ProjectViewer 
        bundle={projectViewerBundle} 
        open={!!projectViewerBundle} 
        onOpenChange={(o) => !o && setProjectViewerBundle(null)} 
      />
      {items.map((item) => {
        const p = item.product;
        const reveals = p.deliveryType !== "file"; // code/key/account/link reveal; file downloads
        const meta =
          p.deliveryType === "file" && p.sizeBytes > 0
            ? `v${p.version} · ${formatBytes(p.sizeBytes)}`
            : t(`kindLabel.${p.kind}`);
        return (
          <div
            key={p.id}
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
          >
            <Link to={`/product/${p.id}`} className="relative block h-28 shrink-0">
              <PurchaseCover product={p} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <Badge className="absolute left-2.5 top-2.5 rounded-full bg-black/55 text-white backdrop-blur">
                {t(`kindLabel.${p.kind}`)}
              </Badge>
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <Link
                to={`/product/${p.id}`}
                className="line-clamp-1 font-semibold transition-colors hover:text-primary"
              >
                {p.name}
              </Link>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {meta} · {t("library.purchased")} {item.purchasedAt}
              </p>

              <div className="mt-3">
                {reveals ? (
                  <Button
                    size="sm"
                    className="w-full justify-center"
                    disabled={busy[p.id] || !!deliveries[p.id]}
                    onClick={() =>
                      act(p.id, async () => {
                        const d = await getDelivery(p.id);
                        setDeliveries((m) => ({ ...m, [p.id]: d }));
                      })
                    }
                  >
                    {busy[p.id] ? <ArrowRepeat className="size-4 animate-spin" /> : <Eye className="size-4" />}
                    {deliveries[p.id] ? t("library.revealed") : t("library.reveal")}
                  </Button>
                ) : bundles[p.id] ? (
                  <div className="flex items-center gap-2">
                    <span className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-lime/30 bg-lime/10 py-2 text-sm text-lime">
                      <Check2 className="size-4" /> {t("library.downloaded")}
                    </span>
                    {bundles[p.id].filename.endsWith(".zip") && (
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => setProjectViewerBundle(bundles[p.id])}>
                        <CodeSlash className="size-4 mr-1" /> Code
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="w-full justify-center"
                    disabled={busy[p.id]}
                    onClick={() =>
                      act(p.id, async () => {
                        const b = await downloadItem(p.id);
                        setBundles((m) => ({ ...m, [p.id]: b }));
                      })
                    }
                  >
                    {busy[p.id] ? <ArrowRepeat className="size-4 animate-spin" /> : <Download className="size-4" />}
                    {t("common.download")}
                  </Button>
                )}
              </div>
              {deliveries[p.id] && (
                <DeliveryBox
                  delivery={deliveries[p.id]}
                  className="mt-3"
                  onContact={() => contactSeller(p.sellerId, p.id)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Subscriptions({ subs, reload, t }: { subs: Subscription[]; reload: () => void; t: TFunc }) {
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});

  const toggle = async (s: Subscription) => {
    setBusy((b) => ({ ...b, [s.id]: true }));
    try {
      if (s.autoRenew) await cancelSubscription(s.id);
      else await resumeSubscription(s.id);
      reload();
    } finally {
      setBusy((b) => ({ ...b, [s.id]: false }));
    }
  };

  if (subs.length === 0) {
    return (
      <Empty icon={ArrowClockwise} text={t("library.noSubs")}>
        <Button asChild variant="outline" size="sm">
          <Link to="/catalog">{t("library.findSubs")}</Link>
        </Button>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {subs.map((s) => (
        <div
          key={s.id}
          className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
        >
          <Link to={`/product/${s.product.id}`} className="relative block h-28 shrink-0">
            <PurchaseCover product={s.product} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            {s.autoRenew ? (
              <Badge className="absolute left-2.5 top-2.5 rounded-full bg-lime/90 text-black">
                {t("library.active")}
              </Badge>
            ) : (
              <Badge className="absolute left-2.5 top-2.5 rounded-full bg-amber-500/90 text-black">
                {t("library.canceling")}
              </Badge>
            )}
          </Link>
          <div className="flex flex-1 flex-col p-4">
            <Link
              to={`/product/${s.product.id}`}
              className="line-clamp-1 font-semibold transition-colors hover:text-primary"
            >
              {s.product.name}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatMoney(s.priceCents, s.currency)}/{s.billingPeriod === "yearly" ? "yr" : "mo"} ·{" "}
              {s.autoRenew ? t("library.renews") : t("library.ends")} {s.currentPeriodEnd}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full justify-center"
              onClick={() => toggle(s)}
              disabled={busy[s.id]}
            >
              {busy[s.id] ? (
                <ArrowRepeat className="size-4 animate-spin" />
              ) : s.autoRenew ? (
                <XCircle className="size-4" />
              ) : (
                <ArrowClockwise className="size-4" />
              )}
              {s.autoRenew ? t("library.cancel") : t("library.resume")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Loading() {
  const t = useT();
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("common.loading")}
    </div>
  );
}

function Empty({
  icon: Icon,
  text,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
      <Icon className="size-10 opacity-40" />
      <p>{text}</p>
      {children}
    </div>
  );
}
