import * as React from "react";
import { Clipboard, ClipboardCheck } from "react-bootstrap-icons";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn, countLines } from "@/lib/utils";

/**
 * A read-only source viewer with line numbers and a copy button. Used to deliver
 * sold/free code inline. `maxPreviewLines` clips the body and fades the tail —
 * used to tease the code on a product page before it's owned.
 */
export function CodeBlock({
  code,
  language,
  maxPreviewLines,
  className,
}: {
  code: string;
  language?: string | null;
  maxPreviewLines?: number;
  className?: string;
}) {
  const t = useT();
  const [copied, setCopied] = React.useState(false);

  const allLines = code.replace(/\n+$/, "").split("\n");
  const clipped = maxPreviewLines != null && allLines.length > maxPreviewLines;
  const lines = clipped ? allLines.slice(0, maxPreviewLines) : allLines;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-[#0a0a0a]", className)}>
      <div className="flex items-center justify-between border-b bg-card/60 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {language || "text"} · {countLines(code)} {t("code.lines")}
        </span>
        {maxPreviewLines == null && (
          <Button variant="ghost" size="sm" className="-mr-1 h-7" onClick={copy}>
            {copied ? <ClipboardCheck className="size-3.5 text-primary" /> : <Clipboard className="size-3.5" />}
            {copied ? t("common.copied") : t("common.copy")}
          </Button>
        )}
      </div>
      <div className={cn("relative", clipped && "max-h-[260px]")}>
        <pre className="overflow-x-auto px-3 py-3 text-xs leading-relaxed">
          <code className="font-mono text-foreground/90">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[2.2rem_1fr] gap-3">
                <span className="select-none text-right text-muted-foreground/40">{i + 1}</span>
                <span className="whitespace-pre">{line || " "}</span>
              </div>
            ))}
          </code>
        </pre>
        {clipped && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-[#0a0a0a] to-transparent">
            <span className="mb-2 text-[11px] text-muted-foreground">
              {t("code.previewMore", { n: allLines.length - lines.length })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
