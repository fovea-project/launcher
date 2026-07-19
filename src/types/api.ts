// API models — these mirror the JSON the Rust core exchanges with the backend
// over HTTPS. The webview only ever sees these shapes via Tauri `invoke`; it
// never talks to the network itself.

/** Phases reported by the connection layer in the Rust core. */
export type ConnectionPhase = "idle" | "starting" | "ready" | "error";

export interface ConnectionStatus {
  phase: ConnectionPhase;
  /** 0..1 readiness progress, when known. */
  progress: number;
  /** Human-readable status line. */
  message: string;
  /** Present when phase === "error". */
  error?: string | null;
}

export interface AuthSession {
  jwt: string;
  username: string;
  /** Unix seconds. */
  expiresAt: number;
}

export type ProductCategory =
  | "tools"
  | "security"
  | "media"
  | "development"
  | "productivity"
  | "other";

/** Lifecycle of a product listing as it passes through moderation. */
export type ProductStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

/**
 * What kind of thing is being sold. Each kind gets its own product page and
 * fulfilment flow:
 *  - program          — a downloadable application/exe
 *  - checker          — a downloadable checker/automation tool
 *  - private_software — licensed private software (key + download)
 *  - code             — source code, delivered as an archive or inline in a message
 *  - free_code        — a free code snippet (same delivery, price 0)
 *  - subscription     — recurring access, delivered as a code or seller contact
 */
export type ProductKind =
  | "program"
  | "checker"
  | "private_software"
  | "code"
  | "free_code"
  | "subscription"
  | "game_account"
  | "social_account"
  | "service";

/** Kinds sold from a pool of interchangeable credential units (stock). */
export const ACCOUNT_KINDS: ProductKind[] = ["game_account", "social_account"];

/** Billing cadence for subscription listings. */
export type BillingPeriod = "monthly" | "yearly";

/**
 * How an item is delivered after purchase.
 *  - file        — encrypted archive fetched + decrypted by the core
 *  - code        — source/text delivered inline (shown on the page + auto-sent to chat)
 *  - license_key — a key string
 *  - account     — account credentials
 *  - link        — a download/access link
 *  - contact     — manual: opens a chat with the seller to arrange delivery
 */
export type DeliveryKind =
  | "license_key"
  | "account"
  | "file"
  | "link"
  | "code"
  | "contact"
  | "stock";

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  version: string;
  /** Price in integer cents; 0 means free. */
  priceCents: number;
  currency: string;
  /** Small icon for display (custom upload, else a generated placeholder). */
  iconUrl: string;
  /** Seller's custom icon, if any (empty/null when only the placeholder exists). */
  iconImage?: string | null;
  /** Store-card banner shown in the market grid. */
  coverImage?: string | null;
  /** Product-detail banner shown on the product page hero and in the carousel. */
  bannerImage?: string | null;
  screenshots: string[];
  sizeBytes: number;
  rating: number;
  ratingCount: number;
  publisher: string;
  /** Whether the current user already owns a license. */
  owned: boolean;
  tags: string[];
  updatedAt: string;
  /** Moderation state. Only `approved` products appear in the public catalog. */
  status: ProductStatus;
  /** Id of the seller who owns this listing. */
  sellerId: string;
  /** Reason supplied by a moderator when `status === "rejected"`. */
  rejectionReason?: string | null;
  /** Software, subscription, or one-time digital good. */
  kind: ProductKind;
  /** For `subscription`: how often `priceCents` recurs. */
  billingPeriod?: BillingPeriod | null;
  /** How the item is delivered on purchase (see DeliveryKind). */
  deliveryType?: DeliveryKind | null;
  /** For stock (account) listings: units currently available. null = not a
   *  stock listing; 0 = sold out. */
  stockCount?: number | null;
  /** For `code`/`free_code` with inline delivery: the source text. */
  codeContent?: string | null;
  /** Language hint for inline code (e.g. "python", "javascript"). */
  codeLanguage?: string | null;
  /** Seller-authored FAQ for this product. */
  faq?: FaqItem[];
  /** Optional pricing plans/tiers (e.g. different subscription lengths). When
   * present, the store shows a price range and the buyer picks a plan. */
  plans?: PricePlan[];
}

