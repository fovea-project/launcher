import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRepeat, LockFill, SlashCircle } from "react-bootstrap-icons";
import { useApp } from "@/store/app-context";
import { useT } from "@/lib/i18n";
import { AsciiBackground } from "@/components/AsciiBackground";
import { Logo } from "@/components/Logo";
import { WindowControls } from "@/components/TitleBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Banned = { reason: string; until: string | null };

export function Login() {
  const { login } = useApp();
  const t = useT();
  const navigate = useNavigate();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [banned, setBanned] = React.useState<Banned | null>(null);

  const banUntilLabel = (until: string | null): string => {
    if (!until) return t("login.banPermanent");
    const d = new Date(until);
    if (d.getUTCFullYear() >= 9999) return t("login.banPermanent");
    return t("login.banUntil", { date: d.toLocaleString() });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBanned(null);
    setBusy(true);
    try {
      await login(username, password);
      navigate("/catalog", { replace: true });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "banned") {
        const until = (err as { bannedUntil?: string | null }).bannedUntil ?? null;
        setBanned({ reason: err instanceof Error ? err.message : t("login.banned"), until });
      } else {
        setError(err instanceof Error ? err.message : t("login.failed"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-tauri-drag-region className="relative flex h-full items-center justify-center overflow-hidden bg-background px-8">
      <WindowControls className="fixed right-0 top-0 z-50" />
      <AsciiBackground className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_4%,black_72%)]" />
      <div className="relative z-10 w-full max-w-sm duration-500 ease-out animate-in fade-in zoom-in-95 slide-in-from-bottom-3 motion-reduce:animate-none">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="size-16" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {t("login.welcome")} <span className="ml-1 inline-block rounded-md bg-primary/15 px-1.5 py-0.5 align-middle text-[10px] font-medium tracking-wide text-primary">beta</span>
            </h1>
            <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t("login.username")}</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              placeholder={t("login.usernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {banned && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <SlashCircle className="size-4" /> {t("login.banned")}
              </div>
              <p className="mt-1 text-sm text-foreground/90">{banned.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">{banUntilLabel(banned.until)}</p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <ArrowRepeat className="size-4 animate-spin" /> {t("login.signingIn")}
              </>
            ) : (
              <>
                <LockFill className="size-4" /> {t("login.signIn")}
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          {t("login.noAccount")}
        </p>
      </div>
    </div>
  );
}
