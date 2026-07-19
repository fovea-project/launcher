// Client-side favorites / wishlist, persisted in localStorage. Same compact
// shape as recently-viewed so the store rail can render covers without refetch.

import type { Product } from "@/types/api";

export interface FavItem {
  id: string;
  name: string;
  kind: string;
  category: string;
  priceCents: number;
  currency: string;
  billingPeriod?: string | null;
}

const KEY = "fovea.favorites";
export const FAVORITES_EVENT = "fovea:favorites";

export function getFavorites(): FavItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function isFavorite(id: string): boolean {
  return getFavorites().some((f) => f.id === id);
}

/** Toggle and return the new state (true = now a favorite). */
export function toggleFavorite(p: Product): boolean {
  const list = getFavorites();
  const exists = list.some((f) => f.id === p.id);
  const next = exists
    ? list.filter((f) => f.id !== p.id)
    : [
        {
          id: p.id,
          name: p.name,
          kind: p.kind,
          category: p.category,
          priceCents: p.priceCents,
          currency: p.currency,
          billingPeriod: p.billingPeriod ?? null,
        },
        ...list,
      ];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(FAVORITES_EVENT));
  } catch {
    /* storage unavailable */
  }
  return !exists;
}
