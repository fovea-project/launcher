import * as React from "react";
import { ChevronLeft, ChevronRight, XLg } from "react-bootstrap-icons";
import { useRemoteImage } from "@/components/AsyncImage";

/** Fullscreen image viewer with keyboard + click navigation. */
export function Lightbox({
  images,
  index,
  onClose,
}: {
  images: string[];
  index: number;
  onClose: () => void;
}) {
  const [i, setI] = React.useState(index);
  const n = images.length;
  const src = useRemoteImage(images[i]);

  React.useEffect(() => setI(index), [index]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setI((p) => (p - 1 + n) % n);
      if (e.key === "ArrowRight") setI((p) => (p + 1) % n);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [n, onClose]);

  if (n === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <XLg className="size-5" />
      </button>

      {src && (
        <img
          src={src}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
        />
      )}

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              setI((p) => (p - 1 + n) % n);
            }}
            className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              setI((p) => (p + 1) % n);
            }}
            className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {i + 1} / {n}
          </div>
        </>
      )}
    </div>
  );
}
