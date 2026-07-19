// The single boundary between React and the outside world.
//
// In a real build, every function here calls a Tauri command (`invoke`) that runs
// in the Rust core, which performs the actual network I/O over HTTPS. The webview
// itself performs NO network requests — there is intentionally no fetch/axios here.
//
// When the app is opened in a plain browser (no Tauri runtime, e.g. `npm run dev`),
// we transparently fall back to a stateful mock so the UI is developable standalone.

import type {
  AppNotification,
  AuthSession,
  BanInput,
  ChatCheck,
  Conversation,
  CryptoAsset,
  DepositIntent,
  DepositMethod,
  Withdrawal,
  WithdrawMethod,
  DigitalDelivery,
  InventorySummary,
  InventoryUploadResult,
  MarketplaceSettings,
  SalesPage,
  WebhookTestResult,
  DownloadBundle,
  ChatInput,
  ChatMessage,
  ChatTopic,
  ChatTopicDetail,
  ChatTopicPost,
  TopicInput,
  LibraryItem,
  ManagedUser,
  Message,
  NewsPost,
  NewsComment,
  NewsPostInput,
  Product,
  ProductInput,
  ProfileInput,
  Review,
  ReviewInput,
  SellerInput,
  PublicUser,
  SalesPoint,
  SellerStore,
  Subscription,
  ConnectionStatus,
  Transaction,
  User,
  Wallet,
} from "@/types/api";
import { mockBootstrapSequence } from "@/lib/mock";
import { defaultDeliveryForKind } from "@/lib/productKinds";
import * as store from "@/lib/mockStore";

/** True when running inside the Tauri webview (the Rust core is reachable). */
export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// The live backend still emits the original product kinds. Map them onto the
// current taxonomy so labels, filters, and the per-kind product page all work
// without a backend redeploy.
const KIND_ALIAS: Record<string, Product["kind"]> = {
  software: "program",
  digital_good: "private_software",
};

function normProduct(p: Product): Product {
  const kind = (KIND_ALIAS[p.kind] ?? p.kind) as Product["kind"];
  if (kind === p.kind && p.deliveryType) return p;
  return { ...p, kind, deliveryType: p.deliveryType ?? defaultDeliveryForKind(kind) };
}

// Global handler fired when the core reports an expired/invalid session (a 401
// surfaces from Rust as "not authenticated"). Lets the app drop a dead session
// and return to login instead of getting stuck with a blank, un-loggable-out UI.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

/** Commands where a 401 is expected/handled locally and must NOT trigger a
 *  global logout (login attempts, session probe, explicit logout). */
const AUTH_EXEMPT = new Set(["login", "logout", "current_session"]);

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    const msg = String((e as { message?: string })?.message ?? e ?? "");
    if (!AUTH_EXEMPT.has(cmd) && /not authenticated|unauthorized|\b401\b/i.test(msg)) {
      onUnauthorized?.();
    }
    throw e;
  }
}

type UnlistenFn = () => void;

async function listen<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
  const { listen } = await import("@tauri-apps/api/event");
  return listen<T>(event, (e) => handler(e.payload));
}

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

export async function connectionStatus(): Promise<ConnectionStatus> {
  if (!isTauri()) {
    return { phase: "ready", progress: 1, message: "Mock mode (browser)" };
  }
  return invoke<ConnectionStatus>("connection_status");
}

export async function onConnectionStatus(
  handler: (status: ConnectionStatus) => void,
): Promise<UnlistenFn> {
  if (!isTauri()) {
    let cancelled = false;
    const seq = mockBootstrapSequence();
    (async () => {
      for (const s of seq) {
        if (cancelled) return;
        await delay(650);
        if (!cancelled) handler(s);
      }
    })();
    return () => {
      cancelled = true;
    };
  }
  return listen<ConnectionStatus>("conn://status", handler);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(username: string, password: string): Promise<AuthSession> {
  if (!isTauri()) {
    await delay(400);
    if (!username || !password) throw apiError("invalid_credentials", "Username and password required");
    const ban = store.mockCheckBan(username);
    if (ban) {
      throw Object.assign(new Error(ban.banReason), { code: "banned", bannedUntil: ban.bannedUntil });
    }
    store.mockGetProfile(username);
    return { jwt: "mock.jwt.token", username, expiresAt: Date.now() / 1000 + 3600 };
  }
  return invoke<AuthSession>("login", { username, password });
}

/** Recover an account with its seed phrase: sets a new password and logs in. */
export async function recover(username: string, seedPhrase: string, newPassword: string): Promise<AuthSession> {
  if (!isTauri()) {
    await delay(400);
    return { jwt: "mock.jwt.token", username, expiresAt: Date.now() / 1000 + 3600 };
  }
  return invoke<AuthSession>("recover", { username, seedPhrase, newPassword });
}

export async function logout(): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("logout");
}

