import { ArrowRepeat, ShieldLock } from "react-bootstrap-icons";
import { useApp } from "@/store/app-context";
import { useT } from "@/lib/i18n";
import { AsciiBackground } from "@/components/AsciiBackground";
import { Logo } from "@/components/Logo";
import { WindowControls } from "@/components/TitleBar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

/**
 * Loading gate shown until the network core reports `ready`. The core drives
 * progress via an event; nothing in the app can load before it is reachable.
 */
export function Splash() {
  const { conn } = useApp();
  const t = useT();
  const pct = Math.round(conn.progress * 100);
  const error = conn.phase === "error";

  const [saving, setSaving] = useState(false);

  // "Retry" restarts the whole process so the core reloads its config and
  // reconnects. A bare location.reload() only reloads the webview and leaves a
  // stalled core as-is.
  const handleRetry = async () => {
    try {
      setSaving(true);
      await invoke("restart_app");
    } catch {
      // If the core command isn't available for some reason, fall back to a reload.
      location.reload();
    }
  };

  return (
    <div data-tauri-drag-region className="relative flex h-full flex-col items-center justify-center gap-8 overflow-hidden bg-background px-8">
      <WindowControls className="fixed right-0 top-0 z-50" />
      <AsciiBackground className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_8%,black_70%)]" />
      <div className="relative z-10 flex flex-col items-center gap-3 duration-700 ease-out animate-in fade-in zoom-in-95 motion-reduce:animate-none">
        <Logo className="size-16" />
        <h1 className="text-2xl font-semibold tracking-tight">Fovea <span className="ml-1 inline-block rounded-md bg-primary/15 px-1.5 py-0.5 align-middle text-xs font-medium tracking-wide text-primary">beta</span></h1>
        <p className="text-sm text-muted-foreground">{t("splash.tagline")}</p>
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-3">
        <Progress value={pct} />
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <ArrowRepeat className="size-3.5 animate-spin" />
            {t("splash.connecting")}
          </span>
          <span className="tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      </div>

      {/* Error overlay: connection/config failure with a Retry. */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/5 bg-black/40 p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl duration-500 animate-in fade-in zoom-in-95">
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-amber-500/10 blur-[90px]" />
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />

            <div className="relative flex flex-col items-center gap-4 text-center">
              <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.2)] ring-1 ring-inset ring-amber-500/30">
                <ShieldLock className="size-8 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md">{t("splash.errorTitle")}</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground/90">
                  {conn.error || conn.message || t("splash.errorBody")}
                </p>
              </div>
            </div>

            <div className="relative mt-8">
              <Button
                className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary/80 text-base font-bold tracking-wide text-black shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] disabled:opacity-50"
                onClick={handleRetry}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("splash.connecting")}
                  </>
                ) : (
                  t("common.retry")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