/** A selectable pricing tier on a product (e.g. "1 month", "Premium"). */
export interface PricePlan {
  name: string;
  priceCents: number;
  description?: string;
}

/** Editable fields when a seller creates or updates a listing. */
export interface ProductInput {
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  version: string;
  priceCents: number;
  tags: string[];
  /** Custom small icon as a data: URI (uploaded by the seller). */
  iconUrl?: string;
  /** Store-card banner as a data: URI (uploaded by the seller). */
  coverImage?: string | null;
  /** Product-detail banner as a data: URI (uploaded by the seller). */
  bannerImage?: string | null;
  kind: ProductKind;
  billingPeriod?: BillingPeriod | null;
  deliveryType?: DeliveryKind | null;
  codeContent?: string | null;
  codeLanguage?: string | null;
  /** Screenshot images as data: URIs (uploaded by the seller). */
  screenshots?: string[];
  /** Seller-authored FAQ for this product. */
  faq?: FaqItem[];
  /** Optional pricing plans/tiers offered for this listing. */
  plans?: PricePlan[];
}

export interface FaqItem {
  q: string;
  a: string;
}

/** A product the user owns, as it appears in the Library. */
export interface LibraryItem {
  product: Product;
  purchasedAt: string;
  licenseId: string;
  /** Local download state, tracked by the core. */
  state: DownloadState;
}

export type DownloadState =
  | { kind: "not_downloaded" }
  | { kind: "downloading"; progress: number }
  | { kind: "installed"; path: string; installedAt: string }
  | { kind: "error"; message: string };

/**
 * Result of `download_item`. The server returns the payload AES-encrypted and
 * hands over the decryption key only after verifying the caller's license.
 * Bytes are base64 so they can cross the Tauri IPC boundary safely.
 */
export interface DownloadBundle {
  productId: string;
  licenseId: string;
  /** Suggested filename for the decrypted artifact. */
  filename: string;
  /** AES-256-GCM ciphertext, base64. */
  ciphertextB64: string;
  /** Per-download decryption key, base64 (released post license-check). */
  keyB64: string;
  /** Nonce / IV, base64. */
  nonceB64: string;
  sizeBytes: number;
  sha256: string;
}

