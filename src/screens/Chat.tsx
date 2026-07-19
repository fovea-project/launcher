import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRepeat,
  ChatDots,
  ChatLeftText,
  Image as ImageIcon,
  InfoCircle,
  Lock,
  PersonCircle,
  PinAngleFill,
  PlusLg,
  Reply,
  SendFill,
  ShieldLock,
  ThreeDots,
  Trash,
  XLg,
} from "react-bootstrap-icons";
import type { BanInput, ChatMessage, ChatTopic, ChatTopicDetail, ChatTopicPost } from "@/types/api";
import {
  banUser,
  createTopic,
  deleteChatMessage,
  deleteTopic,
  deleteTopicPost,
  getChat,
  getTopic,
  getTopics,
  replyTopic,
  sendChat,
} from "@/lib/api";
import { useApp } from "@/store/app-context";
import { useI18n, useT, type TFunc } from "@/lib/i18n";
import { cn, relativeTime } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { AsciiBackground } from "@/components/AsciiBackground";
import { AsyncImage } from "@/components/AsyncImage";
import { RoleBadge } from "@/components/RoleBadge";
import { Lightbox } from "@/components/Lightbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POLL_MS = 4000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function Chat() {
  const t = useT();
  const { lang } = useI18n();
  const { user } = useApp();
  const navigate = useNavigate();
  const isMod = !!(user?.isModerator || user?.isAdmin);

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState("");
  const [image, setImage] = React.useState<string | null>(null);
  const [replyTarget, setReplyTarget] = React.useState<ChatMessage | null>(null);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lightbox, setLightbox] = React.useState<string | null>(null);
  const [banning, setBanning] = React.useState<ChatMessage | null>(null);

  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const startReply = (m: ChatMessage) => {
    setReplyTarget(m);
    inputRef.current?.focus();
  };

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const atBottomRef = React.useRef(true);

  const refresh = React.useCallback(async () => {
    try {
      const m = await getChat();
      setMessages(m);
    } catch {
      /* keep last messages on transient failure */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Auto-scroll to bottom when new messages arrive and we're already near it.
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const pickImage = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t("chat.imageTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !image) || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendChat({ body, image, replyToId: replyTarget?.id ?? null });
      setText("");
      setImage(null);
      setReplyTarget(null);
      atBottomRef.current = true;
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const remove = async (m: ChatMessage) => {
    setMessages((list) => list.filter((x) => x.id !== m.id));
    try {
      await deleteChatMessage(m.id);
    } catch {
      refresh();
    }
  };

  const doBan = async (m: ChatMessage, input: BanInput) => {
    try {
      await banUser(m.userId, input);
    } catch {
      /* ignore */
    }
    setBanning(null);
  };

  return (
    <div className="relative mx-auto flex h-[calc(100vh-2rem)] w-full gap-5 overflow-hidden bg-background px-6 py-5">
      <AsciiBackground className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_4%,black_72%)] opacity-30" />
      <div className="relative z-10 flex w-full gap-5">
        
        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-md shadow-xl">
      {/* header */}
      <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ChatDots className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">{t("chat.title")}</h1>
          <p className="truncate text-xs text-muted-foreground">{t("chat.subtitle")}</p>
        </div>
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("common.loading")}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ChatDots className="size-10 opacity-40" />
            <p>{t("chat.empty")}</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            // Replies always show their own header so it's clear who replied.
            const grouped = prev && prev.userId === m.userId && !m.replyTo;
            return (
              <MessageRow
                key={m.id}
                m={m}
                grouped={!!grouped}
                lang={lang}
                isMod={isMod}
                onImage={setLightbox}
                onReply={() => startReply(m)}
                onProfile={() => navigate(`/users/${m.userId}`)}
                onDelete={() => remove(m)}
                onBan={() => setBanning(m)}
                t={t}
              />
            );
          })
        )}
      </div>

      {/* composer */}
      <div className="mt-3 border-t border-border pt-3">
        {replyTarget && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-primary bg-accent/40 px-3 py-1.5 text-xs">
            <Reply className="size-3.5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{replyTarget.authorName}</span>{" "}
              <span className="text-muted-foreground">
                {replyTarget.body || (replyTarget.image ? "📷" : "")}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive"
            >
              <XLg className="size-3" />
            </button>
          </div>
        )}
        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
        {image && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-border bg-card p-1.5">
            <img src={image} alt="" className="size-12 rounded object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive"
            >
              <XLg className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <ImageIcon className="size-4" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pickImage(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
              if (e.key === "Escape") setReplyTarget(null);
            }}
            rows={1}
            placeholder={t("chat.placeholder")}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            className="size-10 shrink-0 justify-center p-0"
            disabled={sending || (!text.trim() && !image)}
            onClick={send}
          >
            {sending ? <ArrowRepeat className="size-4 animate-spin" /> : <SendFill className="size-4" />}
          </Button>
        </div>
      </div>
      
      </div>

      <ChatSidebar t={t} lang={lang} />
      </div>

      {lightbox && <Lightbox images={[lightbox]} index={0} onClose={() => setLightbox(null)} />}
      {banning && (
        <BanDialog
          name={banning.authorName}
          onClose={() => setBanning(null)}
          onConfirm={(input) => doBan(banning, input)}
          t={t}
        />
      )}
    </div>
  );
}

