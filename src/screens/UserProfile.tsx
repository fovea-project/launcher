import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRepeat, ChatDots, Shop } from "react-bootstrap-icons";
import type { PublicUser } from "@/types/api";
import { getUser, startConversation } from "@/lib/api";
import { useApp } from "@/store/app-context";
import { useT } from "@/lib/i18n";
import { AsciiBackground } from "@/components/AsciiBackground";
import { Avatar } from "@/components/Avatar";
import { AsyncImage } from "@/components/AsyncImage";
import { RoleBadge } from "@/components/RoleBadge";
import { Button } from "@/components/ui/button";

export function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const { user: me } = useApp();
  const [u, setU] = React.useState<PublicUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    getUser(id)
      .then(setU)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const message = async () => {
    if (!u) return;
    const conv = await startConversation(u.id);
    navigate(`/messages/${conv.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <ArrowRepeat className="mr-2 size-5 animate-spin" /> {t("common.loading")}
      </div>
    );
  }
  if (error || !u) {
    return <div className="p-8 text-center text-destructive">{t("userProfile.notFound")}</div>;
  }

  const isMe = me?.id === u.id;

  return (
    <div className="relative min-h-full w-full">
      <AsciiBackground className="pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_top,transparent_10%,black_80%)]" />
      {/* page background wallpaper */}
      {u.backgroundImage && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <AsyncImage src={u.backgroundImage} className="size-full object-cover" />
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[10px]" />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-4xl px-8 py-8 animate-in fade-in duration-700 zoom-in-95">
        <Button variant="ghost" size="sm" className="mb-5 -ml-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-2" /> {t("common.back")}
        </Button>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          {/* banner */}
          <div className="relative h-48 bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/20">
            {u.bannerImage && <AsyncImage src={u.bannerImage} className="size-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>

          <div className="px-8 pb-8">
            <div className="-mt-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
              <Avatar
                name={u.displayName}
                src={u.avatarUrl}
                className="size-32 rounded-full text-4xl ring-[6px] ring-black/40 shadow-[0_0_30px_rgba(var(--primary),0.6)] shrink-0"
              />
              {!isMe && (
                <div className="flex flex-wrap gap-3 pb-2">
                  <Button variant="outline" className="rounded-xl border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-white/20 hover:scale-105" onClick={message}>
                    <ChatDots className="mr-2 size-4" /> {t("userProfile.message")}
                  </Button>
                  {u.isSeller && (
                    <Button asChild className="rounded-xl shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all hover:scale-105">
                      <Link to={`/sellers/${u.id}`}>
                        <Shop className="mr-2 size-4" /> {t("userProfile.viewStore")}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6">
              <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight drop-shadow-md">
                <span className="truncate text-foreground">{u.displayName}</span>
                <RoleBadge role={u.role} className="[&_svg]:size-5 scale-110 ml-1" />
              </h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground/80">
                {t("userProfile.joined", { date: u.createdAt })}
              </p>
            </div>

            {u.bio && (
              <div className="mt-8 rounded-2xl border border-white/5 bg-black/20 p-6 shadow-inner">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  {t("userProfile.about")}
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 font-medium">{u.bio}</p>
              </div>
            )}

            {u.isSeller && u.seller && (
              <Link
                to={`/sellers/${u.id}`}
                className="group mt-8 flex flex-col sm:flex-row items-center gap-6 rounded-3xl border border-white/5 bg-black/30 p-6 transition-all hover:bg-black/50 hover:border-white/20 relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-primary/10 to-transparent blur-3xl pointer-events-none transition-all group-hover:from-primary/20" />
                
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)] group-hover:scale-105 transition-transform z-10">
                  <Shop className="size-7 drop-shadow-md" />
                </div>
                
                <div className="min-w-0 flex-1 z-10 text-center sm:text-left">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Visit Storefront</div>
                  <div className="truncate text-2xl font-extrabold tracking-tight text-foreground drop-shadow-md">{u.seller.storeName}</div>
                  <div className="mt-1 truncate text-sm font-medium text-muted-foreground/80">
                    {t("userProfile.storeMeta", { count: u.seller.productCount })}
                  </div>
                </div>
                
                <div className="z-10 hidden sm:flex h-10 px-6 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                  Open Store
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
