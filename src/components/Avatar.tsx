import { cn } from "@/lib/utils";
import { useRemoteImage } from "@/components/AsyncImage";

/** Square avatar showing initials (or an image when provided). `src` may be a
 * stored image filename (fetched over HTTPS) or a data: URI. */
export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const resolved = useRemoteImage(src);
  const initials = name
    .split(/[\s_@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary text-xs font-semibold text-secondary-foreground",
        className,
      )}
      title={name}
    >
      {resolved ? (
        <img src={resolved} alt="" className="size-full object-cover" />
      ) : (
        <span>{initials || "?"}</span>
      )}
    </div>
  );
}