function ChatSidebar({ t, lang }: { t: TFunc; lang: string }) {
  const [topics, setTopics] = React.useState<ChatTopic[]>([]);
  const [view, setView] = React.useState<{ kind: "none" } | { kind: "new" } | { kind: "topic"; id: string }>({
    kind: "none",
  });

  const refresh = React.useCallback(() => {
    getTopics().then(setTopics).catch(() => {});
  }, []);
  React.useEffect(() => refresh(), [refresh]);

  return (
    <aside className="hidden shrink-0 flex-col gap-3 self-stretch overflow-y-auto pr-1 lg:flex lg:w-[30%]">
      {/* about */}
      <div className="shrink-0 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <InfoCircle className="size-4 text-primary" /> {t("chat.aboutTitle")}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("chat.aboutText")}</p>
      </div>

      {/* discussions header */}
      <div className="flex shrink-0 items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <ChatLeftText className="size-4 text-primary" /> {t("chat.topicsTitle")}
        </span>
        <button
          type="button"
          onClick={() => setView({ kind: "new" })}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
        >
          <PlusLg className="size-3.5" /> {t("chat.newTopic")}
        </button>
      </div>

      {/* each topic is its own card */}
      {topics.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">{t("chat.noTopics")}</p>
      ) : (
        topics.map((tp) => (
          <button
            key={tp.id}
            type="button"
            onClick={() => setView({ kind: "topic", id: tp.id })}
            className="shrink-0 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <span className="flex items-center gap-1.5">
              {tp.pinned && <PinAngleFill className="size-3.5 shrink-0 text-primary" />}
              {tp.locked && <Lock className="size-3.5 shrink-0 text-muted-foreground" />}
              <span className="line-clamp-2 font-medium leading-snug">{tp.title}</span>
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                {tp.authorName}
                <RoleBadge role={tp.authorRole} />
              </span>
              <span>·</span>
              <span className="shrink-0">{t("chat.repliesN", { n: tp.replyCount })}</span>
              <span>·</span>
              <span className="shrink-0">{relativeTime(tp.lastActivity, lang)}</span>
            </span>
          </button>
        ))
      )}

      {view.kind === "new" && (
        <NewTopicDialog
          onClose={() => setView({ kind: "none" })}
          onCreated={(id) => {
            refresh();
            setView({ kind: "topic", id });
          }}
          t={t}
        />
      )}
      {view.kind === "topic" && (
        <TopicDialog
          id={view.id}
          lang={lang}
          onClose={() => setView({ kind: "none" })}
          onChanged={refresh}
          t={t}
        />
      )}
    </aside>
  );
}

