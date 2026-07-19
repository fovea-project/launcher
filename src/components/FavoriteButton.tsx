import * as React from "react";
import { Heart, HeartFill } from "react-bootstrap-icons";
import type { Product } from "@/types/api";
import { FAVORITES_EVENT, isFavorite, toggleFavorite } from "@/lib/favorites";
import { cn } from "@/lib/utils";

/** Heart toggle. Caller styles the wrapper via `className`; the filled state
 * uses the brand accent. Safe to place inside a Link (stops navigation). */
export function FavoriteButton({ product, className }: { product: Product; className?: string }) {
  const [fav, setFav] = React.useState(() => isFavorite(product.id));

  React.useEffect(() => {
    const sync = () => setFav(isFavorite(product.id));
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_EVENT, sync);
  }, [product.id]);

  return (
    <button
      type="button"
      aria-label="Favorite"
      aria-pressed={fav}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product);
      }}
      className={cn("transition-colors", className)}
    >
      {fav ? <HeartFill className="size-4 text-primary" /> : <Heart className="size-4" />}
    </button>
  );
}
