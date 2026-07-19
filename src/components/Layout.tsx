import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bag,
  ChatDots,
  ChatSquareText,
  ChevronLeft,
  ChevronRight,
  Github,
  Shop,
  Tags,
  Wallet2,
} from "react-bootstrap-icons";
import type { Wallet } from "@/types/api";
import { getConversations, getWallet, isTauri } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { NotificationPopover } from "@/components/NotificationPopover";
import { UserMenu } from "@/components/UserMenu";
import { WindowControls } from "@/components/TitleBar";
import { cn, formatMoney } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  meta?: string;
}

const STORE_KEY = "fovea.sidebar.collapsed";
const APP_VERSION = "0.1.0";

export function Layout() {
  const t = useT();
  const location = useLocation();
  const routeKey = "/" + (location.pathname.split("/")[1] ?? "");

  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem(STORE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleSidebar = () =>
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  const [unread, setUnread] = React.useState(0);
  const [wallet, setWallet] = React.useState<Wallet | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const [convs, w] = await Promise.all([
        getConversations().catch(() => []),
        getWallet().catch(() => null),
      ]);
      if (!mounted) return;
      setUnread(convs.reduce((n, c) => n + c.unread, 0));
      setWallet(w);
    };
    tick();
    const timer = setInterval(tick, 4000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const balance = wallet ? formatMoney(wallet.balanceCents, wallet.currency) : undefined;

  const items: NavItem[] = [
    { to: "/catalog", label: t("nav.store"), icon: Shop },
    { to: "/library", label: t("nav.library"), icon: Bag },
    { to: "/wallet", label: t("nav.wallet"), icon: Wallet2, meta: balance },
    { to: "/messages", label: t("nav.messages"), icon: ChatDots, badge: unread },
    { to: "/chat", label: t("nav.chat"), icon: ChatSquareText },
    { to: "/sell", label: t("nav.sell"), icon: Tags },
  ];

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-border bg-card/40 transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* header — doubles as a window drag handle (custom chrome) */}
        <div
          data-tauri-drag-region
          className={cn("flex items-center py-4", collapsed ? "justify-center px-0" : "gap-2 px-4")}
        >
          <Logo className="size-8 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-base font-semibold tracking-tight">Fovea</span>
              <button
                onClick={toggleSidebar}
                title={t("nav.collapse")}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button
            onClick={toggleSidebar}
            title={t("nav.expand")}
            className="mx-auto mb-1 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        )}

        {/* nav */}
        <nav className={cn("flex flex-1 flex-col gap-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
          {items.map(({ to, label, icon: Icon, badge, meta }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )
              }
            >
              <span className="relative flex">
                <Icon className="size-4" />
                {collapsed && !!badge && (
                  <span className="absolute -right-1.5 -top-1.5 size-2 rounded-full bg-primary ring-2 ring-card" />
                )}
              </span>
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {!collapsed && meta ? (
                <span className="text-xs tabular-nums text-muted-foreground">{meta}</span>
              ) : null}
              {!collapsed && !!badge && (
                <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => alert("Git integration is in development and will be available soon!")}
            title={collapsed ? "Git (In Dev)" : undefined}
            className={cn(
              "flex items-center rounded-lg py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent/50 hover:text-foreground mt-2",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
            )}
          >
            <span className="relative flex">
              <Github className="size-4" />
            </span>
            {!collapsed && <span className="flex-1 truncate text-left">Git Repo</span>}
            {!collapsed && <span className="text-[10px] uppercase font-bold text-primary/70">Soon</span>}
          </button>
        </nav>

        {/* footer — build version + beta notice */}
        <div className={cn("shrink-0 border-t border-border/60 py-3", collapsed ? "px-0" : "px-4")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-1" title={`Fovea v${APP_VERSION} — beta`}>
              <span className="inline-block rounded bg-primary/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">β</span>
              <span className="text-[9px] tabular-nums text-muted-foreground">{APP_VERSION}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">v{APP_VERSION}</span>
                <span className="inline-block rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">beta</span>
              </div>
              <span className="text-[10px] leading-tight text-muted-foreground/70">{t("nav.betaNotice")}</span>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col relative">
        {/* Top strip = window drag handle. The whole bar drags (Tauri v2 only
            drags on the element that has the attribute); the buttons/popover
            are children, so they keep working normally. */}
        <div
          data-tauri-drag-region
          onDoubleClick={() => isTauri() && import("@tauri-apps/api/window").then((m) => m.getCurrentWindow().toggleMaximize())}
          className="flex h-12 w-full shrink-0 items-center justify-end z-50 bg-background"
        >
          {/* App controls — grouped together (Gestalt proximity) */}
          <div className="flex items-center gap-2">
            <NotificationPopover />
            <UserMenu />
          </div>
          {/* Separator so the destructive window buttons read as a distinct
              group and are less likely to be mis-clicked (Fitts's law). */}
          <div className="mx-2.5 h-6 w-px bg-white/10" />
          <WindowControls />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div
            key={routeKey}
            className="h-full duration-300 ease-out animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