function NewTopicDialog({
  onClose,
  onCreated,
  t,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
  t: TFunc;
}) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!title.trim() || !body.trim() || busy) return;
    setBusy(true);
    try {
      const tp = await createTopic({ title: title.trim(), body: body.trim() });
      onCreated(tp.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} title={t("chat.newTopic")}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>{t("chat.topicTitle")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("chat.topicTitlePh")} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("chat.topicBody")}</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder={t("chat.topicBodyPh")}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button disabled={busy || !title.trim() || !body.trim()} onClick={submit}>
          {busy ? <ArrowRepeat className="size-4 animate-spin" /> : <PlusLg className="size-4" />}
          {t("chat.createTopic")}
        </Button>
      </div>
    </Modal>
  );
}

function TopicDialog({
  id,
  lang,
  onClose,
  onChanged,
  t,
}: {
  id: string;
  lang: string;
  onClose: () => void;
  onChanged: () => void;
  t: TFunc;
}) {
  const [detail, setDetail] = React.useState<ChatTopicDetail | null>(null);
  const [reply, setReply] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    getTopic(id).then(setDetail).catch(() => onClose());
  }, [id, onClose]);
  React.useEffect(() => load(), [load]);

  const sendReply = async () => {
    if (!reply.trim() || busy) return;
    setBusy(true);
    try {
      await replyTopic(id, reply.trim());
      setReply("");
      load();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const removePost = async (postId: string) => {
    await deleteTopicPost(postId).catch(() => {});
    load();
  };

  const removeTopic = async () => {
    await deleteTopic(id).catch(() => {});
    onChanged();
    onClose();
  };

  const topic = detail?.topic;
  const posts = detail?.posts ?? [];
  const op = posts[0];
  const replies = posts.slice(1);
  const canReply = topic && (!topic.locked || topic.canModerate);

  return (
    <Modal onClose={onClose} title={topic?.title ?? t("common.loading")} wide>
      {!detail ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("common.loading")}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {topic?.pinned && (
              <span className="flex items-center gap-1 text-primary">
                <PinAngleFill className="size-3" /> {t("chat.pinned")}
              </span>
            )}
            {topic?.locked && (
              <span className="flex items-center gap-1">
                <Lock className="size-3" /> {t("chat.locked")}
              </span>
            )}
            {op && <span>· {op.authorName}</span>}
            {(topic?.mine || topic?.canModerate) && (
              <button
                type="button"
                onClick={removeTopic}
                className="ml-auto flex items-center gap-1 text-destructive hover:underline"
              >
                <Trash className="size-3" /> {t("chat.deleteTopic")}
              </button>
            )}
          </div>

          {op && (
            <div className="rounded-lg border border-border bg-accent/30 p-3">
              <TopicPost p={op} lang={lang} onDelete={null} t={t} />
            </div>
          )}

          <div className="space-y-2">
            {replies.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <TopicPost
                  p={p}
                  lang={lang}
                  onDelete={p.mine || p.canModerate ? () => removePost(p.id) : null}
                  t={t}
                />
              </div>
            ))}
            {replies.length === 0 && (
              <p className="py-2 text-center text-sm text-muted-foreground">{t("chat.noReplies")}</p>
            )}
          </div>

          {canReply ? (
            <div className="flex items-end gap-2 border-t border-border pt-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder={t("chat.replyPh")}
                className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button className="shrink-0" disabled={busy || !reply.trim()} onClick={sendReply}>
                {busy ? <ArrowRepeat className="size-4 animate-spin" /> : <SendFill className="size-4" />}
                {t("chat.reply")}
              </Button>
            </div>
          ) : (
            <p className="border-t border-border pt-3 text-center text-sm text-muted-foreground">
              {t("chat.lockedNotice")}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function TopicPost({
  p,
  lang,
  onDelete,
  t,
}: {
  p: ChatTopicPost;
  lang: string;
  onDelete: (() => void) | null;
  t: TFunc;
}) {
  return (
    <div className="flex gap-3">
      <Avatar name={p.authorName} src={p.authorAvatar} className="size-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold">{p.authorName}</span>
          <RoleBadge role={p.authorRole} className="translate-y-px" />
          <span className="ml-0.5 text-[11px] text-muted-foreground">{relativeTime(p.createdAt, lang)}</span>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
              title={t("chat.delete")}
            >
              <Trash className="size-3.5" />
            </button>
          )}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground/90">{p.body}</p>
      </div>
    </div>
  );
}

function Modal({
  title,
  wide,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={cn(
          "max-h-[85vh] w-full overflow-y-auto rounded-xl border border-border bg-card p-5",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold leading-snug">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <XLg className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function MessageRow({
  m,
  grouped,
  lang,
  isMod,
  onImage,
  onReply,
  onProfile,
  onDelete,
  onBan,
  t,
}: {
  m: ChatMessage;
  grouped: boolean;
  lang: string;
  isMod: boolean;
  onImage: (src: string) => void;
  onReply: () => void;
  onProfile: () => void;
  onDelete: () => void;
  onBan: () => void;
  t: TFunc;
}) {
  const [menu, setMenu] = React.useState(false);
  const canDelete = m.mine || m.canModerate;
  const canBan = isMod && !m.mine;
  const run = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };

  return (
    <div className={cn("group relative flex gap-3 rounded-lg px-2 hover:bg-accent/30", grouped ? "py-0.5" : "py-1.5")}>
      <div className="w-9 shrink-0">
        {!grouped && (
          <button type="button" onClick={() => setMenu(true)} title={m.authorName}>
            <Avatar name={m.authorName} src={m.authorAvatar} className="size-9 rounded-full transition-opacity hover:opacity-80" />
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-1.5">
            <button
              type="button"
              onClick={() => setMenu(true)}
              className="text-sm font-semibold hover:underline"
            >
              {m.authorName}
            </button>
            <RoleBadge role={m.authorRole} className="translate-y-px" />
            <span className="ml-1 text-[11px] text-muted-foreground">{relativeTime(m.createdAt, lang)}</span>
          </div>
        )}
        {m.replyTo && (
          <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Reply className="size-3 shrink-0 -scale-x-100" />
            <Avatar
              name={m.replyTo.authorName}
              src={m.replyTo.authorAvatar}
              className="size-4 rounded-full border-0 text-[8px]"
            />
            <span className="font-medium text-foreground/70">{m.replyTo.authorName}</span>
            <span className="min-w-0 truncate">{m.replyTo.text}</span>
          </div>
        )}
        {m.body && <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{m.body}</p>}
        {m.image && (
          <button
            type="button"
            onClick={() => onImage(m.image as string)}
            className="mt-1 block max-w-xs overflow-hidden rounded-lg border border-border"
          >
            <AsyncImage src={m.image} className="max-h-60 w-full object-cover" />
          </button>
        )}
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
        >
          <ThreeDots className="size-4" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg">
              <button
                type="button"
                onClick={run(onReply)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
              >
                <Reply className="size-3.5" /> {t("chat.reply")}
              </button>
              <button
                type="button"
                onClick={run(onProfile)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
              >
                <PersonCircle className="size-3.5" /> {t("chat.viewProfile")}
              </button>
              {(canDelete || canBan) && <div className="my-1 border-t border-border" />}
              {canDelete && (
                <button
                  type="button"
                  onClick={run(onDelete)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent"
                >
                  <Trash className="size-3.5" /> {t("chat.delete")}
                </button>
              )}
              {canBan && (
                <button
                  type="button"
                  onClick={run(onBan)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <ShieldLock className="size-3.5" /> {t("chat.banAuthor")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BanDialog({
  name,
  onClose,
  onConfirm,
  t,
}: {
  name: string;
  onClose: () => void;
  onConfirm: (input: BanInput) => void;
  t: TFunc;
}) {
  const [reason, setReason] = React.useState("");
  const [days, setDays] = React.useState("0");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">{t("chat.banTitle", { name })}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("chat.banDesc")}</p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>{t("chat.banReason")}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("chat.banReasonPh")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("chat.banDays")}</Label>
            <Input
              type="number"
              min="0"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("chat.banDaysHint")}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => onConfirm({ days: Math.max(0, parseInt(days || "0", 10) || 0), reason: reason.trim() })}
          >
            <ShieldLock className="size-4" /> {t("chat.banConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
