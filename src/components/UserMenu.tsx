import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/store/app-context";
import { getWallet } from "@/lib/api";
import { formatMoney, cn } from "@/lib/utils";
import type { Wallet } from "@/types/api";
import {
  PersonCircle,
  Gear,
  BoxArrowRight,
  Wallet2,
  Tags,
} from "react-bootstrap-icons";
import { useT } from "@/lib/i18n";

export function UserMenu() {
  const { user, logout, conn } = useApp();
  const navigate = useNavigate();
  const t = useT();
  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      getWallet().then(setWallet).catch(() => {});
    }
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const closeAndNavigate = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50">
          <Avatar name={user.displayName} src={user.avatarUrl} className="size-9 rounded-full ring-1 ring-border shadow-sm hover:ring-primary/50 transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 rounded-2xl border border-white/10 bg-black/70 p-2 text-foreground shadow-2xl backdrop-blur-xl"
      >
        {/* User Info Header */}
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar name={user.displayName} src={user.avatarUrl} className="size-12 rounded-full ring-2 ring-primary/20" />
          <div className="flex flex-col overflow-hidden">
            <span className="truncate font-semibold tracking-tight text-white/90">
              {user.displayName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              @{user.username}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", conn.phase === "ready" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-yellow-500")} />
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                {conn.phase === "ready" ? "Secure" : "Connecting"}
              </span>
            </div>
          </div>
        </div>

        <div className="my-1 h-px bg-white/10" />

        {/* Quick Wallet */}
        <div className="px-2 py-2">
          <button 
            onClick={() => closeAndNavigate("/wallet")}
            className="flex w-full items-center justify-between rounded-xl bg-primary/10 px-4 py-2.5 transition-colors hover:bg-primary/20"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Wallet2 className="size-4" />
              Кошелек
            </div>
            <div className="text-sm font-bold tracking-tight text-white/90">
              {wallet ? formatMoney(wallet.balanceCents, wallet.currency) : "—"}
            </div>
          </button>
        </div>

        <div className="my-1 h-px bg-white/10" />

        {/* Actions */}
        <div className="flex flex-col gap-1 p-1">
          {user.isSeller && (
            <MenuItem icon={Tags} label={t("nav.sell")} onClick={() => closeAndNavigate("/sell")} />
          )}
          <MenuItem icon={PersonCircle} label={t("nav.profile")} onClick={() => closeAndNavigate("/profile")} />
          <MenuItem icon={Gear} label={t("nav.settings")} onClick={() => closeAndNavigate("/settings")} />
        </div>

        <div className="my-1 h-px bg-white/10" />

        <div className="p-1">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <BoxArrowRight className="size-4" />
            <span>{t("nav.signOut")}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  );
}
