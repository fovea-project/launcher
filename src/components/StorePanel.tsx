import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bag, ChevronRight, ClockHistory, Heart, PlusLg } from "react-bootstrap-icons";
import type { LibraryItem, ProductKind, Wallet } from "@/types/api";
import { getLibrary, getWallet } from "@/lib/api";
import { PRODUCT_KINDS } from "@/lib/productKinds";
import { useT } from "@/lib/i18n";
import { getRecent, RECENT_EVENT, type RecentItem } from "@/lib/recentlyViewed";
import { FAVORITES_EVENT, getFavorites, type FavItem } from "@/lib/favorites";
import { ProductCover } from "@/components/ProductCover";
import { cn, formatListingPrice, formatMoney } from "@/lib/utils";

const KINDS: (ProductKind | "all")[] = ["all", ...PRODUCT_KINDS];
type PurchaseSort = "recent" | "name" | "price";

/** Sticky left-rail in the store: balance, quick type filters, favorites and
 * recently viewed. Intentionally does NOT repeat the sidebar's navigation. */
export function StorePanel({
  kind,
  onKindChange,
  freeOnly,
  onFreeOnlyChange,
}: {
  kind: ProductKind | "all";
  onKindChange: (k: ProductKind | "all") => void;
  freeOnly: boolean;
  onFreeOnlyChange: (b: boolean) => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [recent, setRecent] = React.useState<RecentItem[]>(() => getRecent());
  const [favs, setFavs] = React.useState<FavItem[]>(() => getFavorites());

  React.useEffect(() => {
    getWallet().then(setWallet).catch(() => {});
  }, []);

  React.useEffect(() => {
    const refreshRecent = () => setRecent(getRecent());
    const refreshFavs = () => setFavs(getFavorites());
    window.addEventListener(RECENT_EVENT, refreshRecent);
    window.addEventListener(FAVORITES_EVENT, refreshFavs);
    window.addEventListener("focus", refreshRecent);
    return () => {
      window.removeEventListener(RECENT_EVENT, refreshRecent);
      window.removeEventListener(FAVORITES_EVENT, refreshFavs);
      window.removeEventListener("focus", refreshRecent);
    };
  }, []);

  const balance = wallet ? formatMoney(wallet.balanceCents, wallet.currency) : "—";

  return (
    <aside className="sticky top-24 hidden w-60 shrink-0 self-start lg:flex lg:flex-col lg:gap-3">
      {/* balance + top up — store-relevant wallet action */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-inner backdrop-blur-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all pointer-events-none" />
        <div className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("storePanel.balance")}</div>
        <button
          onClick={() => navigate("/wallet")}
          className="relative z-10 mt-1 block text-3xl font-extrabold tabular-nums text-primary transition-all hover:scale-105 drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]"
        >
          {balance}
        </button>
        <button
          onClick={() => navigate("/wallet")}
          className="relative z-10 mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(var(--primary),0.4)]"
        >
          <PlusLg className="size-4" /> {t("storePanel.topUp")}
        </button>
      </div>

      {/* my purchases, sortable */}
      <PurchasesModule onOpen={(id) => navigate(id ? `/product/${id}` : "/library")} />

      {/* quick type filters + free-only */}
      <div className="rounded-3xl border border-white/5 bg-black/20 p-2 shadow-inner backdrop-blur-sm">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => onKindChange(k)}
            className={cn(
              "flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all hover:bg-black/40",
              kind === k ? "text-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--primary),0.1)]" : "text-foreground/90",
            )}
          >
            {t(`kind.${k}`)}
          </button>
        ))}
        <button
          onClick={() => onFreeOnlyChange(!freeOnly)}
          className="mt-2 flex w-full items-center justify-between gap-2 rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-foreground/90 transition-all hover:bg-black/50"
        >
          {t("storePanel.freeOnly")}
          <span
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-all shadow-inner",
              freeOnly ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-white/10",
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-3 rounded-full bg-white transition-all shadow-sm",
                freeOnly ? "left-5" : "left-1",
              )}
            />
          </span>
        </button>
      </div>

      {/* favorites */}
      {favs.length > 0 && (
        <CompactList
          icon={<Heart className="size-3.5" />}
          title={t("storePanel.favorites")}
          items={favs.slice(0, 5)}
          onPick={(id) => navigate(`/product/${id}`)}
        />
      )}

      {/* recently viewed */}
      <CompactList
        icon={<ClockHistory className="size-3.5" />}
        title={t("storePanel.recent")}
        items={recent.slice(0, 5)}
        emptyText={t("storePanel.recentEmpty")}
        onPick={(id) => navigate(`/product/${id}`)}
      />
    </aside>
  );
}

