import * as React from "react";
import {
  ArrowRepeat,
  BoxSeam,
  CodeSlash,
  Film,
  Lightning,
  ShieldLock,
  Tools,
} from "react-bootstrap-icons";
import { cn } from "@/lib/utils";

type CoverProduct = { id: string; kind: string; category: string };

// Themed cover used when a listing has no real artwork: a category-tinted
// gradient + a category/kind glyph. Replaces the old single-letter placeholder.

const CAT_HUE: Record<string, number> = {
  tools: 205,
  security: 265,
  development: 150,
  productivity: 35,
  media: 330,
  other: 200,
};

const CAT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  tools: Tools,
  security: ShieldLock,
  development: CodeSlash,
  productivity: Lightning,
  media: Film,
  other: BoxSeam,
};

function pickIcon(p: CoverProduct) {
  if (p.kind === "subscription") return ArrowRepeat;
  if (p.kind === "code" || p.kind === "free_code") return CodeSlash;
  return CAT_ICON[p.category] ?? BoxSeam;
}

function pickHue(p: Pick<CoverProduct, "id" | "category">) {
  const base = CAT_HUE[p.category] ?? 200;
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (base + ((h % 40) - 20) + 360) % 360;
}

export function ProductCover({
  product,
  className,
  iconClassName,
  align = "center",
  circle = true,
}: {
  product: CoverProduct;
  className?: string;
  iconClassName?: string;
  align?: "center" | "right";
  circle?: boolean;
}) {
  const Icon = pickIcon(product);
  const hue = pickHue(product);
  const grad = `linear-gradient(135deg, hsl(${hue} 52% 24%), hsl(${(hue + 40) % 360} 56% 12%))`;

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ backgroundImage: grad }}>
      {circle && align === "center" && (
        <div
          className="absolute left-1/2 top-1/2 size-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `hsla(${hue}, 85%, 65%, 0.16)` }}
        />
      )}
      <Icon
        className={cn(
          "absolute",
          align === "center"
            ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/85"
            : "-right-[2%] top-1/2 -translate-y-1/2 text-white/10",
          iconClassName,
        )}
      />
    </div>
  );
}
