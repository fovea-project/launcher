import * as React from "react";
import {
  Clipboard,
  ClipboardCheck,
  KeyFill,
  PersonFill,
  Link45deg,
  FileEarmarkZip,
  CodeSlash,
  ChatDots,
} from "react-bootstrap-icons";
import type { DigitalDelivery } from "@/types/api";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  license_key: KeyFill,
  account: PersonFill,
  link: Link45deg,
  file: FileEarmarkZip,
  code: CodeSlash,
  contact: ChatDots,
  stock: PersonFill,
};

export function DeliveryBox({
  delivery,
  className,
  onContact,
}: {
  delivery: DigitalDelivery;
  className?: string;
  /** Invoked for `contact` delivery to open a chat with the seller. */
  onContact?: () => void;
}) {
  const t = useT();
  const [copied, setCopied] = React.useState(false);
  const Icon = ICONS[delivery.deliveryType] ?? KeyFill;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(delivery.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const header = (
    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
      <Icon className="size-4 text-primary" /> {t(`delivery.${delivery.deliveryType}`)}
    </div>
  );

  // Contact: no payload — just a button to message the seller.
  if (delivery.deliveryType === "contact") {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        {header}
        {delivery.instructions && (
          <p className="mb-3 text-xs text-muted-foreground">{delivery.instructions}</p>
        )}
        <Button size="sm" onClick={onContact}>
          <ChatDots className="size-4" /> {t("delivery.contactSeller")}
        </Button>
      </div>
    );
  }

  // Stock (accounts): one copyable credential line per unit the buyer owns.
  if (delivery.deliveryType === "stock") {
    const items = delivery.items && delivery.items.length > 0 ? delivery.items : [delivery.content];
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        {header}
        <div className="space-y-2">
          {items.map((item, i) => (
            <StockLine key={i} value={item} />
          ))}
        </div>
        {delivery.instructions && (
          <p className="mt-2 text-xs text-muted-foreground">{delivery.instructions}</p>
        )}
      </div>
    );
  }

  // Inline code: render in a syntax-style block.
  if (delivery.deliveryType === "code") {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        {header}
        <CodeBlock code={delivery.content} language={delivery.language} />
        {delivery.instructions && (
          <p className="mt-2 text-xs text-muted-foreground">{delivery.instructions}</p>
        )}
      </div>
    );
  }

  // Key / account / link / file: single-line secret with copy.
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      {header}
      <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
        <code className="min-w-0 flex-1 break-all text-sm">{delivery.content}</code>
        <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
          {copied ? <ClipboardCheck className="size-4 text-primary" /> : <Clipboard className="size-4" />}
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
      </div>
      {delivery.instructions && (
        <p className="mt-2 text-xs text-muted-foreground">{delivery.instructions}</p>
      )}
    </div>
  );
}

/** A single copyable credential line for stock (account) deliveries. */
function StockLine({ value }: { value: string }) {
  const t = useT();
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
      <code className="min-w-0 flex-1 break-all text-sm">{value}</code>
      <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
        {copied ? <ClipboardCheck className="size-4 text-primary" /> : <Clipboard className="size-4" />}
        {copied ? t("common.copied") : t("common.copy")}
      </Button>
    </div>
  );
}
