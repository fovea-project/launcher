import * as React from "react";
import { getImage } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Resolve an image reference (stored filename or data: URI) to a renderable
 * src. Returns `undefined` until loaded. Fetches lazily via the core over HTTPS. */
export function useRemoteImage(ref?: string | null): string | undefined {
  const [src, setSrc] = React.useState<string | undefined>(() =>
    ref && ref.startsWith("data:") ? ref : undefined,
  );

  React.useEffect(() => {
    if (!ref) {
      setSrc(undefined);
      return;
    }
    if (ref.startsWith("data:")) {
      setSrc(ref);
      return;
    }
    let alive = true;
    setSrc(undefined);
    getImage(ref)
      .then((s) => alive && setSrc(s || undefined))
      .catch(() => alive && setSrc(undefined));
    return () => {
      alive = false;
    };
  }, [ref]);

  return src;
}

/** An <img> whose `src` is an image reference resolved through the core. While
 * loading (or if the ref is empty/failed) it renders `fallback`, else a muted
 * placeholder box, so layout never jumps. */
export function AsyncImage({
  src: ref,
  alt = "",
  className,
  fallback,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const src = useRemoteImage(ref);
  if (!src) {
    return <>{fallback ?? <div className={cn("bg-muted", className)} />}</>;
  }
  return <img src={src} alt={alt} className={className} />;
}
