import type { ProductStatus } from "@/types/api";
import { useT } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<ProductStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-amber-500/15 text-amber-400",
  approved: "bg-lime/20 text-lime",
  rejected: "bg-destructive/15 text-destructive",
  suspended: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  const t = useT();
  return (
    <Badge className={cn("rounded-lg border-transparent", STYLES[status], className)}>
      {t(`status.${status}`)}
    </Badge>
  );
}
