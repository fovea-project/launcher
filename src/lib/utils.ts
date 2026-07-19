import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a byte count as a human-readable string. */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Format a price given in integer cents. Free when zero. */
export function formatPrice(cents: number, currency = "USD"): string {
  if (cents === 0) return "Free";
  return formatMoney(cents, currency);
}

/** Format a monetary amount in integer cents, always showing the currency. */
export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** Price label for a listing, appending the billing period for subscriptions.
 * When the listing has multiple pricing plans, shows a range (e.g. "$10 – $60"). */
export function formatListingPrice(p: {
  priceCents: number;
  currency: string;
  kind?: string;
  billingPeriod?: string | null;
  plans?: { priceCents: number }[];
}): string {
  if (p.kind === "free_code") return formatPrice(0);
  const per = p.kind === "subscription" ? (p.billingPeriod === "yearly" ? "/yr" : "/mo") : "";
  if (p.plans && p.plans.length > 0) {
    const prices = p.plans.map((pl) => pl.priceCents);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min !== max) {
      return `${formatMoney(min, p.currency)} – ${formatMoney(max, p.currency)}${per}`;
    }
    return `${formatMoney(min, p.currency)}${per}`;
  }
  if (p.kind === "subscription") return `${formatMoney(p.priceCents, p.currency)}${per}`;
  return formatPrice(p.priceCents, p.currency);
}

/** Localized relative time, e.g. "5 minutes ago" / "5 минут назад". */
export function relativeTime(iso: string, lang: string): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const diff = (Date.parse(iso) - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, secs] of units) {
    if (abs >= secs || unit === "second") return rtf.format(Math.round(diff / secs), unit);
  }
  return "";
}

/** Count the lines in a block of text (used to enforce the inline-code limit). */
export function countLines(text: string): number {
  if (!text) return 0;
  return text.replace(/\n+$/, "").split("\n").length;
}
