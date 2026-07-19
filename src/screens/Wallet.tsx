import * as React from "react";
import {
  ArrowRepeat,
  ArrowDownLeft,
  ArrowUpRight,
  Cash,
  CheckCircleFill,
  ChevronLeft,
  ClockFill,
  Clipboard,
  ClipboardCheck,
  CurrencyBitcoin,
  Lightning,
  PlusLg,
  SendFill,
  Wallet2,
  BoxArrowUpRight,
  XLg,
} from "react-bootstrap-icons";
import { SiBitcoin, SiTether, SiTon, SiEthereum, SiLitecoin, SiBinance, SiMonero } from "react-icons/si";
import type { Conversation, CryptoAsset, DepositIntent, DepositMethod, Transaction, Wallet as WalletModel, Withdrawal, WithdrawMethod } from "@/types/api";
import { useApp } from "@/store/app-context";
import { cancelDeposit, checkDeposit, createCheck, createDeposit, createWithdrawal, getConversations, getTransactions, getWallet, getWithdrawals, sendCheck, getPendingDeposits } from "@/lib/api";
import { useT, type TFunc } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AsciiBackground } from "@/components/AsciiBackground";
import { Avatar } from "@/components/Avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MonoTag, CUT } from "@/components/brutalist";
import { cn, formatMoney } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Crypto asset metadata (icons + colors)
// ---------------------------------------------------------------------------