export interface ApiError {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// CryptoBot (Crypto Pay) — invoice-based top-up via Telegram @CryptoBot.
// ---------------------------------------------------------------------------

export type CryptoAsset =
  | "USDT"
  | "GRAM"
  | "BTC"
  | "ETH"
  | "LTC"
  | "BNB";

/** Top-up rail. `cryptobot` is a hosted invoice; `monero`/`ton` are on-chain. */
export type DepositMethod = "cryptobot" | "monero" | "ton";

/** Payout rails: on-chain (send to an address) or CryptoBot (instant check). */
export type WithdrawMethod = "monero" | "ton" | "cryptobot";

/** A payout request, fulfilled out-of-band by the operator. */
export interface Withdrawal {
  id: string;
  method: WithdrawMethod;
  asset: string;
  address: string;
  /** Debited from the balance. */
  amountCents: number;
  /** Fee retained by the store. */
  feeCents: number;
  /** Actually sent to the user (amountCents − feeCents). */
  netCents: number;
  status: "pending" | "paid" | "rejected";
  reason: string;
  txid: string;
  createdAt: string;
  processedAt: string | null;
}

/** A wallet top-up in progress — how to pay plus its live status. One shape for
 *  every rail: CryptoBot fills `payUrl`; on-chain fills `payAddress` (+
 *  `payComment` for TON) and `payAmount` (the crypto amount to send). */
export interface DepositIntent {
  depositId: string;
  method: DepositMethod;
  status: "active" | "paid" | "expired";
  amountUsdCents: number;
  asset: string;
  payUrl: string;
  payAddress: string;
  payComment: string;
  payAmount: string;
}

// ---------------------------------------------------------------------------
// Accounts: a single account is always a buyer, and may additionally be a
// seller (after onboarding) and/or a moderator.
// ---------------------------------------------------------------------------

/** Review state of a seller's storefront. */
export type SellerStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  username: string;
  displayName: string;
  /** Avatar image (stored filename or data: URI). */
  avatarUrl?: string | null;
  /** Profile banner image (stored filename or data: URI). */
  bannerImage?: string | null;
  /** Full-page profile background wallpaper (stored filename or data: URI). */
  backgroundImage?: string | null;
  bio?: string;
  isSeller: boolean;
  isModerator: boolean;
  /** Full administrator: all moderation powers + role/stats management. */
  isAdmin: boolean;
  createdAt: string;
  /** Present once the account has completed seller onboarding. */
  seller?: SellerProfile | null;
  /** Approval state of the seller's store (set once they apply to sell). */
  sellerStatus?: SellerStatus | null;
  /** ISO timestamp until which the account is banned, if any. */
  bannedUntil?: string | null;
  /** Reason shown to the user while banned. */
  banReason?: string | null;
  /** True once the one free display-name change has been used. */
  freeNameChangeUsed: boolean;
  /** Cost of a paid display-name change, in integer cents. */
  nameChangeFeeCents: number;
}

export interface SellerProfile {
  storeName: string;
  storeSlug: string;
  about: string;
  rating: number;
  ratingCount: number;
  totalSales: number;
  productCount: number;
  joinedAt: string;
}

/** Public profile view of any user (e.g. opened from chat). */
export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  bannerImage?: string | null;
  backgroundImage?: string | null;
  bio?: string | null;
  role?: AuthorRole;
  isSeller: boolean;
  createdAt: string;
  seller?: SellerProfile | null;
}

/** Fields a user edits on their own profile. */
export interface ProfileInput {
  displayName: string;
  bio: string;
  /** Avatar as a data: URI (new), stored filename (unchanged), or empty (cleared). */
  avatarUrl?: string | null;
  /** Banner as a data: URI (new), stored filename (unchanged), or empty (cleared). */
  bannerImage?: string | null;
  /** Page background as a data: URI (new), stored filename (unchanged), or empty. */
  backgroundImage?: string | null;
}

/** Fields supplied during seller onboarding. */
export interface SellerInput {
  storeName: string;
  about: string;
}

