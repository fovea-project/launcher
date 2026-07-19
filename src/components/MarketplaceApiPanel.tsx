import * as React from "react";
import { ArrowRepeat, Clipboard, ClipboardCheck, CheckCircleFill, XCircleFill } from "react-bootstrap-icons";
import type { MarketplaceSettings } from "@/types/api";
import { marketplaceSettings, regenerateApiKey, setWebhook, testWebhook } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Seller marketplace API: API key (for polling /api/seller/sales over HTTPS)
 *  + an optional outbound webhook the server POSTs on each sale. */
export function MarketplaceApiPanel() {
  const t = useT();
  const [s, setS] = React.useState<MarketplaceSettings | null>(null);
  const [webhook, setWebhookInput] = React.useState("");
  const [busy, setBusy] = React.useState<null | "load" | "regen" | "save" | "test">("load");
  const [copied, setCopied] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [test, setTest] = React.useState<{ ok: boolean; status: number } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await marketplaceSettings();
        setS(r);
        setWebhookInput(r.webhookUrl);
      } finally {
        setBusy(null);
      }
    })();
  }, []);

  const copyKey = async () => {
    if (!s) return;
    try {
      await navigator.clipboard.writeText(s.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const regen = async () => {
    setBusy("regen");
    try {
      const r = await regenerateApiKey();
      setS((prev) => (prev ? { ...prev, apiKey: r.apiKey } : r));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    setSaved(false);
    setTest(null);
    try {
      const r = await setWebhook(webhook.trim());
      setS((prev) => (prev ? { ...prev, webhookUrl: r.webhookUrl } : prev));
      setWebhookInput(r.webhookUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setBusy(null);
    }
  };

  const runTest = async () => {
    setBusy("test");
    setTest(null);
    try {
      const r = await testWebhook();
      setTest(r);
    } catch {
      setTest({ ok: false, status: 0 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("marketplace.title")}</CardTitle>
        <CardDescription>{t("marketplace.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* API key */}
        <div className="space-y-2">
          <Label>{t("marketplace.apiKey")}</Label>
          <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
            <code className="min-w-0 flex-1 break-all font-mono text-sm">
              {s ? s.apiKey : "…"}
            </code>
            <Button variant="outline" size="sm" onClick={copyKey} className="shrink-0" disabled={!s}>
              {copied ? <ClipboardCheck className="size-4 text-primary" /> : <Clipboard className="size-4" />}
              {copied ? t("common.copied") : t("common.copy")}
            </Button>
            <Button variant="ghost" size="sm" onClick={regen} className="shrink-0" disabled={busy === "regen"}>
              {busy === "regen" ? <ArrowRepeat className="size-4 animate-spin" /> : t("marketplace.regen")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("marketplace.apiKeyHint")}</p>
        </div>

        {/* Webhook */}
        <div className="space-y-2">
          <Label htmlFor="webhook">{t("marketplace.webhook")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="webhook"
              value={webhook}
              onChange={(e) => setWebhookInput(e.target.value)}
              placeholder="https://your-bot.example.com/hook"
              spellCheck={false}
            />
            <Button size="sm" onClick={save} className="shrink-0" disabled={busy === "save"}>
              {busy === "save" ? <ArrowRepeat className="size-4 animate-spin" /> : saved ? t("common.saved") : t("common.save")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runTest}
              className="shrink-0"
              disabled={busy === "test" || !s?.webhookUrl}
            >
              {busy === "test" ? <ArrowRepeat className="size-4 animate-spin" /> : t("marketplace.test")}
            </Button>
          </div>
          {test && (
            <p className={cnTest(test.ok)}>
              {test.ok ? <CheckCircleFill className="size-3.5" /> : <XCircleFill className="size-3.5" />}
              {test.ok ? t("marketplace.testOk", { status: test.status }) : t("marketplace.testFail", { status: test.status || "—" })}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t("marketplace.webhookHint")}</p>
        </div>

        {/* Docs */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-foreground">{t("marketplace.pollTitle")}</p>
          <pre className="overflow-x-auto whitespace-pre rounded-md bg-background p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">{`GET https://<host>/api/seller/sales-feed?since=0&limit=50
X-Api-Key: ${s ? s.apiKey : "<your-key>"}

→ { "cursor": 42, "sales": [ { saleId, seq,
     productName, kind, amountCents, currency,
     buyer, unitSecret, soldAt } ] }`}</pre>
          <p className="mt-2 text-xs text-muted-foreground">{t("marketplace.pollHint")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function cnTest(ok: boolean): string {
  return `flex items-center gap-1.5 text-xs ${ok ? "text-primary" : "text-destructive"}`;
}