const CRYPTO_ASSETS: {
  asset: CryptoAsset;
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}[] = [
  { asset: "USDT", label: "Tether", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <SiTether className="size-full" /> },
  { asset: "GRAM", label: "Gram", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", icon: <SiTon className="size-full" /> },
  { asset: "BTC", label: "Bitcoin", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: <SiBitcoin className="size-full" /> },
  { asset: "ETH", label: "Ethereum", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20", icon: <SiEthereum className="size-full" /> },
  { asset: "LTC", label: "Litecoin", color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/20", icon: <SiLitecoin className="size-full" /> },
  { asset: "BNB", label: "BNB", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: <SiBinance className="size-full" /> },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function WalletScreen() {
  const { user } = useApp();
  const t = useT();
  const [wallet, setWallet] = React.useState<WalletModel | null>(null);
  const [txns, setTxns] = React.useState<Transaction[]>([]);
  const [pendingDeposits, setPendingDeposits] = React.useState<DepositIntent[]>([]);
  const [withdrawals, setWithdrawals] = React.useState<Withdrawal[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    const [w, tx, pd, wd] = await Promise.all([getWallet(), getTransactions(), getPendingDeposits(), getWithdrawals()]);
    setWallet(w);
    setTxns(tx);
    setPendingDeposits(pd);
    setWithdrawals(wd);
    setLoading(false);
  }, []);

  const handleCancelDeposit = React.useCallback(async (id: string) => {
    // Optimistically drop it from the list, then confirm with the backend.
    setPendingDeposits((prev) => prev.filter((d) => d.depositId !== id));
    await cancelDeposit(id).catch(() => {});
    await load();
  }, [load]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading || !wallet) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="relative min-h-full w-full">
      <AsciiBackground className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,transparent_10%,black_80%)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-8 py-8 animate-in fade-in duration-700 zoom-in-95">
        <div className="mb-8">
          <MonoTag>WALLET</MonoTag>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold tracking-tight drop-shadow-md">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] border border-primary/20">
              <Wallet2 className="size-6 drop-shadow-md" />
            </div>
            {t("wallet.title")}
          </h1>
        </div>

      {/* ── Balance card ── */}
      <div className={cn("relative mb-8 overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-8 backdrop-blur-xl shadow-2xl transition-all hover:border-primary/20 hover:shadow-[0_0_30px_rgba(var(--primary),0.15)]", CUT)}>
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/20 blur-[60px]" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 size-36 rounded-full bg-primary/10 blur-[50px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary/80">
              {t("wallet.available")}
            </div>
            <div className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight text-foreground drop-shadow-lg">
              {formatMoney(wallet.balanceCents, wallet.currency)}
            </div>
            {wallet.pendingCents > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-400 bg-amber-500/10 w-fit px-2 py-1 rounded-md border border-amber-500/20">
                <ClockFill className="size-3" />
                {t("wallet.pending", { amount: formatMoney(wallet.pendingCents, wallet.currency) })}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <SendCheckDialog onDone={load} currency={wallet.currency} t={t} />
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label={t("wallet.totalSpent")} value={formatMoney(wallet.totalSpentCents, wallet.currency)} />
        {user?.isSeller && (
          <StatCard
            label={t("wallet.earned")}
            value={formatMoney(wallet.totalEarnedCents, wallet.currency)}
            accent
          />
        )}
        <StatCard label={t("wallet.txCount")} value={String(txns.length)} />
      </div>

      {/* ── Deposit / Withdraw — 50/50 ── */}
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Deposit */}
        <div className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-black/40 p-6 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-[0_0_25px_rgba(var(--primary),0.12)]", CUT)}>
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/15 blur-[45px]" />
          <div className="relative flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 text-primary">
              <ArrowDownLeft className="size-5" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-foreground">{t("wallet.depositTitle")}</div>
              <p className="text-xs font-medium text-muted-foreground/80">{t("wallet.depositHint")}</p>
            </div>
          </div>
          <div className="relative mt-5 flex items-end justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">CryptoBot · Monero · TON</span>
            <AddFundsDialog onDone={load} currency={wallet.currency} t={t} />
          </div>
        </div>

        {/* Withdraw */}
        <div className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-amber-500/20 bg-black/40 p-6 backdrop-blur-md transition-all hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.12)]", CUT)}>
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-amber-500/15 blur-[45px]" />
          <div className="relative flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <ArrowUpRight className="size-5" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-foreground">{t("wallet.withdrawTitle")}</div>
              <p className="text-xs font-medium text-muted-foreground/80">{t("wallet.withdrawHint")}</p>
            </div>
          </div>
          <div className="relative mt-5 flex items-end justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">CryptoBot · Monero · TON</span>
            <WithdrawDialog onDone={load} wallet={wallet} t={t} />
          </div>
        </div>
      </div>

      {/* ── Withdrawals status ── */}
      {withdrawals.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground/80">{t("wallet.withdrawals")}</h2>
          <div className="flex flex-col gap-2">
            {withdrawals.map((w) => (
              <WithdrawalRow key={w.id} w={w} currency={wallet.currency} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* ── Pending Deposits ── */}
      {pendingDeposits.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-2">
            <ClockFill className="size-4 animate-pulse" /> Ожидают оплаты
          </h2>
          <div className="flex flex-col gap-2">
            {pendingDeposits.map((intent) => (
              <div key={intent.depositId} className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 transition-all hover:bg-amber-500/10">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 shadow-sm">
                  <Lightning className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-foreground/90">
                    Пополнение через {cap(intent.method)}
                  </div>
                  <div className="mt-0.5 text-xs font-medium capitalize text-muted-foreground/70">
                    {formatMoney(intent.amountUsdCents, wallet.currency)} • {intent.asset || "Любая крипта"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <AddFundsDialog
                    onDone={load}
                    currency={wallet.currency}
                    t={t}
                    resumeIntent={intent}
                    trigger={
                      <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300">
                        Продолжить
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 text-muted-foreground hover:text-destructive"
                    title={t("common.cancel")}
                    onClick={() => handleCancelDeposit(intent.depositId)}
                  >
                    <XLg className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Transactions ── */}
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground/80">{t("wallet.history")}</h2>
      {txns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 backdrop-blur-sm py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
          <ClockFill className="size-8 opacity-20" />
          <span className="font-medium text-sm">{t("wallet.noTx")}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {txns.map((tx) => (
            <TxRow key={tx.id} tx={tx} t={t} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl">
      <div className="relative z-10 text-xs font-medium text-muted-foreground/80">{label}</div>
      <div className={cn("relative z-10 mt-2 text-3xl font-extrabold tabular-nums tracking-tight", accent ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "text-foreground")}>
        {value}
      </div>
    </div>
  );
}

function TxRow({ tx, t }: { tx: Transaction; t: TFunc }) {
  const credit = tx.amountCents >= 0;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-black/20 p-4 transition-all hover:bg-black/40 hover:border-white/10">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
          credit ? "border-primary/30 bg-primary/10 text-primary shadow-primary/20" : "border-white/10 bg-white/5 text-muted-foreground",
        )}
      >
        {credit ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-foreground/90">{tx.description}</div>
        <div className="mt-0.5 text-xs font-medium capitalize text-muted-foreground/70">
          {t(`wallet.tx${cap(tx.type)}`)} <span className="mx-1 opacity-50">•</span> {tx.createdAt}
        </div>
      </div>
      {tx.status !== "confirmed" && (
        <Badge
          variant="outline"
          className={cn("rounded-lg px-2 py-0.5 border-white/10 bg-white/5 font-medium", tx.status === "pending" && "border-amber-500/30 bg-amber-500/10 text-amber-400")}
        >
          {t(`wallet.status${cap(tx.status)}`)}
        </Badge>
      )}
      <div className={cn("shrink-0 font-mono text-lg font-bold tabular-nums drop-shadow-sm", credit ? "text-primary" : "text-foreground")}>
        {credit ? "+" : "−"}
        {formatMoney(Math.abs(tx.amountCents), tx.currency)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Funds Dialog — CryptoBot invoice + on-chain Monero / TON
// ---------------------------------------------------------------------------

type DialogStep = "select" | "pay" | "confirmed";

const DEPOSIT_METHODS: {
  method: DepositMethod;
  label: string;
  hint: string;
  icon: React.ReactNode;
  color: string;
  activeBg: string;
}[] = [
  { method: "cryptobot", label: "CryptoBot", hint: "USDT · TON · BTC · ETH · LTC…", icon: <Lightning className="size-5" />, color: "text-primary", activeBg: "border-primary/40 bg-primary/5" },
  { method: "monero", label: "Monero", hint: "Private · self-custodial", icon: <SiMonero className="size-5" />, color: "text-orange-400", activeBg: "border-orange-400/40 bg-orange-500/5" },
  { method: "ton", label: "TON", hint: "On-chain · comment", icon: <SiTon className="size-5" />, color: "text-sky-400", activeBg: "border-sky-400/40 bg-sky-500/5" },
];

function AddFundsDialog({
  onDone,
  currency,
  t,
  resumeIntent,
  trigger,
}: {
  onDone: () => Promise<void>;
  currency: string;
  t: TFunc;
  resumeIntent?: DepositIntent;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<DialogStep>(resumeIntent ? "pay" : "select");
  const [amount, setAmount] = React.useState("25");
  const [method, setMethod] = React.useState<DepositMethod>(resumeIntent?.method || "cryptobot");
  const [selectedAsset, setSelectedAsset] = React.useState<CryptoAsset>((resumeIntent?.asset as CryptoAsset) || "USDT");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [intent, setIntent] = React.useState<DepositIntent | null>(resumeIntent ?? null);
  const pollRef = React.useRef<ReturnType<typeof setInterval>>();

  // Reset on close, except if waiting for payment or resumeIntent is set
  React.useEffect(() => {
    if (!open) {
      if (step === "pay") return;
      if (resumeIntent) return; // Don't reset if it's a fixed dialog for a specific intent
      const t = setTimeout(() => {
        setStep("select");
        setAmount("25");
        setMethod("cryptobot");
        setSelectedAsset("USDT");
        setIntent(null);
        setBusy(false);
        setError(null);
        if (pollRef.current) clearInterval(pollRef.current);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open, step, resumeIntent]);

  // Poll deposit status while awaiting payment
  React.useEffect(() => {
    if (step !== "pay" || !intent) return;
    pollRef.current = setInterval(async () => {
      try {
        const updated = await checkDeposit(intent.depositId);
        if (updated.status === "paid") {
          clearInterval(pollRef.current);
          setIntent(updated);
          setStep("confirmed");
          await onDone();
        }
      } catch { /* ignore */ }
    }, 2500);
    return () => clearInterval(pollRef.current);
  }, [step, intent, onDone]);

  const amountCents = Math.max(0, Math.round(parseFloat(amount || "0") * 100));

  const handleCreate = async () => {
    if (amountCents <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createDeposit(method, amountCents, method === "cryptobot" ? selectedAsset : "");
      setIntent(created);
      setStep("pay");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("wallet.invoiceError"));
    } finally {
      setBusy(false);
    }
  };

  // Return from the pay screen to the method picker (stops polling the invoice).
  const goBack = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setIntent(null);
    setError(null);
    setStep("select");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button className="gap-2 shadow-lg shadow-primary/10 transition-shadow hover:shadow-primary/20">
            {step === "pay" ? (
              <>
                <ClockFill className="size-4 text-amber-400 animate-pulse" />
                Ожидает оплаты...
              </>
            ) : (
              <>
                <PlusLg className="size-4" /> {t("wallet.addFunds")}
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {step === "select" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CurrencyBitcoin className="size-5 text-primary" /> {t("wallet.addFunds")}
              </DialogTitle>
              <DialogDescription>{t("wallet.addFundsDesc")}</DialogDescription>
            </DialogHeader>

            {/* Amount input */}
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("wallet.enterAmount")}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  className="pl-7 text-lg font-semibold tabular-nums"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Method selector */}
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("wallet.paymentMethod")}
              </div>
              {DEPOSIT_METHODS.map((m) => (
                <button
                  key={m.method}
                  type="button"
                  onClick={() => setMethod(m.method)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    method === m.method ? cn(m.activeBg, "shadow-sm") : "border-border hover:border-primary/20",
                  )}
                >
                  <div className={cn("flex size-10 items-center justify-center rounded-lg bg-muted/50", m.color)}>{m.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="text-[11px] text-muted-foreground">{m.hint}</div>
                  </div>
                  {method === m.method && <CheckCircleFill className={cn("size-4", m.color)} />}
                </button>
              ))}
            </div>

            {/* CryptoBot: preferred asset (restricts the invoice to this coin) */}
            {method === "cryptobot" && (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("wallet.selectCrypto")}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {CRYPTO_ASSETS.map((c) => (
                    <button
                      key={c.asset}
                      type="button"
                      onClick={() => setSelectedAsset(c.asset)}
                      className={cn(
                        "group flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all duration-200",
                        selectedAsset === c.asset
                          ? cn(c.bg, "border-current shadow-sm", c.color)
                          : "border-border hover:border-primary/20 hover:bg-muted/50",
                      )}
                    >
                      <span className={cn("flex size-5 items-center justify-center transition-transform duration-200 group-hover:scale-110", c.color)}>{c.icon}</span>
                      <span className="text-[10px] font-semibold">{c.asset}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button onClick={handleCreate} disabled={busy || amountCents <= 0} className="w-full gap-2">
                {busy ? <ArrowRepeat className="size-4 animate-spin" /> : <Lightning className="size-4" />}
                {t("wallet.createInvoice")} · {formatMoney(amountCents, currency)}
              </Button>
            </DialogFooter>
          </>
        )}
        {step === "pay" && intent && (
          intent.method === "cryptobot"
            ? <CryptoBotPayStep t={t} intent={intent} currency={currency} asset={selectedAsset} onBack={goBack} />
            : <OnchainPayStep t={t} intent={intent} currency={currency} onBack={goBack} />
        )}
        {step === "confirmed" && intent && (
          <ConfirmedStep t={t} intent={intent} currency={currency} onClose={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Small copy-to-clipboard button used by the pay steps. */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 shrink-0 gap-1.5 px-2 text-[10px]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard unavailable */ }
      }}
    >
      {copied ? <ClipboardCheck className="size-3 text-primary" /> : <Clipboard className="size-3" />}
    </Button>
  );
}

/** Full-width labeled copy button with "copied!" feedback. */
function CopyLinkButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      className="w-full gap-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard unavailable */ }
      }}
    >
      {copied ? <ClipboardCheck className="size-4" /> : <Clipboard className="size-4" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Pay step — CryptoBot invoice
// ---------------------------------------------------------------------------

function CryptoBotPayStep({ t, intent, currency, asset, onBack }: { t: TFunc; intent: DepositIntent; currency: string; asset: CryptoAsset; onBack: () => void }) {
  const assetMeta = CRYPTO_ASSETS.find((c) => c.asset === asset);
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ClockFill className="size-4 text-amber-400 animate-pulse" /> {t("wallet.invoiceCreated")}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className={cn("rounded-xl border p-4 text-center", assetMeta?.bg)}>
          <div className={cn("mx-auto flex size-10 items-center justify-center", assetMeta?.color)}>{assetMeta?.icon}</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{formatMoney(intent.amountUsdCents, currency)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("wallet.payInCryptoBot")}</div>
        </div>

        <div className="flex flex-col items-center gap-2 py-2">
          <div className="relative flex items-center justify-center">
            <div className="absolute size-10 animate-ping rounded-full bg-amber-400/20" />
            <ClockFill className="relative size-6 text-amber-400" />
          </div>
          <span className="text-sm font-medium text-amber-400">{t("wallet.awaitingPayment")}</span>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-background p-2.5 overflow-hidden">
          <code className="flex-1 break-all text-xs text-muted-foreground leading-tight max-w-full overflow-wrap-anywhere">
            {intent.payUrl}
          </code>
          <CopyButton value={intent.payUrl} />
        </div>

        <Button className="w-full gap-2" onClick={() => window.open(intent.payUrl, "_blank")}>
          <BoxArrowUpRight className="size-4" />
          {t("wallet.openCryptoBot")}
        </Button>
        <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={onBack}>
          <ChevronLeft className="size-4" /> {t("common.back")}
        </Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pay step — on-chain (Monero subaddress / TON address + comment)
// ---------------------------------------------------------------------------

function OnchainPayStep({ t, intent, currency, onBack }: { t: TFunc; intent: DepositIntent; currency: string; onBack: () => void }) {
  const isTon = intent.method === "ton";
  const accent = isTon ? "text-sky-400" : "text-orange-400";
  const bg = isTon ? "bg-sky-500/10 border-sky-500/20" : "bg-orange-500/10 border-orange-500/20";
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className={cn("flex size-5 items-center justify-center", accent)}>{isTon ? <SiTon className="size-5" /> : <SiMonero className="size-5" />}</span>
          {t("wallet.sendToAddress")}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-1">
        {/* Amount card */}
        <div className={cn("rounded-xl border p-4 text-center", bg)}>
          <div className="text-2xl font-bold tabular-nums">
            {intent.payAmount} <span className="text-base font-semibold opacity-70">{intent.asset}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">≈ {formatMoney(intent.amountUsdCents, currency)}</div>
        </div>

        {/* Address + (TON) comment */}
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{intent.asset} {t("wallet.address")}</span>
              <CopyButton value={intent.payAddress} />
            </div>
            <div className="rounded border bg-background p-2">
              <code className="break-all text-xs font-semibold text-foreground/80">{intent.payAddress}</code>
            </div>
          </div>

          {isTon && intent.payComment && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{t("wallet.comment")} <span className="text-destructive">({t("wallet.required")})</span></span>
                <CopyButton value={intent.payComment} />
              </div>
              <div className="rounded border bg-background p-2">
                <code className="break-all text-xs font-semibold text-sky-400">{intent.payComment}</code>
              </div>
            </div>
          )}
        </div>

        {/* Awaiting */}
        <div className="flex flex-col items-center gap-1.5 py-1">
          <div className="relative flex items-center justify-center">
            <div className="absolute size-9 animate-ping rounded-full bg-amber-400/20" />
            <ClockFill className="relative size-5 text-amber-400" />
          </div>
          <span className="text-sm font-medium text-amber-400">{t("wallet.awaitingPayment")}</span>
        </div>

        <p className="text-center text-xs text-muted-foreground">{t("wallet.onchainHint")}</p>

        <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={onBack}>
          <ChevronLeft className="size-4" /> {t("common.back")}
        </Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Payment confirmed (all methods)
// ---------------------------------------------------------------------------

function ConfirmedStep({
  t,
  intent,
  currency,
  onClose,
}: {
  t: TFunc;
  intent: DepositIntent;
  currency: string;
  onClose: () => void;
}) {
  const label = intent.method === "cryptobot" ? "CryptoBot" : intent.method === "monero" ? "Monero" : "TON";
  return (
    <>
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "1.5s" }} />
          <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/15">
            <CheckCircleFill className="size-8 text-primary duration-500 animate-in zoom-in-0" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-bold text-primary">{t("wallet.paymentConfirmed")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">+{formatMoney(intent.amountUsdCents, currency)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">via {label}</p>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onClose} className="w-full">OK</Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Withdraw Dialog — CryptoBot (instant check) or on-chain (operator payout)
// ---------------------------------------------------------------------------

const WITHDRAW_METHODS: { method: WithdrawMethod; label: string; asset: string; icon: React.ReactNode; color: string; activeBg: string }[] = [
  { method: "cryptobot", label: "CryptoBot", asset: "USDT", icon: <Lightning className="size-5" />, color: "text-primary", activeBg: "border-primary/40 bg-primary/5" },
  { method: "monero", label: "Monero", asset: "XMR", icon: <SiMonero className="size-5" />, color: "text-orange-400", activeBg: "border-orange-400/40 bg-orange-500/5" },
  { method: "ton", label: "TON", asset: "TON", icon: <SiTon className="size-5" />, color: "text-sky-400", activeBg: "border-sky-400/40 bg-sky-500/5" },
];

function WithdrawDialog({ onDone, wallet, t }: { onDone: () => Promise<void>; wallet: WalletModel; t: TFunc }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"form" | "success">("form");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<WithdrawMethod>("cryptobot");
  const [address, setAddress] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Withdrawal | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setAmount("");
        setMethod("cryptobot");
        setAddress("");
        setBusy(false);
        setError(null);
        setResult(null);
      }, 300);
    }
  }, [open]);

  // CryptoBot pays out as a check — no destination address needed.
  const needsAddress = method !== "cryptobot";
  const amountCents = Math.max(0, Math.round(parseFloat(amount || "0") * 100));
  const overBalance = amountCents > wallet.balanceCents;
  // Mirror the backend fee formula for a live preview (backend is authoritative).
  const feeCents = amountCents > 0 ? Math.ceil((amountCents * wallet.withdrawFeePercent) / 100) + wallet.withdrawFeeFlatCents : 0;
  const netCents = Math.max(0, amountCents - feeCents);
  const valid = amountCents >= 500 && netCents > 0 && !overBalance && (!needsAddress || address.trim().length >= 8);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const w = await createWithdrawal(method, amountCents, needsAddress ? address.trim() : "");
      setResult(w);
      setStep("success");
      await onDone();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(code === "insufficient_funds" ? t("wallet.insufficientBalance") : e instanceof Error ? e.message : t("wallet.withdrawError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-amber-400/30 text-amber-400 shadow-sm hover:bg-amber-500/10 hover:text-amber-300">
          <ArrowUpRight className="size-4" /> {t("wallet.withdraw")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpRight className="size-5 text-amber-400" /> {t("wallet.withdrawTitle")}
              </DialogTitle>
              <DialogDescription>{t("wallet.withdrawDesc")}</DialogDescription>
            </DialogHeader>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>{t("wallet.enterAmount")}</span>
                <button type="button" className="text-primary hover:underline" onClick={() => setAmount(String(Math.floor(wallet.balanceCents / 100)))}>
                  {t("wallet.available")}: {formatMoney(wallet.balanceCents, wallet.currency)}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  className={cn("pl-7 text-lg font-semibold tabular-nums", overBalance && "border-destructive")}
                  placeholder="0"
                />
              </div>
              {amountCents > 0 && feeCents > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">{t("wallet.fee")}: {formatMoney(feeCents, wallet.currency)}</span>
                  <span className="font-semibold text-foreground">{t("wallet.youReceive")}: {formatMoney(netCents, wallet.currency)}</span>
                </div>
              )}
            </div>

            {/* Network */}
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("wallet.network")}</div>
              <div className="grid grid-cols-2 gap-2">
                {WITHDRAW_METHODS.map((m) => (
                  <button
                    key={m.method}
                    type="button"
                    onClick={() => setMethod(m.method)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 transition-all",
                      method === m.method ? cn(m.activeBg, "shadow-sm") : "border-border hover:border-primary/20",
                    )}
                  >
                    <span className={cn("flex size-6 items-center justify-center", m.color)}>{m.icon}</span>
                    <span className="text-sm font-semibold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Address (on-chain only — CryptoBot pays out as a check) */}
            {needsAddress ? (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {WITHDRAW_METHODS.find((m) => m.method === method)?.asset} {t("wallet.address")}
                </div>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={method === "ton" ? "UQ…" : "8… / 4…"}
                  className="font-mono text-xs"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
                <Lightning className="size-4 shrink-0 text-primary" />
                {t("wallet.withdrawCryptoBotHint")}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-[11px] text-muted-foreground">{needsAddress ? t("wallet.withdrawNote") : t("wallet.withdrawCryptoBotNote")}</p>

            <DialogFooter>
              <Button
                onClick={submit}
                disabled={busy || !valid}
                className="w-full gap-2 bg-amber-500 text-white shadow-sm shadow-amber-500/20 hover:bg-amber-600"
              >
                {busy ? <ArrowRepeat className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
                {t("wallet.withdraw")} · {formatMoney(amountCents, wallet.currency)}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" style={{ animationDuration: "1.5s" }} />
                <div className="relative flex size-16 items-center justify-center rounded-full bg-amber-500/15">
                  <CheckCircleFill className="size-8 text-amber-400 duration-500 animate-in zoom-in-0" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-amber-400">
                  {result?.method === "cryptobot" ? t("wallet.withdrawSent") : t("wallet.withdrawRequested")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result?.method === "cryptobot" ? t("wallet.withdrawCheckDesc") : t("wallet.withdrawRequestedDesc")}
                </p>
              </div>
            </div>

            {result?.method === "cryptobot" && result.txid && (
              <div className="flex items-center gap-2 rounded-lg border bg-background p-2.5">
                <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{result.txid}</code>
                <CopyButton value={result.txid} />
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {result?.method === "cryptobot" && result.txid && (
                <CopyLinkButton value={result.txid} label={t("wallet.copyCheck")} copiedLabel={t("wallet.copied")} />
              )}
              <Button variant={result?.method === "cryptobot" && result.txid ? "outline" : "default"} onClick={() => setOpen(false)} className="w-full">OK</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WithdrawalRow({ w, currency, t }: { w: Withdrawal; currency: string; t: TFunc }) {
  const meta =
    w.status === "paid"
      ? { label: t("wallet.wPaid"), cls: "border-lime/30 bg-lime/10 text-lime" }
      : w.status === "rejected"
        ? { label: t("wallet.wRejected"), cls: "border-destructive/30 bg-destructive/10 text-destructive" }
        : { label: t("wallet.wPending"), cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" };
  const isCheck = w.method === "cryptobot";
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-black/20 p-4 transition-all hover:bg-black/40">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", isCheck ? "border-primary/20 bg-primary/10 text-primary" : "border-amber-500/20 bg-amber-500/10 text-amber-400")}>
        {isCheck ? <Lightning className="size-5" /> : <ArrowUpRight className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-foreground/90">{t("wallet.withdraw")} · {w.asset}</div>
        {isCheck ? (
          w.txid ? (
            <div className="mt-0.5 flex items-center gap-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground/60">{w.txid}</code>
              <CopyButton value={w.txid} />
            </div>
          ) : null
        ) : (
          <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/60">{w.address}</div>
        )}
        {w.status === "rejected" && w.reason && <div className="mt-0.5 text-[11px] text-destructive/80">{w.reason}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="font-mono text-sm font-bold tabular-nums text-foreground">−{formatMoney(w.amountCents, currency)}</div>
        {w.feeCents > 0 && (
          <div className="font-mono text-[10px] text-muted-foreground/60">{t("wallet.fee")} {formatMoney(w.feeCents, currency)}</div>
        )}
        <Badge variant="outline" className={cn("rounded-lg px-2 py-0.5 font-medium", meta.cls)}>{meta.label}</Badge>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Send Check Dialog — create & send a check to a user from Wallet
// ---------------------------------------------------------------------------

const TRANSFER_PRESETS = [500, 1000, 2500, 5000, 10000];

type TransferStep = "form" | "success";

function SendCheckDialog({
  onDone,
  currency,
  t,
}: {
  onDone: () => Promise<void>;
  currency: string;
  t: TFunc;
}) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<TransferStep>("form");
  const [amountCents, setAmountCents] = React.useState(1000);
  const [customValue, setCustomValue] = React.useState("");
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sentAmount, setSentAmount] = React.useState(0);

  // Load conversations on open
  React.useEffect(() => {
    if (open) {
      getConversations().then((convs) => {
        setConversations(convs);
        if (convs.length > 0 && !selectedConvId) setSelectedConvId(convs[0].id);
      });
    }
  }, [open]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setAmountCents(1000);
        setCustomValue("");
        setSelectedConvId(null);
        setError(null);
        setBusy(false);
      }, 300);
    }
  }, [open]);

  const effectiveAmount = customValue ? Math.max(0, Math.round(parseFloat(customValue) * 100)) : amountCents;

  const handleSend = async () => {
    if (!selectedConvId || effectiveAmount <= 0) return;
    setError(null);
    setBusy(true);
    try {
      const check = await createCheck(effectiveAmount);
      await sendCheck(selectedConvId, check.id);
      setSentAmount(effectiveAmount);
      setStep("success");
      await onDone();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "insufficient_funds") {
        setError(t("messages.insufficientFunds"));
      } else {
        setError(err instanceof Error ? err.message : "Error");
      }
    } finally {
      setBusy(false);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-amber-400/30 text-amber-400 shadow-sm hover:bg-amber-500/10 hover:text-amber-300">
          <SendFill className="size-4" /> {t("wallet.sendCheck")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cash className="size-5 text-amber-400" /> {t("wallet.sendCheck")}
              </DialogTitle>
              <DialogDescription>{t("wallet.transferDesc")}</DialogDescription>
            </DialogHeader>

            {/* Amount presets */}
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("wallet.selectAmount")}
              </div>
              <div className="flex flex-wrap gap-2">
                {TRANSFER_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setAmountCents(v); setCustomValue(""); }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums transition-all",
                      !customValue && amountCents === v
                        ? "border-amber-400/50 bg-amber-500/10 text-amber-400 shadow-sm"
                        : "border-border hover:border-amber-400/30 hover:bg-amber-500/5",
                    )}
                  >
                    {formatMoney(v, currency)}
                  </button>
                ))}
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={t("wallet.customAmount")}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value.replace(/\D/g, ""))}
                  className={cn(
                    "w-24 text-center text-sm tabular-nums",
                    customValue && "border-amber-400/50 bg-amber-500/10",
                  )}
                />
              </div>
            </div>

            {/* Recipient picker */}
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("wallet.selectRecipient")}
              </div>
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("wallet.noConversations")}</p>
              ) : (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-1">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedConvId(c.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all",
                        selectedConvId === c.id
                          ? "bg-amber-500/10 border border-amber-400/30"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <Avatar name={c.peer.displayName} src={c.peer.avatarUrl} className="size-8 rounded-full" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.peer.displayName}</div>
                        {c.productName && (
                          <div className="truncate text-[11px] text-muted-foreground">{c.productName}</div>
                        )}
                      </div>
                      {selectedConvId === c.id && (
                        <CheckCircleFill className="size-4 shrink-0 text-amber-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                onClick={handleSend}
                disabled={busy || effectiveAmount <= 0 || !selectedConvId}
                className="w-full gap-2 bg-amber-500 text-white shadow-sm shadow-amber-500/20 hover:bg-amber-600"
              >
                {busy ? (
                  <ArrowRepeat className="size-4 animate-spin" />
                ) : (
                  <SendFill className="size-4" />
                )}
                {t("wallet.sendCheck")} · {formatMoney(effectiveAmount, currency)}
                {selectedConv ? ` → ${selectedConv.peer.displayName}` : ""}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" style={{ animationDuration: "1.5s" }} />
                <div className="relative flex size-16 items-center justify-center rounded-full bg-amber-500/15">
                  <CheckCircleFill className="size-8 text-amber-400 duration-500 animate-in zoom-in-0" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-amber-400">{t("wallet.checkCreated")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("wallet.checkSentAmount", { amount: formatMoney(sentAmount, currency) })}
                </p>
                {selectedConv && (
                  <p className="mt-0.5 text-xs text-muted-foreground/60">
                    → {selectedConv.peer.displayName}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)} className="w-full">OK</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
