import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRepeat, ShopWindow, StarFill, Bag, BoxSeam } from "react-bootstrap-icons";
import type { SellerStore as SellerStoreModel } from "@/types/api";
import { getSellerStore } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AsciiBackground } from "@/components/AsciiBackground";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";

export function SellerStore() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const [store, setStore] = React.useState<SellerStoreModel | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    getSellerStore(id)
      .then(setStore)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("common.loading")}
      </div>
    );
  }
  if (!store) {
    return <div className="p-8 text-center text-destructive">{t("product.notFound")}</div>;
  }

  const s = store.seller;

  return (
    <div className="relative min-h-full w-full">
      <AsciiBackground className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,transparent_10%,black_80%)]" />
      
      <div className="relative z-10 mx-auto max-w-6xl px-8 py-8 animate-in fade-in duration-700 zoom-in-95">
        <Button variant="ghost" size="sm" className="mb-5 -ml-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-2" /> {t("common.back")}
        </Button>

        {/* Panoramic Store Banner */}
        <div className="group rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl p-10 shadow-2xl transition-all hover:border-white/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          {/* Background decoration */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-primary/10 to-transparent blur-3xl pointer-events-none transition-all group-hover:from-primary/20" />
          
          <div className="flex items-center gap-6 relative z-10 flex-1">
            <div className="flex size-24 shrink-0 items-center justify-center rounded-3xl border border-primary/30 bg-primary/20 text-primary shadow-[0_0_30px_rgba(var(--primary),0.3)]">
              <ShopWindow className="size-10 drop-shadow-md" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Official Store</div>
              <h1 className="truncate text-4xl font-extrabold tracking-tight text-foreground drop-shadow-md">{s?.storeName ?? t("product.seller")}</h1>
              {s?.about && (
                <p className="line-clamp-2 mt-2 text-sm font-medium text-muted-foreground/80 leading-relaxed max-w-lg">{s.about}</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-4 relative z-10 shrink-0">
            <Stat
              icon={StarFill}
              iconClass="text-amber-400"
              label={t("profile.ratingStat")}
              value={(s?.rating ?? 0).toFixed(1)}
            />
            <Stat
              icon={Bag}
              label={t("profile.salesStat")}
              value={String(s?.totalSales ?? 0)}
            />
            <Stat
              icon={BoxSeam}
              label={t("profile.listingsStat")}
              value={String(store.products.length)}
            />
          </div>
        </div>

      <h2 className="mb-6 text-2xl font-extrabold tracking-tight drop-shadow-md">{t("sellerStore.listings")}</h2>
      {store.products.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-black/20 py-20 text-center shadow-inner">
          <ShopWindow className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <div className="text-lg font-bold tracking-tight text-muted-foreground">{t("sellerStore.empty")}</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {store.products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  iconClass?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-black/30 w-28 h-28 p-4 transition-all hover:bg-black/50 hover:border-white/10 shadow-inner">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        <Icon className={iconClass} size={14} />
      </div>
      <div className="text-2xl font-extrabold tracking-tight text-foreground drop-shadow-md">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{label}</div>
    </div>
  );
}
