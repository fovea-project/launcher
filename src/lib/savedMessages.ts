// "Saved Messages" — a personal self-chat (notes/links), like Telegram.
// Kept client-side in localStorage so it works without a backend conversation.

import type { Message } from "@/types/api";

export const SAVED_ID = "saved";
export const SAVED_EVENT = "fovea:saved";

const KEY = "fovea.saved";

interface SavedRaw {
  id: string;
  body: string;
  sentAt: string;
}

function read(): SavedRaw[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function toMessage(m: SavedRaw): Message {
  return { id: m.id, conversationId: SAVED_ID, senderId: SAVED_ID, body: m.body, sentAt: m.sentAt, mine: true };
}

export function getSavedMessages(): Message[] {
  return read().map(toMessage);
}

export function lastSaved(): Message | null {
  const list = read();
  return list.length ? toMessage(list[list.length - 1]) : null;
}

export function addSavedMessage(body: string): Message {
  const m: SavedRaw = {
    id: `sv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    body,
    sentAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([...read(), m]));
    window.dispatchEvent(new Event(SAVED_EVENT));
  } catch {
    /* storage unavailable */
  }
  return toMessage(m);
}
