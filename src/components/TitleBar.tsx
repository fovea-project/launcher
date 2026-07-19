import * as React from "react";
import { Dash, Square, Stack, X } from "react-bootstrap-icons";
import { isTauri } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Lazily grab the current Tauri window (absent in plain-browser dev). */
async function appWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

/**
 * Custom window chrome — a draggable strip with the minimize / maximize-restore
 * / close controls (native decorations are off via tauri.conf.json
 * `decorations: false`). Positioned by the caller via `className`:
 *  - in the main app it spans the top of the content column (right of sidebar);
 *  - on login/splash it's a fixed cluster in the top-right corner.
 */
export function WindowControls({ className }: { className?: string }) {
  const [maximized, setMaximized] = React.useState(false);
  const tauri = isTauri();
  const t = useT();

  React.useEffect(() => {
    if (!tauri) return;
    let unlisten: (() => void) | undefined;
    let mounted = true;
    (async () => {
      const w = await appWindow();
      const sync = async () => mounted && setMaximized(await w.isMaximized());
      await sync();
      unlisten = await w.onResized(sync);
    })();
    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [tauri]);

  const minimize = async () => tauri && (await appWindow()).minimize();
  const toggleMaximize = async () => tauri && (await appWindow()).toggleMaximize();
  const close = async () => tauri && (await appWindow()).close();

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={toggleMaximize}
      className={cn("flex h-9 shrink-0 select-none items-center justify-end", className)}
    >
      <div className="flex h-full">
        <WinButton label={t("titlebar.minimize")} onClick={minimize}>
          <Dash className="size-4" />
        </WinButton>
        <WinButton label={maximized ? t("titlebar.restore") : t("titlebar.maximize")} onClick={toggleMaximize}>
          {maximized ? <Stack className="size-3" /> : <Square className="size-3" />}
        </WinButton>
        <WinButton label={t("titlebar.close")} danger onClick={close}>
          <X className="size-4" />
        </WinButton>
      </div>
    </div>
  );
}

function WinButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-full w-12 items-center justify-center text-muted-foreground transition-colors",
        danger
          ? "hover:bg-destructive hover:text-destructive-foreground"
          : "hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
