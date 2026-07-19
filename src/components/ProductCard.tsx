import { Link } from "react-router-dom";
import { StarFill, Check2 } from "react-bootstrap-icons";
import type { Product } from "@/types/api";
import { useT } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { ProductCover } from "@/components/ProductCover";
import { AsyncImage } from "@/components/AsyncImage";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatListingPrice } from "@/lib/utils";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const t = useT();
  return (
    <Link
      to={`/product/${product.id}`}
      style={{ animationDelay: `${Math.min(index, 16) * 45}ms`, animationDuration: "480ms" }}
      className="flex flex-col overflow-hidden rounded-lg bg-card animate-in fade-in slide-in-from-bottom-3 fill-mode-both motion-reduce:animate-none"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {product.coverImage || (product.screenshots && product.screenshots.length > 0) ? (
          <AsyncImage
            src={product.coverImage || product.screenshots[0]}
            className="size-full object-cover"
            fallback={<ProductCover product={product} className="size-full" iconClassName="size-12" />}
          />
        ) : (
          <ProductCover product={product} className="size-full" iconClassName="size-12" />
        )}
        <FavoriteButton
          product={product}
          className="absolute left-2.5 top-2.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
        />
        {product.owned && (
          <Badge className="absolute right-2.5 top-2.5 gap-1 rounded-full bg-lime px-2.5 text-lime-foreground">
            <Check2 className="size-3" /> {t("catalog.owned")}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate rounded-full bg-secondary px-2 py-0.5 font-medium">
            {t(`kindLabel.${product.kind}`)}
          </span>
        </div>
        <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold leading-tight tracking-tight">{product.name}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{product.tagline}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-semibold text-primary">{formatListingPrice(product)}</span>
          {product.ratingCount > 0 ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <StarFill className="size-3 text-amber-400" />
              {product.rating.toFixed(1)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t("catalog.new")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
