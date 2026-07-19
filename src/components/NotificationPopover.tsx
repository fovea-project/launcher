import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRepeat,
  Bell,
  CashCoin,
  ChatDots,
  CheckAll,
  ShieldCheck,
  StarFill,
  Tags,
} from "react-bootstrap-icons";
import type { AppNotification, NotificationType } from "@/types/api";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, relativeTime } from "@/lib/utils";

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  sale: CashCoin,
  subscription: ArrowRepeat,
  review: StarFill,
  submitted: Tags,
  moderated: ShieldCheck,
  message: ChatDots,
  system: Bell,
};

const COLORS: Record<NotificationType, string> = {
  sale: "bg-emerald-500/10 text-emerald-500",
  subscription: "bg-blue-500/10 text-blue-500",
  review: "bg-amber-500/10 text-amber-500",
  submitted: "bg-purple-500/10 text-purple-500",
  moderated: "bg-rose-500/10 text-rose-500",
  message: "bg-sky-500/10 text-sky-500",
  system: "bg-slate-500/10 text-slate-500",
};

const POLL_MS = 5000;

export function NotificationPopover() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    const n = await getNotifications().catch(() => []);
    setItems(n);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleOpen = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationRead(n.id).catch(() => {});
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  const markAll = async () => {
    await markAllNotificationsRead().catch(() => {});
    setItems((xs) => xs.map((x) => ({ ...x, read: true })));
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={t("notifications.title")}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden shadow-xl" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
          <h3 className="font-semibold">{t("notifications.title")}</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground">
              <CheckAll className="mr-1 size-3" /> {t("notifications.markAll")}
            </Button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <ArrowRepeat className="mr-2 size-4 animate-spin" /> {t("common.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Bell className="size-8 opacity-20" />
              <p className="text-sm">{t("notifications.empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                const colorClass = COLORS[n.type] ?? COLORS.system;
                const isClickable = !!n.link || !n.read;

                return (
                  <div
                    key={n.id}
                    onClick={() => isClickable && handleOpen(n)}
                    className={cn(
                      "group flex items-start gap-3 p-4 transition-colors",
                      isClickable && "cursor-pointer hover:bg-accent/40",
                      !n.read ? "bg-primary/[0.02]" : "opacity-80 hover:opacity-100"
                    )}
                  >
                    <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", colorClass)}>
                      <Icon className="size-3.5" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={cn("truncate text-sm", !n.read ? "font-bold text-foreground" : "font-medium text-foreground/90")}>
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {relativeTime(n.createdAt, lang)}
                        </span>
                      </div>
                      
                      {n.body && (
                        <p className={cn("text-xs line-clamp-2", !n.read ? "text-foreground/80" : "text-muted-foreground")}>
                          {n.body}
                        </p>
                      )}
                    </div>
                    
                    {!n.read && (
                      <span className="mt-1.5 flex size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