/** Public view of a seller's storefront. */
export interface SellerStore {
  seller: SellerProfile;
  sellerId: string;
  products: Product[];
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export interface ModerationItem {
  product: Product;
  sellerName: string;
  submittedAt: string;
}

export type ModerationDecision =
  | { action: "approve" }
  | { action: "reject"; reason: string };

/** A user as seen in moderation/admin management tables. */
export interface ManagedUser {
  id: string;
  username: string;
  displayName: string;
  isSeller: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  sellerStatus?: SellerStatus | null;
  bannedUntil?: string | null;
  banReason?: string | null;
  createdAt: string;
}

/** Parameters for banning a user for a fixed window. */
export interface BanInput {
  /** Ban length in days; 0 (or omitted) means permanent. */
  days: number;
  reason: string;
}

/** One day of a seller's sales revenue (cents). */
export interface SalesPoint {
  date: string;
  revenueCents: number;
}

/** One day of platform-wide volume (cents) for the admin overview chart. */
export interface AdminTimeseriesPoint {
  date: string;
  salesCents: number;
  depositsCents: number;
}

/** Aggregate server statistics for the admin dashboard. */
export interface AdminStats {
  userCount: number;
  /** Distinct users active within the last ~2 minutes. */
  onlineCount: number;
  sellerCount: number;
  moderatorCount: number;
  bannedCount: number;
  productCount: number;
  pendingProducts: number;
  /** Total balance held across all wallets, in cents. */
  walletBalanceCents: number;
  transactionCount: number;
  /** Lifetime deposits / sales / purchase volume, in cents. */
  depositVolumeCents: number;
  salesVolumeCents: number;
  purchaseVolumeCents: number;
  currency: string;
  /** Real server metrics for the System panel. */
  uptimeSeconds: number;
  serverTime: string;
  version: string;
  dbSizeBytes: number;
  cpuPercent: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
}

// ---------------------------------------------------------------------------
// Messaging (buyer ↔ seller). Delivered over HTTPS by the core; the UI polls
// `getMessages` on an interval since onion transport is request/response.
// ---------------------------------------------------------------------------

export interface ChatPeer {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Conversation {
  id: string;
  peer: ChatPeer;
  /** Optional product this conversation is about. */
  productId?: string | null;
  productName?: string | null;
  lastMessage?: Message | null;
  unread: number;
  updatedAt: string;
  /** True for the personal "Saved Messages" self-chat (pinned to the top). */
  saved?: boolean;
}

// ---------------------------------------------------------------------------
// Chat Checks — digital vouchers sent through messages.
// ---------------------------------------------------------------------------

export type CheckStatus = "active" | "claimed" | "expired" | "cancelled";

export interface ChatCheck {
  id: string;
  amountCents: number;
  currency: string;
  /** ID of the user who created the check. */
  creatorId: string;
  creatorName?: string;
  /** ID of the user who claimed (activated) the check. */
  claimedBy?: string | null;
  status: CheckStatus;
  createdAt: string;
  claimedAt?: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  sentAt: string;
  /** True when the local user is the sender. */
  mine: boolean;
  /** Attached check, if this message is a check transfer. */
  check?: ChatCheck | null;
}

// ---------------------------------------------------------------------------
// Wallet & payments. Funds are held as an account balance topped up via a
// crypto deposit address; purchases debit it and seller sales credit it.
// ---------------------------------------------------------------------------

export interface Wallet {
  /** Available balance in integer minor units (cents) of `currency`. */
  balanceCents: number;
  currency: string;
  /** Funds from deposits not yet confirmed on-chain. */
  pendingCents: number;
  /** Lifetime spent on purchases. */
  totalSpentCents: number;
  /** Lifetime earned from sales (seller). */
  totalEarnedCents: number;
  /** Crypto address to top up the balance (e.g. Monero). */
  depositAddress: string;
  depositCurrency: string;
  /** Withdrawal fee config (so the client can preview the fee). */
  withdrawFeePercent: number;
  withdrawFeeFlatCents: number;
}

export type TransactionType = "deposit" | "purchase" | "sale" | "withdrawal" | "refund";
export type TransactionStatus = "confirmed" | "pending" | "failed";

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Signed minor units: positive = credit, negative = debit. */
  amountCents: number;
  currency: string;
  description: string;
  createdAt: string;
  status: TransactionStatus;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface Review {
  id: string;
  productId: string;
  authorId: string;
  authorName: string;
  /** 1..5 */
  rating: number;
  body: string;
  createdAt: string;
  /** True when written by the local user. */
  mine: boolean;
}

export interface ReviewInput {
  rating: number;
  body: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | "sale"
  | "subscription"
  | "review"
  | "submitted"
  | "moderated"
  | "message"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Optional in-app route to open when clicked (e.g. "/product/:id"). */
  link?: string | null;
  read: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type SubscriptionStatus = "active" | "canceled" | "expired";

export interface Subscription {
  id: string;
  product: Product;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  priceCents: number;
  currency: string;
  startedAt: string;
  /** End of the current paid period; when it renews or lapses. */
  currentPeriodEnd: string;
  /** False once canceled — stays active until `currentPeriodEnd`, then expires. */
  autoRenew: boolean;
}

// ---------------------------------------------------------------------------
// Digital good delivery — the secret/content handed over after purchase.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Forum
// ---------------------------------------------------------------------------

/** A message in the single global chat room. */
/** Official role badge shown next to a name. */
export type AuthorRole = "admin" | "moderator" | null;

export interface ChatMessage {
  id: string;
  userId: string;
  authorName: string;
  authorRole?: AuthorRole;
  /** Author's avatar (stored filename or data: URI). */
  authorAvatar?: string | null;
  /** The message this one replies to (quoted), if any. */
  replyTo?: { id: string; authorName: string; authorAvatar?: string | null; text: string } | null;
  body: string;
  /** Optional attached image (stored filename or data: URI). */
  image?: string | null;
  createdAt: string;
  /** True when written by the local user. */
  mine: boolean;
  /** True when the local user may moderate (delete) this message. */
  canModerate: boolean;
}

export interface ChatInput {
  body: string;
  /** Optional image as a data: URI (uploaded by the user). */
  image?: string | null;
  /** Id of the message being replied to, if any. */
  replyToId?: string | null;
}

/** A discussion topic in the side mini-forum. */
export interface ChatTopic {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorRole?: AuthorRole;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  createdAt: string;
  lastActivity: string;
  mine: boolean;
  canModerate: boolean;
}

export interface ChatTopicPost {
  id: string;
  userId: string;
  authorName: string;
  authorRole?: AuthorRole;
  authorAvatar?: string | null;
  body: string;
  createdAt: string;
  mine: boolean;
  canModerate: boolean;
}

export interface ChatTopicDetail {
  topic: ChatTopic;
  posts: ChatTopicPost[];
}

export interface TopicInput {
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------

export interface DigitalDelivery {
  productId: string;
  deliveryType: DeliveryKind;
  /** The delivered value: a license key, credentials, link, file note, or source code. */
  content: string;
  /** Optional redemption / usage instructions. */
  instructions?: string | null;
  /** For `code` delivery: language hint for syntax presentation. */
  language?: string | null;
  /** For `code` delivery: number of lines (for the "also sent to chat" note). */
  lineCount?: number | null;
  /** For `contact` delivery: the seller to message for manual fulfilment. */
  sellerId?: string | null;
  /** For `stock` delivery: one credential per unit the buyer owns. */
  items?: string[] | null;
  /** For `stock` delivery: number of credentials delivered. */
  count?: number | null;
}

/** Seller-side stock counts for an account listing. */
export interface InventorySummary {
  productId: string;
  available: number;
  sold: number;
  total: number;
}

/** Result of bulk-loading stock units. */
export interface InventoryUploadResult {
  productId: string;
  added: number;
  available: number;
}

/** Seller marketplace API credentials + webhook config. */
export interface MarketplaceSettings {
  apiKey: string;
  webhookUrl: string;
  salesEndpoint: string;
}

/** Result of a webhook connectivity test. */
export interface WebhookTestResult {
  ok: boolean;
  status: number;
}

/** One completed sale in the seller's feed. */
export interface SaleEvent {
  saleId: string;
  seq?: number | null;
  productId: string;
  productName: string;
  kind: string;
  amountCents: number;
  currency: string;
  buyer?: string | null;
  unitSecret?: string | null;
  soldAt: string;
}

/** A page of the sales feed with a cursor for the next poll. */
export interface SalesPage {
  cursor: number;
  sales: SaleEvent[];
}

// ---------------------------------------------------------------------------

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole?: AuthorRole;
  createdAt: string;
  likes: number;
  commentCount: number;
  coverImage?: string | null;
  likedByMe: boolean;
}

export interface NewsComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole?: AuthorRole;
  authorAvatar?: string | null;
  text: string;
  createdAt: string;
}

export interface NewsPostInput {
  title: string;
  content: string;
  coverImage?: string | null;
}