/** "My purchases" module: lists owned products with a sortable order. The
 * header opens the full purchases page; an item opens its product page. */
function PurchasesModule({ onOpen }: { onOpen: (id: string | null) => void }) {
  const t = useT();
  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [sort, setSort] = React.useState<PurchaseSort>("recent");

  React.useEffect(() => {
    const load = () => getLibrary().then(setItems).catch(() => {});
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const sorted = React.useMemo(() => {
    const copy = [...items];
    if (sort === "name") copy.sort((a, b) => a.product.name.localeCompare(b.product.name));
    else if (sort === "price") copy.sort((a, b) => b.product.priceCents - a.product.priceCents);
    else copy.sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1));
    return copy;
  }, [items, sort]);

  const SORTS: PurchaseSort[] = ["recent", "name", "price"];
  const sortLabel: Record<PurchaseSort, string> = {
    recent: t("storePanel.sortRecent"),
    name: t("storePanel.sortName"),
    price: t("storePanel.sortPrice"),
  };

  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-white/5 bg-black/20 p-2 shadow-inner backdrop-blur-sm">
      <button
        onClick={() => onOpen(null)}
        className="flex items-center justify-between rounded-2xl px-4 py-3 transition-colors hover:bg-black/40"
      >
        <div className="flex items-center gap-3 font-medium">
          <Bag className="size-4 text-primary drop-shadow-sm" /> {t("storePanel.purchases")}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {items.length} <ChevronRight className="size-3.5" />
        </div>
      </button>

      {items.length === 0 ? (
        <p className="px-4 pb-3 text-xs text-muted-foreground/60">{t("storePanel.purchasesEmpty")}</p>
      ) : (
        <>
          <div className="mb-2 flex gap-1 px-2">
            {SORTS.map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "rounded-lg px-2 py-1 text-[11px] transition-colors",
                  sort === s
                    ? "bg-white/10 text-primary"
                    : "text-muted-foreground hover:bg-black/40",
                )}
              >
                {sortLabel[s]}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {sorted.slice(0, 5).map((it) => (
              <button
                key={it.product.id}
                onClick={() => onOpen(it.product.id)}
                className="flex items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-black/40 group"
              >
                <ProductCover product={it.product} className="size-10 shrink-0 rounded-xl bg-black/50 ring-1 ring-white/10 group-hover:ring-primary/40 transition-all shadow-md" iconClassName="size-4" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground/90">{it.product.name}</div>
                  <div className="truncate text-xs font-semibold text-primary/80 mt-0.5">{formatListingPrice(it.product)}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CompactList({
  icon,
  title,
  items,
  emptyText,
  onPick,
}: {
  icon: React.ReactNode;
  title: string;
  items: (RecentItem | FavItem)[];
  emptyText?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-white/5 bg-black/20 p-2 shadow-inner backdrop-blur-sm">
      <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        {icon} {title}
      </div>
      <div className="flex flex-col gap-1">
        {items.length === 0 ? (
          <div className="px-4 pb-3 text-xs text-muted-foreground/60">{emptyText}</div>
        ) : (
          items.map((it) => (
            <button
              key={it.id}
              onClick={() => onPick(it.id)}
              className="flex items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-black/40 group"
            >
              <ProductCover
                product={it as any}
                className="size-10 shrink-0 rounded-xl bg-black/50 ring-1 ring-white/10 group-hover:ring-primary/40 transition-all shadow-md"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground/90">{it.name}</div>
                <div className="truncate text-xs font-semibold text-primary/80 mt-0.5">
                  {formatListingPrice(it as any)}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
