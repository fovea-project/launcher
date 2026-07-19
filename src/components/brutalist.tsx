import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Soft launcher rounding. (Kept under the old name so existing call sites work;
 * the design moved from notched corners to calm rounded surfaces.)
 */
export const CUT = "rounded-lg";

/** Calm section eyebrow — a small accent label above a heading. */
export function MonoTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-semibold uppercase tracking-wider text-primary/80",
        className,
      )}
    >
      {children}
    </span>
  );
}
