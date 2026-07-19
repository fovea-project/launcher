import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRepeat,
  BoxSeam,
  CheckCircle,
  Clock,
  PlusLg,
  PencilSquare,
  SendCheck,
  Shop,
  Trash3,
  Wallet2,
} from "react-bootstrap-icons";
import type { Product, SalesPoint, Wallet } from "@/types/api";
import { deleteProduct, getMyProducts, getSellerSales, getWallet, submitForReview } from "@/lib/api";
import { useApp } from "@/store/app-context";
import { useT } from "@/lib/i18n";
import { AsciiBackground } from "@/components/AsciiBackground";
import { StatusBadge } from "@/components/StatusBadge";
import { AsyncImage } from "@/components/AsyncImage";
import { ProductCover } from "@/components/ProductCover";
import { Button } from "@/components/ui/button";
import { cn, formatMoney, formatPrice } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function SellerDashboard() {
  const navigate = useNavigate();
  const t = useT();
  const { user } = useApp();
  const [items, setItems] = React.useState<Product[]>([]);
  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [sales, setSales] = React.useState<SalesPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    getMyProducts()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
    getWallet().then(setWallet).catch(() => {});
    getSellerSales().then(setSales).catch(() => {});
  }, [load]);

  const submit = async (id: string) => {
    setBusyId(id);
    try {
      await submitForReview(id);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("seller.confirmDelete"))) return;
    setBusyId(id);
    try {
      await deleteProduct(id);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const counts = items.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  // Real daily revenue over the last 30 days (from the seller's SALE transactions).
  const chartData = React.useMemo(
    () =>
      sales.map((s) => ({
        date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: Math.round(s.revenueCents / 100),
      })),
    [sales],
  );
  const monthRevenueCents = React.useMemo(() => sales.reduce((a, s) => a + s.revenueCents, 0), [sales]);
  const hasSales = monthRevenueCents > 0;

  return (
    <div className="relative min-h-full w-full">
      <AsciiBackground className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,transparent_10%,black_80%)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-8 py-8 animate-in fade-in duration-700 zoom-in-95">
      {/* header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] border border-primary/20">
            <Shop className="size-6 drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground drop-shadow-md">{t("seller.title")}</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground/80">
              {user?.seller?.storeName ?? t("seller.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user?.seller && (
            <Button asChild variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all">
              <Link to={`/sellers/${user.id}`}>
                <Shop className="mr-2 size-4 text-primary" /> {t("seller.viewStore")}
              </Link>
            </Button>
          )}
          <Button asChild className="shadow-[0_0_15px_rgba(var(--primary),0.4)] transition-all hover:scale-105">
            <Link to="/sell/new">
              <PlusLg className="mr-2 size-4" /> {t("seller.newProduct")}
            </Link>
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={BoxSeam} label={t("seller.statTotal")} value={String(items.length)} />
        <Stat icon={CheckCircle} label={t("seller.statLive")} value={String(counts["approved"] ?? 0)} accent />
        <Stat icon={Clock} label={t("seller.statReview")} value={String(counts["pending_review"] ?? 0)} />
        <Stat
          icon={Wallet2}
          label={t("seller.statEarned")}
          value={wallet ? formatMoney(wallet.totalEarnedCents, wallet.currency) : "—"}
        />
      </div>

      {/* analytics chart */}
      {wallet && (
        <div className="mb-10 rounded-2xl border border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight drop-shadow-md">Sales Performance</h2>
              <p className="text-sm font-medium text-muted-foreground/80">Revenue over the last 30 days</p>
            </div>
            <div
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-bold",
                hasSales
                  ? "bg-lime/10 text-lime shadow-[0_0_15px_rgba(var(--lime),0.2)]"
                  : "bg-white/5 text-muted-foreground",
              )}
            >
              {hasSales ? `+${formatMoney(monthRevenueCents, wallet.currency)} last 30 days` : "No sales yet"}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} fontWeight={500} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} fontWeight={500} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', color: '#fff', fontWeight: 600 }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <h2 className="mb-4 text-xl font-extrabold tracking-tight drop-shadow-md">{t("seller.listingsTitle")}</h2>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("common.loading")}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-black/20 backdrop-blur-sm py-24 text-center text-muted-foreground">
          <div className="rounded-full bg-white/5 p-5">
            <BoxSeam className="size-12 opacity-60 text-primary" />
          </div>
          <p className="text-lg font-medium">{t("seller.noListings")}</p>
          <Button asChild variant="outline" size="sm" className="mt-2 hover:bg-white/10">
            <Link to="/sell/new">{t("seller.createFirst")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_0_25px_rgba(var(--primary),0.15)]"
            >
              <div className="relative h-36 shrink-0 overflow-hidden">
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                  {p.coverImage || p.screenshots?.[0] ? (
                    <AsyncImage
                      src={p.coverImage || p.screenshots[0]}
                      className="size-full object-cover"
                      fallback={<ProductCover product={p} circle={false} className="size-full" iconClassName="size-12" />}
                    />
                  ) : (
                    <ProductCover product={p} circle={false} className="size-full" iconClassName="size-12" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute right-3 top-3">
                  <StatusBadge status={p.status} />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <span className="line-clamp-1 text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">{p.name}</span>
                <p className="mt-1 truncate text-xs font-medium text-muted-foreground/80">
                  <span className="text-primary drop-shadow-sm">{formatPrice(p.priceCents, p.currency)}</span> <span className="mx-1.5 opacity-50">•</span> {t(`kindLabel.${p.kind}`)} <span className="mx-1.5 opacity-50">•</span> v{p.version}
                </p>
                {p.status === "rejected" && p.rejectionReason && (
                  <p className="mt-3 line-clamp-2 text-xs font-medium text-destructive/90 bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                    {t("seller.rejectedReason", { reason: p.rejectionReason })}
                  </p>
                )}

                <div className="mt-auto pt-5">
                  <div className="flex items-center gap-2 border-t border-white/5 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs"
                      onClick={() => navigate(`/sell/${p.id}/edit`)}
                    >
                      <PencilSquare className="mr-2 size-3.5" /> {t("seller.edit")}
                    </Button>
                    {(p.status === "draft" || p.status === "rejected") && (
                      <Button size="sm" className="flex-1 text-xs shadow-[0_0_10px_rgba(var(--primary),0.3)] hover:scale-105 transition-all" onClick={() => submit(p.id)} disabled={busyId === p.id}>
                        {busyId === p.id ? (
                          <ArrowRepeat className="mr-2 size-3.5 animate-spin" />
                        ) : (
                          <SendCheck className="mr-2 size-3.5" />
                        )}
                        {t("seller.submit")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                      title={t("common.delete")}
                      onClick={() => remove(p.id)}
                      disabled={busyId === p.id}
                    >
                      <Trash3 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-black/40 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${accent ? "border-primary/30 hover:border-primary/60 hover:shadow-[0_0_20px_rgba(var(--primary),0.2)]" : "border-white/5 hover:border-white/20"}`}>
      <div className="absolute -right-4 -top-4 opacity-5 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-10 pointer-events-none">
        <Icon className="size-24" />
      </div>
      <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-muted-foreground/80">
        <Icon className={`size-4 ${accent ? "text-primary" : "text-muted-foreground"}`} /> {label}
      </div>
      <div className={`relative z-10 mt-2 text-3xl font-extrabold tracking-tight tabular-nums ${accent ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