export async function currentSession(): Promise<AuthSession | null> {
  if (!isTauri()) return null;
  return invoke<AuthSession | null>("current_session");
}

// ---------------------------------------------------------------------------
// Profile & seller account
// ---------------------------------------------------------------------------

export async function getProfile(): Promise<User> {
  if (!isTauri()) return mock(() => store.mockGetProfile());
  return invoke<User>("get_profile");
}

export async function updateProfile(input: ProfileInput): Promise<User> {
  if (!isTauri()) return mock(() => store.mockUpdateProfile(input));
  return invoke<User>("update_profile", { input });
}


/**
 * Change the display name. The first change is free; subsequent changes cost
 * `user.nameChangeFeeCents`, debited from the wallet.
 */
export async function changeDisplayName(displayName: string): Promise<User> {
  if (!isTauri()) return mock(() => store.mockChangeDisplayName(displayName));
  return invoke<User>("change_display_name", { displayName });
}

export async function sendDigitalDelivery(input: DigitalDelivery): Promise<void> {
  if (!isTauri()) return mock(() => store.mockSendDigitalDelivery(input));
  return invoke<void>("send_digital_delivery", { input });
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

export async function getNews(): Promise<NewsPost[]> {
  if (!isTauri()) return mock(() => store.mockGetNews());
  return invoke<NewsPost[]>("get_news"); // assuming backend support is coming
}

export async function createNewsPost(input: NewsPostInput): Promise<NewsPost> {
  if (!isTauri()) return mock(() => store.mockCreateNewsPost(input));
  return invoke<NewsPost>("create_news_post", { input });
}

export async function getNewsComments(postId: string): Promise<NewsComment[]> {
  if (!isTauri()) return mock(() => store.mockGetNewsComments(postId));
  return invoke<NewsComment[]>("get_news_comments", { postId });
}

export async function addNewsComment(postId: string, text: string): Promise<NewsComment> {
  if (!isTauri()) return mock(() => store.mockAddNewsComment(postId, text));
  return invoke<NewsComment>("add_news_comment", { postId, text });
}

export async function becomeSeller(input: SellerInput): Promise<User> {
  if (!isTauri()) return mock(() => store.mockBecomeSeller(input));
  return invoke<User>("become_seller", { input });
}

export async function getSellerStore(idOrSlug: string): Promise<SellerStore> {
  const s = !isTauri()
    ? await mock(() => store.mockGetSellerStore(idOrSlug))
    : await invoke<SellerStore>("get_seller_store", { id: idOrSlug });
  return { ...s, products: s.products.map(normProduct) };
}

export async function getUser(id: string): Promise<PublicUser> {
  if (!isTauri()) return mock(() => store.mockGetUser(id));
  return invoke<PublicUser>("get_user", { id });
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<Product[]> {
  const list = !isTauri()
    ? await mock(() => store.mockGetProducts())
    : await invoke<Product[]>("get_products");
  return list.map(normProduct);
}

export async function getProduct(id: string): Promise<Product> {
  const p = !isTauri()
    ? await mock(() => {
        const found = store.mockGetProduct(id);
        if (!found) throw apiError("not_found", `Product ${id} not found`);
        return found;
      })
    : await invoke<Product>("get_product", { id });
  return normProduct(p);
}

// ---------------------------------------------------------------------------
// Seller: my listings
// ---------------------------------------------------------------------------

export async function getMyProducts(): Promise<Product[]> {
  const list = !isTauri()
    ? await mock(() => store.mockGetMyProducts())
    : await invoke<Product[]>("get_my_products");
  return list.map(normProduct);
}

export async function getSellerSales(): Promise<SalesPoint[]> {
  if (!isTauri()) return mock(() => store.mockGetSellerSales());
  return invoke<SalesPoint[]>("get_seller_sales");
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const p = !isTauri()
    ? await mock(() => store.mockCreateProduct(input))
    : await invoke<Product>("create_product", { input });
  return normProduct(p);
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const p = !isTauri()
    ? await mock(() => store.mockUpdateProduct(id, input))
    : await invoke<Product>("update_product", { id, input });
  return normProduct(p);
}

export async function submitForReview(id: string): Promise<Product> {
  if (!isTauri()) return mock(() => store.mockSubmitForReview(id));
  return invoke<Product>("submit_for_review", { id });
}

export async function deleteProduct(id: string): Promise<void> {
  if (!isTauri()) return mock(() => store.mockDeleteProduct(id));
  return invoke<void>("delete_product", { id });
}

// ---------------------------------------------------------------------------
// Seller stock inventory (account listings)
// ---------------------------------------------------------------------------

export async function inventorySummary(productId: string): Promise<InventorySummary> {
  if (!isTauri()) return mock(() => store.mockInventorySummary(productId));
  return invoke<InventorySummary>("inventory_summary", { productId });
}

export async function addInventory(productId: string, raw: string): Promise<InventoryUploadResult> {
  if (!isTauri()) return mock(() => store.mockAddInventory(productId, raw));
  return invoke<InventoryUploadResult>("add_inventory", { productId, raw });
}

export async function clearInventory(productId: string): Promise<void> {
  if (!isTauri()) return mock(() => store.mockClearInventory(productId));
  return invoke<void>("clear_inventory", { productId });
}

// ---------------------------------------------------------------------------
// Seller marketplace API (sales feed + outbound webhook)
// ---------------------------------------------------------------------------

export async function marketplaceSettings(): Promise<MarketplaceSettings> {
  if (!isTauri()) return mock(() => store.mockMarketplaceSettings());
  return invoke<MarketplaceSettings>("marketplace_settings");
}

export async function regenerateApiKey(): Promise<MarketplaceSettings> {
  if (!isTauri()) return mock(() => store.mockRegenerateApiKey());
  return invoke<MarketplaceSettings>("regenerate_api_key");
}

export async function setWebhook(url: string): Promise<MarketplaceSettings> {
  if (!isTauri()) return mock(() => store.mockSetWebhook(url));
  return invoke<MarketplaceSettings>("set_webhook", { url });
}

export async function testWebhook(): Promise<WebhookTestResult> {
  if (!isTauri()) return mock(() => store.mockTestWebhook());
  return invoke<WebhookTestResult>("test_webhook");
}

export async function sellerSales(since: number, limit: number): Promise<SalesPage> {
  if (!isTauri()) return mock(() => store.mockSellerSales(since, limit));
  return invoke<SalesPage>("seller_sales", { since, limit });
}


// Chat quick-ban (global chat): kept in the public edition — it is gated on the
// caller's moderator flag (false for regular users) and enforced server-side.
export async function banUser(userId: string, input: BanInput): Promise<ManagedUser> {
  if (!isTauri()) return mock(() => store.mockBanUser(userId, input));
  return invoke<ManagedUser>("ban_user", { userId, input });
}


// ---------------------------------------------------------------------------
// Library & downloads
// ---------------------------------------------------------------------------

export async function getLibrary(): Promise<LibraryItem[]> {
  const list = !isTauri()
    ? await mock(() => store.mockGetLibrary())
    : await invoke<LibraryItem[]>("get_library");
  return list.map((it) => ({ ...it, product: normProduct(it.product) }));
}

export async function downloadItem(id: string): Promise<DownloadBundle> {
  if (!isTauri()) {
    await delay(800);
    return {
      productId: id,
      licenseId: `lic_${id}`,
      filename: `${id}.bin`,
      ciphertextB64: "",
      keyB64: "bW9jay1rZXk=",
      nonceB64: "bW9jay1ub25jZQ==",
      sizeBytes: 0,
      sha256: "0".repeat(64),
    };
  }
  return invoke<DownloadBundle>("download_item", { id });
}

// ---------------------------------------------------------------------------
// Wallet & payments
// ---------------------------------------------------------------------------

export async function getWallet(): Promise<Wallet> {
  if (!isTauri()) return mock(() => store.mockGetWallet());
  return invoke<Wallet>("get_wallet");
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!isTauri()) return mock(() => store.mockGetTransactions());
  return invoke<Transaction[]>("get_transactions");
}

// ---------------------------------------------------------------------------
// Deposits (top-ups): CryptoBot invoice, or on-chain Monero / TON
// ---------------------------------------------------------------------------

/** Start a top-up via `method`. For CryptoBot, `asset` restricts the invoice to
 *  a preferred coin; on-chain methods ignore it. Returns how to pay. */
export async function createDeposit(
  method: DepositMethod,
  amountUsdCents: number,
  asset: CryptoAsset | "" = "",
): Promise<DepositIntent> {
  if (!isTauri()) return mock(() => store.mockCreateDeposit(method, amountUsdCents, asset), 600);
  return invoke<DepositIntent>("create_deposit", { method, amountUsdCents, asset });
}

/** Poll a deposit; the backend credits the wallet on first confirmed payment. */
export async function checkDeposit(depositId: string): Promise<DepositIntent> {
  if (!isTauri()) return mock(() => store.mockCheckDeposit(depositId), 300);
  return invoke<DepositIntent>("check_deposit", { depositId });
}

export async function getPendingDeposits(): Promise<DepositIntent[]> {
  if (!isTauri()) return mock(() => store.mockGetPendingDeposits(), 100);
  return invoke<DepositIntent[]>("get_pending_deposits");
}

/** Cancel an unpaid top-up so it drops off the "awaiting payment" list. */
export async function cancelDeposit(depositId: string): Promise<DepositIntent> {
  if (!isTauri()) return mock(() => store.mockCancelDeposit(depositId), 150);
  return invoke<DepositIntent>("cancel_deposit", { depositId });
}

// ---------------------------------------------------------------------------
// Withdrawals (payout requests — fulfilled out-of-band by the operator)
// ---------------------------------------------------------------------------

/** Request a payout. Debits (holds) the balance immediately. */
export async function createWithdrawal(method: WithdrawMethod, amountCents: number, address: string): Promise<Withdrawal> {
  if (!isTauri()) return mock(() => store.mockCreateWithdrawal(method, amountCents, address), 400);
  return invoke<Withdrawal>("create_withdrawal", { method, amountCents, address });
}

/** The current user's payout requests and their statuses. */
export async function getWithdrawals(): Promise<Withdrawal[]> {
  if (!isTauri()) return mock(() => store.mockGetWithdrawals(), 100);
  return invoke<Withdrawal[]>("get_withdrawals");
}


const imageCache = new Map<string, Promise<string>>();

/** Resolve an image reference (a stored filename) to something the webview can
 * render. Inline data: URIs (placeholders / mock data) pass through. In the app,
 * the Rust core fetches the bytes by name over HTTPS and returns a data: URI.
 * Results are cached per ref so each image is fetched at most once. */
export async function getImage(ref?: string | null): Promise<string> {
  if (!ref || ref.startsWith("data:")) return ref ?? "";
  let pending = imageCache.get(ref);
  if (!pending) {
    pending = (isTauri() ? invoke<string>("get_image", { path: ref }) : Promise.resolve(ref)).catch(
      (e) => {
        imageCache.delete(ref); // allow retry on failure
        throw e;
      },
    );
    imageCache.set(ref, pending);
  }
  return pending;
}

/** Buy a license, debiting the wallet balance. Returns the now-owned product.
 * `planIndex` selects a pricing plan when the product offers several. */
export async function purchaseProduct(id: string, planIndex?: number): Promise<Product> {
  const p = !isTauri()
    ? await mock(() => store.mockPurchase(id, planIndex), 500)
    : await invoke<Product>("purchase_product", { id, planIndex: planIndex ?? null });
  return normProduct(p);
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export async function getSubscriptions(): Promise<Subscription[]> {
  const list = !isTauri()
    ? await mock(() => store.mockGetSubscriptions())
    : await invoke<Subscription[]>("get_subscriptions");
  return list.map((s) => ({ ...s, product: normProduct(s.product) }));
}

/** Start a subscription, debiting the first period from the wallet.
 * `planIndex` selects a pricing plan when the product offers several. */
export async function subscribeProduct(id: string, planIndex?: number): Promise<Subscription> {
  const s = !isTauri()
    ? await mock(() => store.mockSubscribe(id, planIndex), 500)
    : await invoke<Subscription>("subscribe_product", { id, planIndex: planIndex ?? null });
  return { ...s, product: normProduct(s.product) };
}

export async function cancelSubscription(id: string): Promise<Subscription> {
  if (!isTauri()) return mock(() => store.mockCancelSubscription(id));
  return invoke<Subscription>("cancel_subscription", { id });
}

export async function resumeSubscription(id: string): Promise<Subscription> {
  if (!isTauri()) return mock(() => store.mockResumeSubscription(id));
  return invoke<Subscription>("resume_subscription", { id });
}

// ---------------------------------------------------------------------------
// Digital good delivery
// ---------------------------------------------------------------------------

/** Reveal the delivered content (key/account/link/file) for an owned good. */
export async function getDelivery(productId: string): Promise<DigitalDelivery> {
  if (!isTauri()) return mock(() => store.mockGetDelivery(productId));
  return invoke<DigitalDelivery>("get_delivery", { productId });
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function getReviews(productId: string): Promise<Review[]> {
  if (!isTauri()) return mock(() => store.mockGetReviews(productId));
  return invoke<Review[]>("get_reviews", { productId });
}

export async function addReview(productId: string, input: ReviewInput): Promise<Review> {
  if (!isTauri()) return mock(() => store.mockAddReview(productId, input));
  return invoke<Review>("add_review", { productId, input });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(): Promise<AppNotification[]> {
  if (!isTauri()) return mock(() => store.mockGetNotifications());
  return invoke<AppNotification[]>("get_notifications");
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!isTauri()) return mock(() => store.mockMarkNotificationRead(id));
  return invoke<void>("mark_notification_read", { id });
}

export async function markAllNotificationsRead(): Promise<void> {
  if (!isTauri()) return mock(() => store.mockMarkAllNotificationsRead());
  return invoke<void>("mark_all_notifications_read");
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export async function getConversations(): Promise<Conversation[]> {
  if (!isTauri()) return mock(() => store.mockGetConversations());
  return invoke<Conversation[]>("get_conversations");
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!isTauri()) return mock(() => store.mockGetMessages(conversationId), 80);
  return invoke<Message[]>("get_messages", { conversationId });
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  if (!isTauri()) return mock(() => store.mockSendMessage(conversationId, body), 120);
  return invoke<Message>("send_message", { conversationId, body });
}

export async function startConversation(peerId: string, productId?: string): Promise<Conversation> {
  if (!isTauri()) return mock(() => store.mockStartConversation(peerId, productId));
  return invoke<Conversation>("start_conversation", { peerId, productId });
}

// ---------------------------------------------------------------------------
// Chat Checks
// ---------------------------------------------------------------------------

/** Create a check (debit wallet) that can be sent in a message. */
export async function createCheck(amountCents: number): Promise<ChatCheck> {
  if (!isTauri()) return mock(() => store.mockCreateCheck(amountCents), 300);
  return invoke<ChatCheck>("create_check", { amountCents });
}

/** Send a previously created check in a conversation. */
export async function sendCheck(conversationId: string, checkId: string): Promise<Message> {
  if (!isTauri()) return mock(() => store.mockSendCheck(conversationId, checkId), 150);
  return invoke<Message>("send_check", { conversationId, checkId });
}

/** Claim (activate) a received check — credits the caller's wallet. */
export async function claimCheck(checkId: string): Promise<ChatCheck> {
  if (!isTauri()) return mock(() => store.mockClaimCheck(checkId), 400);
  return invoke<ChatCheck>("claim_check", { checkId });
}

// ---------------------------------------------------------------------------
// Global chat
// ---------------------------------------------------------------------------

export async function getChat(): Promise<ChatMessage[]> {
  if (!isTauri()) return mock(() => store.mockGetChat(), 0);
  return invoke<ChatMessage[]>("get_chat");
}

export async function sendChat(input: ChatInput): Promise<ChatMessage> {
  if (!isTauri()) return mock(() => store.mockSendChat(input), 80);
  return invoke<ChatMessage>("send_chat", { input });
}

export async function deleteChatMessage(id: string): Promise<void> {
  if (!isTauri()) return mock(() => store.mockDeleteChat(id));
  return invoke<void>("delete_chat_message", { id });
}

// ---------------------------------------------------------------------------
// Discussion topics (side mini-forum)
// ---------------------------------------------------------------------------

export async function getTopics(): Promise<ChatTopic[]> {
  if (!isTauri()) return mock(() => store.mockGetTopics(), 0);
  return invoke<ChatTopic[]>("get_topics");
}

export async function getTopic(id: string): Promise<ChatTopicDetail> {
  if (!isTauri()) return mock(() => store.mockGetTopic(id));
  return invoke<ChatTopicDetail>("get_topic", { id });
}

export async function createTopic(input: TopicInput): Promise<ChatTopic> {
  if (!isTauri()) return mock(() => store.mockCreateTopic(input), 80);
  return invoke<ChatTopic>("create_topic", { input });
}

export async function replyTopic(topicId: string, body: string): Promise<ChatTopicPost> {
  if (!isTauri()) return mock(() => store.mockReplyTopic(topicId, body), 80);
  return invoke<ChatTopicPost>("reply_topic", { topicId, body });
}

export async function deleteTopic(id: string): Promise<void> {
  if (!isTauri()) return mock(() => store.mockDeleteTopic(id));
  return invoke<void>("delete_topic", { id });
}

export async function deleteTopicPost(id: string): Promise<void> {
  if (!isTauri()) return mock(() => store.mockDeleteTopicPost(id));
  return invoke<void>("delete_topic_post", { id });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Run a synchronous mock fn behind a small delay to mimic network latency. */
async function mock<T>(fn: () => T, ms = 200): Promise<T> {
  await delay(ms);
  return fn();
}

function apiError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}
