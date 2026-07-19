import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRepeat,
  BookmarkFill,
  Cash,
  ChatDots,
  CheckCircleFill,
  CurrencyDollar,
  SendFill,
  Wallet2,
  XLg,
} from "react-bootstrap-icons";
import type { ChatCheck, Conversation, Message } from "@/types/api";
import {
  claimCheck,
  createCheck,
  getConversations,
  getMessages,
  sendCheck,
  sendMessage,
} from "@/lib/api";
import { addSavedMessage, getSavedMessages, lastSaved, SAVED_EVENT, SAVED_ID } from "@/lib/savedMessages";
import { useT, type TFunc } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { AsciiBackground } from "@/components/AsciiBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatMoney } from "@/lib/utils";

const POLL_MS = 3000;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function dateLabel(iso: string, t: TFunc): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return t("messages.today");
  if (same(d, yest)) return t("messages.yesterday");
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export function Messages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [savedLast, setSavedLast] = React.useState<Message | null>(() => lastSaved());

  const loadConversations = React.useCallback(async () => {
    setConversations(await getConversations());
  }, []);

  React.useEffect(() => {
    loadConversations();
    const timer = setInterval(loadConversations, POLL_MS);
    return () => clearInterval(timer);
  }, [loadConversations]);

  React.useEffect(() => {
    const refresh = () => setSavedLast(lastSaved());
    window.addEventListener(SAVED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_EVENT, refresh);
  }, []);

  // The personal "Saved Messages" chat, always pinned to the very top.
  const savedConv: Conversation = {
    id: SAVED_ID,
    saved: true,
    peer: { id: SAVED_ID, displayName: t("messages.saved") },
    productId: null,
    productName: null,
    lastMessage: savedLast,
    unread: 0,
    updatedAt: savedLast?.sentAt ?? "",
  };
  const allConvs = [savedConv, ...conversations.filter((c) => c.id !== SAVED_ID)];

  React.useEffect(() => {
    if (!id) navigate(`/messages/${SAVED_ID}`, { replace: true });
  }, [id, navigate]);

  const active = allConvs.find((c) => c.id === id);

  return (
    <div className="relative mx-auto flex h-[calc(100vh-2rem)] w-full gap-5 overflow-hidden bg-background px-6 py-5">
      <AsciiBackground className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_4%,black_72%)] opacity-30" />
      <div className="relative z-10 flex w-full gap-5">
      {/* conversation list */}
      <aside className="flex w-80 shrink-0 flex-col rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <ChatDots className="size-4 text-primary" />
          <h1 className="text-base font-semibold tracking-tight">{t("messages.title")}</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {allConvs.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/messages/${c.id}`)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/40",
                  c.id === id && "bg-accent/70",
                )}
              >
                {c.saved ? (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <BookmarkFill className="size-5" />
                  </span>
                ) : (
                  <Avatar name={c.peer.displayName} src={c.peer.avatarUrl} className="size-11 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{c.peer.displayName}</span>
                    {c.lastMessage && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {fmtTime(c.lastMessage.sentAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {c.lastMessage?.check
                        ? `💸 ${t("messages.check")} · ${formatMoney(c.lastMessage.check.amountCents, c.lastMessage.check.currency)}`
                        : c.lastMessage?.body ?? t("messages.noMessages")}
                    </span>
                    {c.unread > 0 && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
          ))}
        </div>
      </aside>

      {active ? (
        <Thread conversation={active} onSent={loadConversations} t={t} saved={!!active.saved} />
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md shadow-xl text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <ChatDots className="size-10 opacity-30" />
            <span className="text-sm">{t("messages.select")}</span>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

function Thread({
  conversation,
  onSent,
  t,
  saved,
}: {
  conversation: Conversation;
  onSent: () => void;
  t: TFunc;
  saved?: boolean;
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [showCheckPanel, setShowCheckPanel] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    setMessages(saved ? getSavedMessages() : await getMessages(conversation.id));
  }, [conversation.id, saved]);

  React.useEffect(() => {
    load();
    if (saved) {
      const refresh = () => setMessages(getSavedMessages());
      window.addEventListener(SAVED_EVENT, refresh);
      return () => window.removeEventListener(SAVED_EVENT, refresh);
    }
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load, saved]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    setSending(true);
    try {
      if (saved) {
        addSavedMessage(body);
        setMessages(getSavedMessages());
      } else {
        await sendMessage(conversation.id, body);
        await load();
      }
      onSent();
    } finally {
      setSending(false);
    }
  };

  const handleCheckSent = async () => {
    setShowCheckPanel(false);
    await load();
    onSent();
  };

  const handleClaim = async (checkId: string) => {
    await claimCheck(checkId);
    await load();
  };

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md shadow-xl overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        {saved ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <BookmarkFill className="size-4" />
          </span>
        ) : (
          <Avatar name={conversation.peer.displayName} src={conversation.peer.avatarUrl} className="size-9 rounded-full" />
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{conversation.peer.displayName}</div>
          {saved ? (
            <div className="truncate text-xs text-muted-foreground">{t("messages.savedHint")}</div>
          ) : (
            conversation.productName && (
              <div className="truncate text-xs text-muted-foreground">
                {t("messages.about", { name: conversation.productName })}
              </div>
            )
          )}
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4 sm:px-8">
        {messages.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("messages.empty")}</p>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showDate = !prev || new Date(prev.sentAt).toDateString() !== new Date(m.sentAt).toDateString();
          const grouped = prev && prev.mine === m.mine && !showDate;
          return (
            <React.Fragment key={m.id}>
              {showDate && (
                <div className="flex justify-center py-3">
                  <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">
                    {dateLabel(m.sentAt, t)}
                  </span>
                </div>
              )}
              <div className={cn("flex justify-start", grouped ? "mt-1" : "mt-6")}>
                {m.check ? (
                  <CheckCard check={m.check} mine={m.mine} t={t} onClaim={handleClaim} sentAt={m.sentAt} />
                ) : (
                  <div
                    className={cn(
                      "max-w-[75%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                      m.mine
                        ? "rounded-lg rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-lg rounded-bl-md border border-border bg-card text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <span
                      className={cn(
                        "mt-0.5 block text-right text-[10px]",
                        m.mine ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {fmtTime(m.sentAt)}
                    </span>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Check creation panel */}
      {showCheckPanel && !saved && (
        <CreateCheckPanel
          conversationId={conversation.id}
          t={t}
          onSent={handleCheckSent}
          onClose={() => setShowCheckPanel(false)}
        />
      )}

      {/* composer */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
        {/* Check button — only in non-saved conversations */}
        {!saved && (
          <button
            type="button"
            onClick={() => setShowCheckPanel((v) => !v)}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95",
              showCheckPanel
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
            )}
            title={t("messages.createCheck")}
          >
            <Wallet2 className="size-4" />
          </button>
        )}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("messages.write")}
          autoComplete="off"
          className="rounded-full px-4"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        >
          {sending ? <ArrowRepeat className="size-4 animate-spin" /> : <SendFill className="size-4" />}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Check card — rendered inline in the message list
// ---------------------------------------------------------------------------

function CheckCard({
  check,
  mine,
  t,
  onClaim,
  sentAt,
}: {
  check: ChatCheck;
  mine: boolean;
  t: TFunc;
  onClaim: (id: string) => Promise<void>;
  sentAt: string;
}) {
  const [claiming, setClaiming] = React.useState(false);
  const claimed = check.status === "claimed";
  const expired = check.status === "expired";

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await onClaim(check.id);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div
      className={cn(
        "w-64 overflow-hidden rounded-xl border shadow-sm transition-all",
        claimed
          ? "border-primary/30 bg-primary/5"
          : expired
            ? "border-border bg-muted/50 opacity-70"
            : "border-amber-400/30 bg-gradient-to-br from-amber-500/5 to-amber-600/10",
      )}
    >
      {/* Header strip */}
      <div
        className={cn(
          "flex items-center gap-2 px-3.5 py-2",
          claimed ? "bg-primary/10" : expired ? "bg-muted" : "bg-amber-500/10",
        )}
      >
        {claimed ? (
          <CheckCircleFill className="size-4 text-primary" />
        ) : (
          <Cash className="size-4 text-amber-400" />
        )}
        <span className="text-xs font-semibold">
          {claimed ? t("messages.checkClaimed") : expired ? t("messages.checkExpired") : t("messages.check")}
        </span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <div className="flex items-baseline gap-1.5">
          <CurrencyDollar className={cn("size-5", claimed ? "text-primary" : "text-amber-400")} />
          <span className="text-2xl font-extrabold tabular-nums">
            {(check.amountCents / 100).toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground">{check.currency}</span>
        </div>

        {check.creatorName && !mine && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("messages.checkFrom", { name: check.creatorName })}
          </p>
        )}
        {mine && (
          <p className="mt-1 text-xs text-muted-foreground">{t("messages.checkSent")}</p>
        )}

        {/* Claim button — only for receiver, only if active */}
        {!mine && !claimed && !expired && (
          <Button
            size="sm"
            onClick={handleClaim}
            disabled={claiming}
            className="mt-3 w-full gap-2 bg-amber-500 text-white shadow-sm shadow-amber-500/20 hover:bg-amber-600"
          >
            {claiming ? (
              <ArrowRepeat className="size-3.5 animate-spin" />
            ) : (
              <Wallet2 className="size-3.5" />
            )}
            {t("messages.claimCheck")}
          </Button>
        )}
      </div>

      {/* Footer timestamp */}
      <div className="border-t border-border/50 px-3.5 py-1.5">
        <span className="text-[10px] text-muted-foreground">{fmtTime(sentAt)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create check panel — slides up above the composer
// ---------------------------------------------------------------------------

const CHECK_PRESETS = [500, 1000, 2500, 5000];

function CreateCheckPanel({
  conversationId,
  t,
  onSent,
  onClose,
}: {
  conversationId: string;
  t: TFunc;
  onSent: () => void;
  onClose: () => void;
}) {
  const [amountCents, setAmountCents] = React.useState(1000);
  const [customValue, setCustomValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const effectiveAmount = customValue ? Math.max(0, Math.round(parseFloat(customValue) * 100)) : amountCents;

  const handleSend = async () => {
    setError(null);
    setBusy(true);
    try {
      const check = await createCheck(effectiveAmount);
      await sendCheck(conversationId, check.id);
      onSent();
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

  return (
    <div className="border-t border-primary/20 bg-gradient-to-r from-amber-500/5 via-background to-primary/5 px-4 py-3 duration-300 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cash className="size-4 text-amber-400" />
          <span className="text-sm font-semibold">{t("messages.createCheck")}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XLg className="size-3.5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {CHECK_PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => { setAmountCents(v); setCustomValue(""); }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums transition-all",
              !customValue && amountCents === v
                ? "border-amber-400/50 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/10"
                : "border-border hover:border-amber-400/30 hover:bg-amber-500/5",
            )}
          >
            {formatMoney(v, "USD")}
          </button>
        ))}
        <Input
          type="number"
          min="1"
          step="1"
          placeholder={t("messages.checkAmount")}
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          className={cn(
            "w-24 text-center text-sm tabular-nums",
            customValue && "border-amber-400/50 bg-amber-500/10",
          )}
        />
        <Button
          onClick={handleSend}
          disabled={busy || effectiveAmount <= 0}
          size="sm"
          className="ml-auto gap-2 bg-amber-500 text-white shadow-sm shadow-amber-500/20 hover:bg-amber-600"
        >
          {busy ? (
            <ArrowRepeat className="size-3.5 animate-spin" />
          ) : (
            <SendFill className="size-3.5" />
          )}
          {t("messages.sendCheck")} · {formatMoney(effectiveAmount, "USD")}
        </Button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
