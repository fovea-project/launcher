import * as React from "react";
import { ArrowRepeat } from "react-bootstrap-icons";
import type { User } from "@/types/api";
import { useApp } from "@/store/app-context";
import { changeDisplayName, isTauri } from "@/lib/api";
import { useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MonoTag } from "@/components/brutalist";
import { MarketplaceApiPanel } from "@/components/MarketplaceApiPanel";
import { cn, formatMoney } from "@/lib/utils";

const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
];

export function Settings() {
  const { session, user, setUser } = useApp();
  const { t, lang, setLang } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-7">
        <MonoTag>SETTINGS</MonoTag>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="space-y-6">
        {user && <AccountCard user={user} setUser={setUser} />}

        {user?.isSeller && <MarketplaceApiPanel />}

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.language")}</CardTitle>
            <CardDescription>{t("settings.languageDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {LANGS.map((l) => (
                <Button
                  key={l.value}
                  variant={lang === l.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLang(l.value)}
                  className={cn(lang === l.value && "ring-1 ring-border")}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.about")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label={t("settings.runtime")}>
              <span className="text-sm text-muted-foreground">
                {isTauri() ? t("settings.native") : t("settings.browser")}
              </span>
            </Row>
            <Row label={t("settings.session")}>
              <span className="text-sm text-muted-foreground">
                {session ? t("settings.stored") : t("settings.notSignedIn")}
              </span>
            </Row>
            <Row label={t("settings.version")}>
              <span className="text-sm text-muted-foreground">Fovea 0.1.0</span>
            </Row>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AccountCard({ user, setUser }: { user: User; setUser: (u: User) => void }) {
  const { t } = useI18n();
  const [name, setName] = React.useState(user.displayName);
  const [savingName, setSavingName] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setName(user.displayName);
  }, [user]);

  const nameDirty = name.trim() !== user.displayName && name.trim() !== "";
  const namePaid = user.freeNameChangeUsed;
  const fee = formatMoney(user.nameChangeFeeCents, "USD");

  const commitName = async () => {
    setSavingName(true);
    setError(null);
    try {
      setUser(await changeDisplayName(name.trim()));
      setConfirmOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.couldNotName"));
      setConfirmOpen(false);
    } finally {
      setSavingName(false);
    }
  };

  const onSaveName = () => {
    if (!nameDirty) return;
    if (namePaid) setConfirmOpen(true);
    else commitName();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.account")}</CardTitle>
        <CardDescription>{t("settings.accountDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Username (login identity — read-only) */}
        <div className="space-y-2">
          <Label htmlFor="username">{t("settings.username")}</Label>
          <Input id="username" value={user.username} readOnly disabled className="opacity-70" />
          <p className="text-xs text-muted-foreground">{t("settings.usernameHint")}</p>
        </div>

        {/* Display name */}
        <div className="space-y-2">
          <Label htmlFor="name">{t("settings.displayName")}</Label>
          <div className="flex gap-2">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={onSaveName} disabled={!nameDirty || savingName} className="shrink-0">
              {savingName ? <ArrowRepeat className="size-4 animate-spin" /> : null}
              {namePaid && nameDirty ? `${t("settings.change")} · ${fee}` : t("common.save")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {namePaid ? t("settings.paidHint", { fee }) : t("settings.firstFree")}
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.confirmDesc", { name: name.trim(), fee })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={commitName} disabled={savingName}>
              {savingName ? <ArrowRepeat className="size-4 animate-spin" /> : null}
              {t("settings.payRename", { fee })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
