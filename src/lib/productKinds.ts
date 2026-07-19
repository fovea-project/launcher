// Central definition of product kinds and how each one is acquired and delivered.
// The store, product page, and seller editor all derive their behaviour from here
// so a new kind only has to be described in one place.

import type { DeliveryKind, ProductKind } from "@/types/api";

/** All sellable kinds, in catalog/editor display order. */
export const PRODUCT_KINDS: ProductKind[] = [
  "program",
  "checker",
  "private_software",
  "code",
  "free_code",
  "subscription",
  "game_account",
  "social_account",
  "service",
];

/** Kinds sold from a pool of interchangeable credential units (stock). */
export const ACCOUNT_KINDS: ProductKind[] = ["game_account", "social_account"];

/** Whether a kind is delivered from seller-loaded stock inventory. */
export function isStockKind(kind: ProductKind): boolean {
  return kind === "game_account" || kind === "social_account";
}

/**
 * Hard cap on inline code delivery. Anything longer must ship as a downloadable
 * archive instead — pasting tens of thousands of lines into a chat message would
 * choke the messenger and the relay.
 */
export const MAX_INLINE_CODE_LINES = 2000;

/** Bucket a kind into one of three post-purchase behaviours. */
export type KindBehavior = "download" | "code" | "subscription";

export function kindBehavior(kind: ProductKind): KindBehavior {
  if (kind === "subscription") return "subscription";
  if (kind === "code" || kind === "free_code") return "code";
  if (isStockKind(kind) || kind === "service") return "code"; // credential/text delivery
  return "download"; // program, checker, private_software
}

/** Kinds that are always free regardless of the entered price. */
export function isAlwaysFree(kind: ProductKind): boolean {
  return kind === "free_code";
}

/** Whether the kind ships a downloadable binary/archive by default. */
export function isDownloadable(kind: ProductKind): boolean {
  return kind === "program" || kind === "checker" || kind === "private_software";
}

/** Which delivery methods a seller may pick for a given kind (first = default). */
export function deliveryOptionsForKind(kind: ProductKind): DeliveryKind[] {
  switch (kind) {
    case "program":
    case "checker":
      return ["file", "link"];
    case "private_software":
      return ["license_key", "file", "account"];
    case "code":
    case "free_code":
      return ["code", "file"];
    case "subscription":
      return ["code", "contact", "account", "license_key"];
    case "game_account":
    case "social_account":
      return ["stock"];
    case "service":
      return ["contact"];
  }
}

/** The default delivery method for a freshly-selected kind. */
export function defaultDeliveryForKind(kind: ProductKind): DeliveryKind {
  return deliveryOptionsForKind(kind)[0];
}

/** Whether a kind needs the inline-code editor (paste source + language). */
export function usesInlineCode(kind: ProductKind, delivery: DeliveryKind | null | undefined): boolean {
  return (kind === "code" || kind === "free_code") && delivery === "code";
}
