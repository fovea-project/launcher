import * as React from "react";
import { ArrowRepeat, Star, StarFill } from "react-bootstrap-icons";
import type { Review } from "@/types/api";
import { addReview, getReviews } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function Reviews({
  productId,
  canReview,
  onChanged,
}: {
  productId: string;
  canReview: boolean;
  onChanged?: () => void;
}) {
  const t = useT();
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    setLoading(true);
    getReviews(productId)
      .then(setReviews)
      .finally(() => setLoading(false));
  }, [productId]);

  React.useEffect(() => load(), [load]);

  const mine = reviews.find((r) => r.mine);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <ArrowRepeat className="mx-auto size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 rounded-lg border border-border bg-card p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="text-center sm:border-r sm:border-border sm:pr-6">
          <div className="text-5xl font-bold tabular-nums">{avg.toFixed(1)}</div>
          <Stars value={Math.round(avg)} className="mt-1 justify-center" />
          <div className="mt-1 text-xs text-muted-foreground">{t("reviews.count", { n: reviews.length })}</div>
        </div>
        <div className="space-y-1.5">
          {dist.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 text-muted-foreground">{star}</span>
              <StarFill className="size-3 text-amber-400" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }}
                />
              </div>
              <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {canReview ? (
        <ReviewForm
          productId={productId}
          existing={mine}
          onSaved={() => {
            load();
            onChanged?.();
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("reviews.ownToReview")}</p>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="border-t pt-4">
            <div className="flex items-center gap-3">
              <Avatar name={r.authorName} className="size-8" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.authorName}</span>
                  {r.mine && <span className="text-xs text-primary">(you)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} className="text-amber-400" />
                  <span className="text-xs text-muted-foreground">{r.createdAt}</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{r.body}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("reviews.none")}</p>
        )}
      </div>
    </div>
  );
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) =>
        i <= value ? (
          <StarFill key={i} className="size-3.5 text-amber-400" />
        ) : (
          <Star key={i} className="size-3.5 text-muted-foreground/50" />
        ),
      )}
    </div>
  );
}

function ReviewForm({
  productId,
  existing,
  onSaved,
}: {
  productId: string;
  existing?: Review;
  onSaved: () => void;
}) {
  const t = useT();
  const [rating, setRating] = React.useState(existing?.rating ?? 0);
  const [hover, setHover] = React.useState(0);
  const [body, setBody] = React.useState(existing?.body ?? "");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setRating(existing?.rating ?? 0);
    setBody(existing?.body ?? "");
  }, [existing]);

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    try {
      await addReview(productId, { rating, body: body.trim() });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;

  return (
    <div className="border bg-card p-4">
      <div className="mb-2 text-sm font-medium">{existing ? t("reviews.edit") : t("reviews.write")}</div>
      <div className="mb-3 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onMouseEnter={() => setHover(i)} onClick={() => setRating(i)}>
            {i <= shown ? (
              <StarFill className="size-6 text-amber-400" />
            ) : (
              <Star className="size-6 text-muted-foreground/50" />
            )}
          </button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("reviews.placeholder")}
        className="mb-3"
      />
      <Button onClick={submit} disabled={busy || !rating}>
        {busy ? <ArrowRepeat className="size-4 animate-spin" /> : null}
        {existing ? t("reviews.update") : t("reviews.submit")}
      </Button>
    </div>
  );
}
