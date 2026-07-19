// Lightweight "recently viewed products" list, persisted in localStorage.
// Stored compactly (enough to render a cover + name + price) so the store rail
// can show history without re-fetching. Updated from the product page.

import type { Product } from "@/types/api";

export interface RecentItem {
  id: string;
  name: string;
  kind: string;
  category: string;
  priceCents: number;
  currency: string;
  billingPeriod?: string | null;
}

const KEY = "fovea.recent";
const MAX = 12;
/** Fired whenever the list changes so open views can refresh live. */
export const RECENT_EVENT = "fovea:recent";

export function getRecent(): RecentItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function pushRecent(p: Product): void {
  const item: RecentItem = {
    id: p.id,
    name: p.name,
    kind: p.kind,
    category: p.category,
    priceCents: p.priceCents,
    currency: p.currency,
    billingPeriod: p.billingPeriod ?? null,
  };
  const list = [item, ...getRecent().filter((r) => r.id !== p.id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {
    /* storage unavailable */
  }
}
