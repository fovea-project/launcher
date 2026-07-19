import * as React from "react";

/**
 * Animated ASCII field reminiscent of verteal.com — drifting "continents" of
 * shimmering glyphs (+ * percent hash) over black. Rendered into a single
 * <pre> updated in a rAF loop (no React re-renders), capped at a low FPS to
 * stay light. Honors prefers-reduced-motion by freezing the field.
 */
export function AsciiBackground({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const preRef = React.useRef<HTMLPreElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    const pre = preRef.current;
    if (!container || !pre) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const GLYPHS = "+*%#";
    const CHAR_W = 8;
    const CHAR_H = 14;

    let cols = 0;
    let rows = 0;
    const resize = () => {
      cols = Math.max(1, Math.ceil(container.clientWidth / CHAR_W));
      rows = Math.max(1, Math.ceil(container.clientHeight / CHAR_H));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Low-frequency field → blobby "landmasses".
    const land = (x: number, y: number, t: number) =>
      Math.sin(x * 0.07 + Math.cos(y * 0.05) * 1.5) *
        Math.cos(y * 0.06 - Math.sin(x * 0.045) * 1.5) +
      Math.sin((x * 0.03 + y * 0.04) + t * 0.06) * 0.6;

    // Higher-frequency field → per-cell shimmer that picks the glyph.
    const shimmer = (x: number, y: number, t: number) =>
      (Math.sin(x * 0.3 + t * 1.3) * Math.cos(y * 0.34 - t * 0.9) +
        Math.sin((x + y) * 0.18 + t * 0.7)) /
      2;

    const FPS = 18;
    const frameMs = 1000 / FPS;
    const start = performance.now();
    let last = 0;
    let raf = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < frameMs) return;
      last = now;
      const t = reduce ? 0 : (now - start) / 1000;

      let out = "";
      for (let y = 0; y < rows; y++) {
        let line = "";
        for (let x = 0; x < cols; x++) {
          if (land(x, y, t) > 0.35) {
            const v = (shimmer(x, y, t) + 1) / 2; // 0..1
            if (v > 0.42) {
              const idx = Math.min(GLYPHS.length - 1, Math.floor(((v - 0.42) / 0.58) * GLYPHS.length));
              line += GLYPHS[idx];
            } else {
              line += " ";
            }
          } else {
            // sparse "ocean" speckle
            const o = (shimmer(x * 1.7 + 91, y * 1.3 + 37, t * 0.5) + 1) / 2;
            line += o > 0.95 ? "." : " ";
          }
        }
        out += line + "\n";
      }
      pre.textContent = out;
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={className} aria-hidden="true">
      <pre
        ref={preRef}
        className="m-0 select-none overflow-hidden whitespace-pre font-mono text-[12px] leading-[14px] tracking-tight text-white/[0.14]"
      />
    </div>
  );
}
