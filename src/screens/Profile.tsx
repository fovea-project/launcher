import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRepeat,
  Bag,
  BoxSeam,
  Camera,
  Image as ImageIcon,
  Check2,
  ShieldLock,
  Shop,
  Sliders,
  StarFill,
  XLg,
} from "react-bootstrap-icons";
import { useApp } from "@/store/app-context";
import { becomeSeller, updateProfile } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AsciiBackground } from "@/components/AsciiBackground";
import { Avatar } from "@/components/Avatar";
import { AsyncImage } from "@/components/AsyncImage";
import { RoleBadge } from "@/components/RoleBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function Profile() {
  const { user, setUser, reloadUser } = useApp();
  const t = useT();
  const [bio, setBio] = React.useState(user?.bio ?? "");
  const [avatar, setAvatar] = React.useState(user?.avatarUrl ?? "");
  const [banner, setBanner] = React.useState(user?.bannerImage ?? "");
  const [background, setBackground] = React.useState(user?.backgroundImage ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setBio(user?.bio ?? "");
    setAvatar(user?.avatarUrl ?? "");
    setBanner(user?.bannerImage ?? "");
    setBackground(user?.backgroundImage ?? "");
  }, [user]);

  if (!user) return null;

  const pick = (setter: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
  };

  const dirty =
    bio !== (user.bio ?? "") ||
    avatar !== (user.avatarUrl ?? "") ||
    banner !== (user.bannerImage ?? "") ||
    background !== (user.backgroundImage ?? "");

  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const u = await updateProfile({
        displayName: user.displayName,
        bio,
        avatarUrl: avatar || null,
        bannerImage: banner || null,
        backgroundImage: background || null,
      });
      setUser(u);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-full w-full">
      <AsciiBackground className="pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_top,transparent_10%,black_80%)]" />
      {/* page background wallpaper */}
      {background && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <AsyncImage src={background} className="size-full object-cover" />
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[10px]" />
        </div>
      )}

      {/* background control */}
      <div className="absolute right-4 top-4 z-10 flex gap-1.5">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:bg-accent">
          <ImageIcon className="size-3.5" />
          {background ? t("profile.changeBg") : t("profile.addBg")}
          <input type="file" accept="image/*" className="hidden" onChange={pick(setBackground)} />
        </label>
        {background && (
          <button
            type="button"
            onClick={() => setBackground("")}
            className="rounded-lg border border-border bg-card/80 p-1.5 backdrop-blur transition-colors hover:text-destructive"
          >
            <XLg className="size-3.5" />
          </button>
        )}
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-8 py-8 animate-in fade-in duration-700 zoom-in-95">
      {/* Discord-style banner + avatar */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
        <div className="group relative h-48 bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/20">
          {banner && <AsyncImage src={banner} className="size-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          <div className="absolute right-4 top-4 flex gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-black/40 px-3 py-2 text-xs font-medium text-white backdrop-blur-md transition-all hover:bg-black/60 border border-white/10">
              <Camera className="size-3.5" /> {t("profile.changeBanner")}
              <input type="file" accept="image/*" className="hidden" onChange={pick(setBanner)} />
            </label>
            {banner && (
              <button
                type="button"
                onClick={() => setBanner("")}
                className="rounded-xl bg-black/40 p-2 text-white backdrop-blur-md transition-all hover:bg-black/60 border border-white/10 hover:text-destructive"
              >
                <XLg className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="px-8 pb-6">
          <div className="-mt-16 flex items-end gap-5">
            <div className="relative shrink-0">
              <Avatar
                name={user.displayName}
                src={avatar}
                className="size-32 rounded-full text-4xl ring-[6px] ring-black/40 shadow-[0_0_30px_rgba(var(--primary),0.6)]"
              />
              <label className="absolute bottom-1 right-1 flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all hover:scale-110">
                <Camera className="size-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={pick(setAvatar)} />
              </label>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar("")}
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-card text-muted-foreground shadow ring-1 ring-border transition-colors hover:text-destructive"
                >
                  <XLg className="size-3" />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
                <span className="truncate">{user.displayName}</span>
                <RoleBadge
                  role={user.isAdmin ? "admin" : user.isModerator ? "moderator" : null}
                  className="[&_svg]:size-4"
                />
              </h1>
              <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-xl border-white/10 bg-white/5 backdrop-blur-md px-3 py-1 text-sm font-medium">
              {t("profile.buyer")}
            </Badge>
            {user.isSeller && (
              <Badge className="rounded-xl border border-primary/30 bg-primary/20 backdrop-blur-md px-3 py-1 text-sm font-medium shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                <Shop className="mr-1.5 size-4" /> {t("profile.seller")}
              </Badge>
            )}
            {user.isSeller && user.sellerStatus === "pending" && (
              <Badge className="rounded-xl border border-amber-500/30 bg-amber-500/20 backdrop-blur-md px-3 py-1 text-sm font-medium text-amber-400">
                {t("profile.storePending")}
              </Badge>
            )}
            {user.isModerator && (
              <Badge className="rounded-xl border border-amber-500/30 bg-amber-500/20 backdrop-blur-md px-3 py-1 text-sm font-medium text-amber-400">
                <ShieldLock className="mr-1.5 size-4" /> {t("profile.moderator")}
              </Badge>
            )}
            {user.isAdmin && (
              <Badge className="rounded-xl border border-primary/30 bg-primary/20 backdrop-blur-md px-3 py-1 text-sm font-medium shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                <Sliders className="mr-1.5 size-4" /> {t("profile.admin")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8 pb-12">
        {/* profile info list-style */}
        <div className="rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl transition-all hover:border-white/10 overflow-hidden">
          <div className="p-8 border-b border-white/5 bg-black/20">
            <h2 className="text-xl font-extrabold tracking-tight drop-shadow-md">{t("profile.card")}</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground/80">{t("profile.cardDesc")}</p>
          </div>
          
          <div className="divide-y divide-white/5">
            {/* Display Name Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-8 gap-4 bg-black/10 hover:bg-black/30 transition-colors">
              <div className="sm:w-1/3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <BoxSeam className="size-3" /> {t("profile.displayName")}
                </Label>
              </div>
              <div className="flex-1 flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-medium shadow-inner transition-all hover:border-white/20 hover:bg-black/70">
                <span className="truncate text-foreground/90">{user.displayName}</span>
                <Link
                  to="/settings"
                  className="shrink-0 text-xs font-bold text-primary transition-all hover:text-primary/80 hover:underline ml-4"
                >
                  {t("profile.changeInSettings")}
                </Link>
              </div>
            </div>

            {/* Bio Row */}
            <div className="flex flex-col sm:flex-row items-start justify-between p-8 gap-4 bg-black/10 hover:bg-black/30 transition-colors">
              <div className="sm:w-1/3 pt-3">
                <Label htmlFor="bio" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Camera className="size-3" /> {t("profile.bio")}
                </Label>
              </div>
              <div className="flex-1 w-full">
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full min-h-[120px] rounded-xl border-white/10 bg-black/50 text-sm font-medium shadow-inner focus-visible:ring-primary/50 transition-all hover:border-white/20 hover:bg-black/70"
                  placeholder={t("profile.bioPh")}
                />
              </div>
            </div>

            {/* Save Row */}
            <div className="flex items-center justify-end p-6 bg-black/40">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm font-bold text-primary mr-6 animate-in fade-in slide-in-from-left-2">
                  <Check2 className="size-5" /> {t("common.saved")}
                </span>
              )}
              <Button onClick={onSave} disabled={saving || !dirty} className="rounded-xl px-8 shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all hover:scale-105">
                {saving ? <ArrowRepeat className="mr-2 size-4 animate-spin" /> : null}
                {t("profile.saveChanges")}
              </Button>
            </div>
          </div>
        </div>

        {/* seller store panoramic banner */}
        {user.isSeller && user.seller ? (
          <div className="group rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl p-8 shadow-2xl transition-all hover:border-white/10 relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Background decoration */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-primary/10 to-transparent blur-3xl pointer-events-none transition-all group-hover:from-primary/20" />
            
            <div className="flex items-center gap-6 relative z-10 flex-1">
              <div className="flex size-24 shrink-0 items-center justify-center rounded-3xl border border-primary/30 bg-primary/20 text-primary shadow-[0_0_30px_rgba(var(--primary),0.3)]">
                <Shop className="size-10 drop-shadow-md" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Your Storefront</div>
                <div className="truncate text-3xl font-extrabold tracking-tight text-foreground drop-shadow-md">{user.seller.storeName}</div>
                {user.seller.about && (
                  <p className="line-clamp-2 mt-2 text-sm font-medium text-muted-foreground/80 leading-relaxed max-w-md">{user.seller.about}</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 shrink-0 w-full lg:w-auto">
              <div className="flex gap-3 w-full sm:w-auto justify-center">
                <Stat
                  icon={StarFill}
                  iconClass="text-amber-400"
                  label={t("profile.ratingStat")}
                  value={user.seller.rating.toFixed(1)}
                />
                <Stat
                  icon={Bag}
                  label={t("profile.salesStat")}
                  value={user.seller.totalSales.toLocaleString()}
                />
              </div>
              
              <Button asChild size="lg" className="w-full sm:w-auto rounded-2xl shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all hover:scale-105 h-16 px-8 text-base">
                <Link to="/sell">
                  <Sliders className="mr-2 size-5" /> {t("profile.openDashboard")}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <BecomeSellerCard onDone={reloadUser} />
        )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-black/30 p-4 transition-all hover:bg-black/50 hover:border-white/10">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("size-4", iconClass)} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground drop-shadow-md">{value}</div>
    </div>
  );
}

function BecomeSellerCard({ onDone }: { onDone: () => Promise<void> }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [storeName, setStoreName] = React.useState("");
  const [about, setAbout] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await becomeSeller({ storeName, about });
      await onDone();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.startSelling")}</CardTitle>
        <CardDescription>{t("profile.startSellingDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Shop className="size-4" /> {t("profile.becomeSeller")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("profile.openStore")}</DialogTitle>
              <DialogDescription>{t("profile.openStoreDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">{t("profile.storeName")}</Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Obsidian Labs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="about">{t("profile.aboutStore")}</Label>
                <Textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={busy || !storeName.trim()}>
                {busy ? <ArrowRepeat className="size-4 animate-spin" /> : null}
                {t("profile.createStore")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
