// In-memory, mutable mock backend for browser dev. Unlike the static catalog,
// this lets the marketplace features actually work without a server: create a
// product → it appears in the seller dashboard as a draft → submit → it shows in
// the moderation queue → approve → it appears in the public catalog. Chats append
// messages and the "peer" auto-replies so threads feel live.

import type {
  AdminStats,
  AdminTimeseriesPoint,
  AppNotification,
  BanInput,
  ChatInput,
  ChatMessage,
  ChatTopic,
  ChatTopicDetail,
  ChatTopicPost,
  TopicInput,
  PublicUser,
  Conversation,
  CryptoAsset,
  DepositIntent,
  DepositMethod,
  Withdrawal,
  WithdrawMethod,
  ChatCheck,
  DigitalDelivery,
  InventorySummary,
  InventoryUploadResult,
  LibraryItem,
  MarketplaceSettings,
  SalesPage,
  WebhookTestResult,
  ManagedUser,
  Message,
  ModerationDecision,
  ModerationItem,
  Product,
  ProductInput,
  ProfileInput,
  Review,
  ReviewInput,
  SalesPoint,
  SellerInput,
  SellerStore,
  Subscription,
  Transaction,
  User,
  Wallet,
} from "@/types/api";
import { MOCK_PRODUCTS, swatch } from "@/lib/mock";

// --- identities -----------------------------------------------------------

const SELLER_NAMES: Record<string, string> = {
  usr_me: "Obsidian Labs",
  usr_hollow: "Hollow Point",
  usr_quiet: "Quiet Machines",
  usr_prism: "Prism Co.",
  usr_buyer1: "anon_0x91",
  usr_buyer2: "ghost_user",
};

export function sellerName(id: string): string {
  return SELLER_NAMES[id] ?? id;
}

const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();
let counter = 1000;
const nextId = (prefix: string) => `${prefix}_${++counter}`;

// --- current user (seeded as buyer + seller + moderator for a full demo) ---

let currentUser: User = {
  id: "usr_me",
  username: "you",
  displayName: "you",
  bio: "Indie tooling. Privacy maximalist.",
  isSeller: true,
  isModerator: true,
  isAdmin: true,
  sellerStatus: "approved",
  bannedUntil: null,
  banReason: null,
  createdAt: "2026-01-12",
  freeNameChangeUsed: false,
  nameChangeFeeCents: 500,
  seller: {
    storeName: "Obsidian Labs",
    storeSlug: "obsidian-labs",
    about: "Local-first, zero-knowledge tooling.",
    rating: 4.7,
    ratingCount: 539,
    totalSales: 1284,
    productCount: 3,
    joinedAt: "2026-01-12",
  },
};

// --- products: catalog + seller-owned items in various statuses -----------

const products: Product[] = [...MOCK_PRODUCTS];

// Extra listings owned by the current user to populate the seller dashboard.
products.push(
  mkProduct({
    id: "prd_draft1",
    name: "VaultSync",
    tagline: "Encrypted vault sync over Tor",
    category: "security",
    priceCents: 3900,
    status: "draft",
    hue: 275,
  }),
  mkProduct({
    id: "prd_pending_me",
    name: "ObsidianCLI",
    tagline: "Headless automation for NightVault",
    category: "development",
    priceCents: 0,
    status: "pending_review",
    hue: 255,
  }),
  mkProduct({
    id: "prd_rejected1",
    name: "TraceWipe",
    tagline: "One-click forensic cleaner",
    category: "tools",
    priceCents: 2500,
    status: "rejected",
    hue: 5,
    rejectionReason: "Listing implies anti-forensic use against third parties. Clarify the authorized-use scope and resubmit.",
  }),
);

// Pending items from OTHER sellers, for the moderation queue.
products.push(
  { ...mkProduct({ id: "prd_pending_a", name: "MeshDrop", tagline: "Anonymous file drop", category: "security", priceCents: 1900, status: "pending_review", hue: 200 }), sellerId: "usr_hollow" },
  { ...mkProduct({ id: "prd_pending_b", name: "ProxyForge", tagline: "Rotating egress proxy manager", category: "tools", priceCents: 4500, status: "pending_review", hue: 165 }), sellerId: "usr_quiet" },
);

function mkProduct(o: {
  id: string;
  name: string;
  tagline: string;
  category: Product["category"];
  priceCents: number;
  status: Product["status"];
  hue: number;
  rejectionReason?: string;
}): Product {
  return {
    id: o.id,
    slug: o.name.toLowerCase().replace(/\s+/g, "-"),
    name: o.name,
    tagline: o.tagline,
    description: `${o.name} — ${o.tagline}.`,
    category: o.category,
    version: "1.0.0",
    priceCents: o.priceCents,
    currency: "USD",
    iconUrl: swatch(o.hue),
    screenshots: [swatch(o.hue), swatch(o.hue + 25)],
    sizeBytes: 25_000_000,
    rating: 0,
    ratingCount: 0,
    publisher: "Obsidian Labs",
    owned: false,
    tags: [o.category],
    updatedAt: today(),
    sellerId: "usr_me",
    status: o.status,
    rejectionReason: o.rejectionReason ?? null,
    kind: "program",
    billingPeriod: null,
    deliveryType: "file",
    codeContent: null,
    codeLanguage: null,
  };
}

// --- conversations & messages ---------------------------------------------

const conversations: Conversation[] = [
  {
    id: "cnv_1",
    peer: { id: "usr_buyer1", displayName: SELLER_NAMES["usr_buyer1"] },
    productId: "prd_001",
    productName: "NightVault",
    unread: 1,
    updatedAt: nowIso(),
    lastMessage: null,
  },
  {
    id: "cnv_2",
    peer: { id: "usr_hollow", displayName: SELLER_NAMES["usr_hollow"] },
    productId: "prd_002",
    productName: "PacketWraith",
    unread: 0,
    updatedAt: nowIso(),
    lastMessage: null,
  },
];

const messages: Record<string, Message[]> = {
  cnv_1: [
    msg("cnv_1", "usr_buyer1", "Does NightVault support hidden volumes on Windows?", false, -3600),
    msg("cnv_1", "usr_me", "Yes — hidden volumes work on all desktop platforms.", true, -3500),
    msg("cnv_1", "usr_buyer1", "Great. Is the key export air-gapped?", false, -120),
  ],
  cnv_2: [
    msg("cnv_2", "usr_me", "Hi, does PacketWraith decode QUIC?", true, -7200),
    msg("cnv_2", "usr_hollow", "Partial QUIC support in 1.9, full in the next release.", false, -7000),
  ],
};

function msg(conversationId: string, senderId: string, body: string, mine: boolean, secondsAgo: number): Message {
  return {
    id: nextId("msg"),
    conversationId,
    senderId,
    body,
    sentAt: new Date(Date.now() + secondsAgo * 1000).toISOString(),
    mine,
  };
}

function refreshLast(convId: string) {
  const list = messages[convId] ?? [];
  const conv = conversations.find((c) => c.id === convId);
  if (conv) {
    conv.lastMessage = list[list.length - 1] ?? null;
    conv.updatedAt = conv.lastMessage?.sentAt ?? conv.updatedAt;
  }
}
conversations.forEach((c) => refreshLast(c.id));

// ===========================================================================
// Mock API surface (called from lib/api.ts when not running under Tauri)
// ===========================================================================

export function mockGetProfile(username?: string): User {
  if (username && username !== currentUser.username) currentUser = { ...currentUser, username };
  return structuredClone(currentUser);
}

export function mockUpdateProfile(input: ProfileInput): User {
  currentUser = {
    ...currentUser,
    displayName: input.displayName,
    bio: input.bio,
    avatarUrl: input.avatarUrl ?? null,
    bannerImage: input.bannerImage ?? null,
    backgroundImage: input.backgroundImage ?? null,
  };
  return structuredClone(currentUser);
}


export function mockChangeDisplayName(displayName: string): User {
  const name = displayName.trim();
  if (!name || name === currentUser.displayName) return structuredClone(currentUser);

  if (currentUser.freeNameChangeUsed) {
    const fee = currentUser.nameChangeFeeCents;
    if (wallet.balanceCents < fee) {
      throw Object.assign(new Error("Insufficient balance to change your name. Top up your wallet."), {
        code: "insufficient_funds",
      });
    }
    wallet = {
      ...wallet,
      balanceCents: wallet.balanceCents - fee,
      totalSpentCents: wallet.totalSpentCents + fee,
    };
    transactions.unshift(tx("purchase", -fee, "Display name change", "confirmed", 0));
  }

  currentUser = { ...currentUser, displayName: name, freeNameChangeUsed: true };
  return structuredClone(currentUser);
}

export function mockBecomeSeller(input: SellerInput): User {
  currentUser = {
    ...currentUser,
    isSeller: true,
    // New storefronts go through moderation before going public.
    sellerStatus: "pending",
    seller: {
      storeName: input.storeName,
      storeSlug: input.storeName.toLowerCase().replace(/\s+/g, "-"),
      about: input.about,
      rating: 0,
      ratingCount: 0,
      totalSales: 0,
      productCount: mockGetMyProducts().length,
      joinedAt: today(),
    },
  };
  const dir = userDir.find((u) => u.id === currentUser.id);
  if (dir) {
    dir.isSeller = true;
    dir.sellerStatus = "pending";
    dir.storeName = input.storeName;
    dir.about = input.about;
  }
  return structuredClone(currentUser);
}

export function mockGetSellerStore(idOrSlug: string): SellerStore {
  const owned = products.filter(
    (p) => p.status === "approved" && (p.sellerId === idOrSlug || sellerName(p.sellerId).toLowerCase().replace(/\s+/g, "-") === idOrSlug),
  );
  const sellerId = owned[0]?.sellerId ?? idOrSlug;
  return {
    sellerId,
    seller: {
      storeName: sellerName(sellerId),
      storeSlug: sellerName(sellerId).toLowerCase().replace(/\s+/g, "-"),
      about: "Publisher on Fovea.",
      rating: 4.6,
      ratingCount: 200,
      totalSales: 800,
      productCount: owned.length,
      joinedAt: "2026-02-01",
    },
    products: owned,
  };
}

export function mockGetProducts(): Product[] {
  return products.filter((p) => p.status === "approved");
}

export function mockGetProduct(idOrSlug: string): Product | undefined {
  return products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export function mockGetLibrary(): LibraryItem[] {
  return products
    .filter((p) => p.owned)
    .map((product) => ({
      product,
      purchasedAt: "2026-05-01",
      licenseId: `lic_${product.id}`,
      state: { kind: "not_downloaded" } as const,
    }));
}

export function mockGetMyProducts(): Product[] {
  return products.filter((p) => p.sellerId === currentUser.id);
}

/** Live + suspended listings, for the moderation "block/unblock" view. */
export function mockGetModeratableProducts(): Product[] {
  return products.filter((p) => p.status === "approved" || p.status === "suspended");
}

export function mockCreateProduct(input: ProductInput): Product {
  // Implicit store: the first listing turns the account into a seller.
  if (!currentUser.isSeller) {
    currentUser = {
      ...currentUser,
      isSeller: true,
      sellerStatus: "approved",
      seller: currentUser.seller ?? {
        storeName: currentUser.displayName,
        storeSlug: currentUser.displayName.toLowerCase().replace(/\s+/g, "-"),
        about: "",
        rating: 0,
        ratingCount: 0,
        totalSales: 0,
        productCount: 0,
        joinedAt: today(),
      },
    };
    const dir = userDir.find((u) => u.id === currentUser.id);
    if (dir) {
      dir.isSeller = true;
      dir.sellerStatus = "approved";
      dir.storeName = currentUser.seller?.storeName ?? currentUser.displayName;
    }
  }
  const id = nextId("prd");
  const p: Product = {
    id,
    slug: input.name.toLowerCase().replace(/\s+/g, "-") || id,
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    category: input.category,
    version: input.version || "1.0.0",
    priceCents: input.priceCents,
    currency: "USD",
    iconUrl: input.iconUrl || swatch(Math.floor(Math.random() * 360)),
    iconImage: input.iconUrl ?? null,
    coverImage: input.coverImage ?? null,
    bannerImage: input.bannerImage ?? null,
    screenshots: input.screenshots ?? [],
    faq: input.faq ?? [],
    plans: input.plans ?? [],
    sizeBytes: 0,
    rating: 0,
    ratingCount: 0,
    publisher: currentUser.seller?.storeName ?? currentUser.displayName,
    owned: false,
    tags: input.tags,
    updatedAt: today(),
    sellerId: currentUser.id,
    status: "draft",
    rejectionReason: null,
    kind: input.kind,
    billingPeriod: input.billingPeriod ?? null,
    deliveryType: input.deliveryType ?? null,
    codeContent: input.codeContent ?? null,
    codeLanguage: input.codeLanguage ?? null,
  };
  products.unshift(p);
  return p;
}

export function mockUpdateProduct(id: string, input: ProductInput): Product {
  const p = byOwnedId(id);
  Object.assign(p, {
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    category: input.category,
    version: input.version,
    priceCents: input.priceCents,
    tags: input.tags,
    updatedAt: today(),
    kind: input.kind,
    billingPeriod: input.billingPeriod ?? null,
    deliveryType: input.deliveryType ?? null,
    codeContent: input.codeContent ?? null,
    codeLanguage: input.codeLanguage ?? null,
    screenshots: input.screenshots ?? p.screenshots,
    faq: input.faq ?? p.faq,
    plans: input.plans ?? p.plans,
    coverImage: input.coverImage ?? null,
    bannerImage: input.bannerImage ?? null,
    iconImage: input.iconUrl ?? null,
    // Editing a rejected listing resets it to draft.
    status: p.status === "rejected" ? "draft" : p.status,
    rejectionReason: p.status === "rejected" ? null : p.rejectionReason,
    ...(input.iconUrl ? { iconUrl: input.iconUrl } : {}),
  });
  return p;
}

export function mockSubmitForReview(id: string): Product {
  const p = byOwnedId(id);
  p.status = "pending_review";
  p.rejectionReason = null;
  return p;
}

export function mockDeleteProduct(id: string): void {
  const i = products.findIndex((p) => p.id === id && p.sellerId === currentUser.id);
  if (i >= 0) products.splice(i, 1);
}

// --- seller stock inventory (account listings) ---
const inventory: Record<string, { available: string[]; sold: number }> = {};

export function mockInventorySummary(productId: string): InventorySummary {
  const inv = inventory[productId] ?? { available: [], sold: 0 };
  return { productId, available: inv.available.length, sold: inv.sold, total: inv.available.length + inv.sold };
}

export function mockAddInventory(productId: string, raw: string): InventoryUploadResult {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const inv = inventory[productId] ?? { available: [], sold: 0 };
  inv.available.push(...lines);
  inventory[productId] = inv;
  const p = products.find((x) => x.id === productId);
  if (p) p.stockCount = inv.available.length;
  return { productId, added: lines.length, available: inv.available.length };
}

export function mockClearInventory(productId: string): void {
  const inv = inventory[productId];
  if (inv) inv.available = [];
  const p = products.find((x) => x.id === productId);
  if (p) p.stockCount = 0;
}

// --- seller marketplace API ---
let mpSettings: MarketplaceSettings = {
  apiKey: "fvsk_demo_0123456789abcdef",
  webhookUrl: "",
  salesEndpoint: "/api/seller/sales",
};

export function mockMarketplaceSettings(): MarketplaceSettings {
  return structuredClone(mpSettings);
}

export function mockRegenerateApiKey(): MarketplaceSettings {
  mpSettings = { ...mpSettings, apiKey: "fvsk_" + Math.random().toString(36).slice(2, 18) };
  return structuredClone(mpSettings);
}

export function mockSetWebhook(url: string): MarketplaceSettings {
  mpSettings = { ...mpSettings, webhookUrl: url };
  return structuredClone(mpSettings);
}

export function mockTestWebhook(): WebhookTestResult {
  return { ok: Boolean(mpSettings.webhookUrl), status: mpSettings.webhookUrl ? 200 : 0 };
}

export function mockSellerSales(_since: number, _limit: number): SalesPage {
  return { cursor: 0, sales: [] };
}

export function mockGetModerationQueue(): ModerationItem[] {
  return products
    .filter((p) => p.status === "pending_review")
    .map((product) => ({
      product,
      sellerName: sellerName(product.sellerId),
      submittedAt: product.updatedAt,
    }));
}

export function mockModerate(id: string, decision: ModerationDecision): void {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  if (decision.action === "approve") {
    p.status = "approved";
    p.rejectionReason = null;
  } else {
    p.status = "rejected";
    p.rejectionReason = decision.reason;
  }
}

export function mockGetConversations(): Conversation[] {
  return [...conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function mockGetMessages(conversationId: string): Message[] {
  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) conv.unread = 0;
  return messages[conversationId] ?? [];
}

export function mockSendMessage(conversationId: string, body: string): Message {
  const m = msg(conversationId, currentUser.id, body, true, 0);
  (messages[conversationId] ??= []).push(m);
  refreshLast(conversationId);

  // Simulate the peer typing back so threads feel alive in browser dev.
  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) {
    setTimeout(() => {
      const reply = msg(
        conversationId,
        conv.peer.id,
        pickReply(body),
        false,
        0,
      );
      (messages[conversationId] ??= []).push(reply);
      conv.unread += 1;
      refreshLast(conversationId);
    }, 1400);
  }
  return m;
}

export function mockStartConversation(peerId: string, productId?: string): Conversation {
  const existing = conversations.find((c) => c.peer.id === peerId && c.productId === (productId ?? null));
  if (existing) return existing;
  const product = productId ? mockGetProduct(productId) : undefined;
  const conv: Conversation = {
    id: nextId("cnv"),
    peer: { id: peerId, displayName: sellerName(peerId) },
    productId: productId ?? null,
    productName: product?.name ?? null,
    unread: 0,
    updatedAt: nowIso(),
    lastMessage: null,
  };
  conversations.unshift(conv);
  messages[conv.id] = [];
  return conv;
}

// --- chat checks -----------------------------------------------------------

const checkStore = new Map<string, ChatCheck>();

export function mockCreateCheck(amountCents: number): ChatCheck {
  if (wallet.balanceCents < amountCents) {
    throw Object.assign(new Error("Insufficient balance to create check."), {
      code: "insufficient_funds",
    });
  }
  wallet = {
    ...wallet,
    balanceCents: wallet.balanceCents - amountCents,
    totalSpentCents: wallet.totalSpentCents + amountCents,
  };
  const check: ChatCheck = {
    id: nextId("chk"),
    amountCents,
    currency: "USD",
    creatorId: currentUser.id,
    creatorName: currentUser.displayName ?? "You",
    claimedBy: null,
    status: "active",
    createdAt: nowIso(),
    claimedAt: null,
  };
  checkStore.set(check.id, check);
  transactions.unshift(
    tx("purchase", -amountCents, `Check #${check.id.slice(-4)} created`, "confirmed", 0),
  );
  return check;
}

export function mockSendCheck(conversationId: string, checkId: string): Message {
  const check = checkStore.get(checkId);
  if (!check) throw Object.assign(new Error("Check not found"), { code: "not_found" });
  const m: Message = {
    id: nextId("msg"),
    conversationId,
    senderId: currentUser.id,
    body: `💸 Check for $${(check.amountCents / 100).toFixed(2)}`,
    sentAt: nowIso(),
    mine: true,
    check: { ...check },
  };
  (messages[conversationId] ??= []).push(m);
  refreshLast(conversationId);
  return m;
}

export function mockClaimCheck(checkId: string): ChatCheck {
  const check = checkStore.get(checkId);
  if (!check) throw Object.assign(new Error("Check not found"), { code: "not_found" });
  if (check.status !== "active") {
    throw Object.assign(new Error("Check already " + check.status), { code: "check_" + check.status });
  }
  check.status = "claimed";
  check.claimedBy = currentUser.id;
  check.claimedAt = nowIso();
  // Credit the wallet.
  wallet = { ...wallet, balanceCents: wallet.balanceCents + check.amountCents };
  transactions.unshift(
    tx("deposit", check.amountCents, `Check #${check.id.slice(-4)} claimed`, "confirmed", 0),
  );
  // Update the check inside any message that references it.
  for (const msgs of Object.values(messages)) {
    for (const m of msgs) {
      if (m.check?.id === checkId) m.check = { ...check };
    }
  }
  return { ...check };
}


let wallet: Wallet = {
  balanceCents: 25_000,
  currency: "USD",
  pendingCents: 1_500,
  totalSpentCents: 12_900,
  totalEarnedCents: 84_300,
  depositAddress: "84r00tShoPxMRdEpoSitAddr3ssExAmPLe9z7q2wK5vN8mYjH6bT4cF1gD0sR",
  depositCurrency: "XMR",
  withdrawFeePercent: 2.0,
  withdrawFeeFlatCents: 0,
};

const transactions: Transaction[] = [
  tx("sale", 4_900, "Sale: NightVault license", "confirmed", -2),
  tx("deposit", 20_000, "Deposit (XMR)", "confirmed", -5),
  tx("purchase", -12_900, "Purchase: PacketWraith", "confirmed", -9),
  tx("deposit", 1_500, "Deposit (XMR)", "pending", -1),
];

function tx(
  type: Transaction["type"],
  amountCents: number,
  description: string,
  status: Transaction["status"],
  daysAgo: number,
): Transaction {
  return {
    id: nextId("txn"),
    type,
    amountCents,
    currency: "USD",
    description,
    createdAt: new Date(Date.now() + daysAgo * 86_400_000).toISOString().slice(0, 10),
    status,
  };
}

export function mockGetWallet(): Wallet {
  return { ...wallet };
}

export function mockGetTransactions(): Transaction[] {
  return [...transactions];
}

export function mockAddFunds(amountCents: number): Wallet {
  wallet = { ...wallet, balanceCents: wallet.balanceCents + amountCents };
  transactions.unshift(tx("deposit", amountCents, "Deposit (XMR)", "confirmed", 0));
  return { ...wallet };
}

// --- Deposits (mock) -------------------------------------------------------

const depositStore = new Map<string, DepositIntent & { createdAt: number }>();

/** Rough demo crypto amounts so the on-chain screens show something plausible. */
const MOCK_RATES: Record<string, number> = { XMR: 0.0056, TON: 0.31 };

export function mockCreateDeposit(
  method: DepositMethod,
  amountUsdCents: number,
  asset: CryptoAsset | "",
): DepositIntent {
  const id = nextId("dep");
  const usd = amountUsdCents / 100;
  const intent: DepositIntent =
    method === "cryptobot"
      ? {
          depositId: id, method, status: "active", amountUsdCents,
          asset: asset || "USDT", payUrl: `https://t.me/CryptoBot?start=${id}`,
          payAddress: "", payComment: "", payAmount: "",
        }
      : {
          depositId: id, method, status: "active", amountUsdCents,
          asset: method === "monero" ? "XMR" : "TON",
          payUrl: "",
          payAddress: method === "monero"
            ? "88Fovea" + id.replace(/\D/g, "").padEnd(10, "0") + "MockSubaddrExampleXMRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            : "UQFoveaMockTonReceiveAddrExamplexxxxxxxxxxxxxxxxx",
          payComment: method === "ton" ? `FVA-${id.slice(-6).toUpperCase()}` : "",
          payAmount: (usd * (MOCK_RATES[method === "monero" ? "XMR" : "TON"] || 1)).toFixed(method === "monero" ? 6 : 3),
        };
  depositStore.set(id, { ...intent, createdAt: Date.now() });
  return intent;
}

export function mockCheckDeposit(depositId: string): DepositIntent {
  const entry = depositStore.get(depositId);
  if (!entry) throw Object.assign(new Error("Deposit not found"), { code: "not_found" });
  // Auto-confirm after 3 seconds for a smooth demo feel.
  if (entry.status === "active" && Date.now() - entry.createdAt > 3000) {
    entry.status = "paid";
    wallet = { ...wallet, balanceCents: wallet.balanceCents + entry.amountUsdCents };
    transactions.unshift(tx("deposit", entry.amountUsdCents, `Deposit via ${entry.method} (${entry.asset})`, "confirmed", 0));
  }
  const { createdAt: _c, ...intent } = entry;
  return intent;
}

export function mockGetPendingDeposits(): DepositIntent[] {
  return Array.from(depositStore.values())
    .filter((entry) => entry.status === "active")
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ createdAt: _c, ...intent }) => intent);
}

export function mockCancelDeposit(depositId: string): DepositIntent {
  const entry = depositStore.get(depositId);
  if (!entry) throw Object.assign(new Error("Deposit not found"), { code: "not_found" });
  if (entry.status === "active") entry.status = "expired";
  const { createdAt: _c, ...intent } = entry;
  return intent;
}

// --- withdrawals (mock) ----------------------------------------------------

const withdrawals: Withdrawal[] = [];

export function mockCreateWithdrawal(method: WithdrawMethod, amountCents: number, address: string): Withdrawal {
  if (wallet.balanceCents < amountCents) {
    throw Object.assign(new Error("Insufficient balance."), { code: "insufficient_funds" });
  }
  wallet = { ...wallet, balanceCents: wallet.balanceCents - amountCents };
  const cryptobot = method === "cryptobot";
  const asset = cryptobot ? "USDT" : method === "monero" ? "XMR" : "TON";
  const feeCents = Math.ceil((amountCents * wallet.withdrawFeePercent) / 100) + wallet.withdrawFeeFlatCents;
  const netCents = Math.max(0, amountCents - feeCents);
  transactions.unshift(tx("withdrawal", -amountCents, `Withdrawal via ${cryptobot ? "CryptoBot (USDT)" : asset}`, cryptobot ? "confirmed" : "pending", 0));
  const w: Withdrawal = {
    id: nextId("wd"),
    method,
    asset,
    // CryptoBot is instant: paid immediately with a redeemable check link.
    address: cryptobot ? "" : address,
    amountCents,
    feeCents,
    netCents,
    status: cryptobot ? "paid" : "pending",
    reason: "",
    txid: cryptobot ? "https://t.me/CryptoBot?start=check_mock" : "",
    createdAt: nowIso(),
    processedAt: cryptobot ? nowIso() : null,
  };
  withdrawals.unshift(w);
  return { ...w };
}

export function mockGetWithdrawals(): Withdrawal[] {
  return withdrawals.map((w) => ({ ...w }));
}

export function mockGetAdminWithdrawals(): Withdrawal[] {
  return [...withdrawals]
    .sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"))
    .map((w) => ({ ...w }));
}

export function mockProcessWithdrawal(id: string, action: "paid" | "reject", reason?: string): Withdrawal {
  const w = withdrawals.find((x) => x.id === id);
  if (!w) throw Object.assign(new Error("Withdrawal not found"), { code: "not_found" });
  if (w.status === "pending") {
    if (action === "paid") {
      w.status = "paid";
      w.txid = "mocktxid";
    } else {
      w.status = "rejected";
      w.reason = reason ?? "";
      wallet = { ...wallet, balanceCents: wallet.balanceCents + w.amountCents };
      transactions.unshift(tx("refund", w.amountCents, "Withdrawal refunded", "confirmed", 0));
    }
    w.processedAt = nowIso();
  }
  return { ...w };
}

/** Resolve the effective price (and label suffix) for an optional selected plan. */
function planPrice(p: Product, planIndex?: number): { cents: number; label: string } {
  const plan = planIndex != null ? p.plans?.[planIndex] : undefined;
  if (plan) return { cents: plan.priceCents, label: ` (${plan.name})` };
  return { cents: p.priceCents, label: "" };
}

export function mockPurchase(productId: string, planIndex?: number): Product {
  const p = mockGetProduct(productId);
  if (!p) throw Object.assign(new Error("product not found"), { code: "not_found" });
  if (p.owned) return p;
  const { cents, label } = planPrice(p, planIndex);
  if (cents > 0) {
    if (wallet.balanceCents < cents) {
      throw Object.assign(new Error("Insufficient balance. Top up your wallet."), {
        code: "insufficient_funds",
      });
    }
    wallet = {
      ...wallet,
      balanceCents: wallet.balanceCents - cents,
      totalSpentCents: wallet.totalSpentCents + cents,
    };
    transactions.unshift(tx("purchase", -cents, `Purchase: ${p.name}${label}`, "confirmed", 0));
  }
  p.owned = true;
  deliverCodeToChat(p);
  return p;
}

// --- reviews ---------------------------------------------------------------

const reviews: Record<string, Review[]> = {
  prd_001: [
    review("prd_001", "usr_buyer1", 5, "Rock-solid. Hidden volumes saved me during a border crossing.", -12),
    review("prd_001", "usr_buyer2", 4, "Great, though the key export flow has a learning curve.", -6),
  ],
  prd_002: [
    review("prd_002", "usr_quiet", 5, "Best passive analyzer I've used on an engagement.", -3),
  ],
};

function review(productId: string, authorId: string, rating: number, body: string, daysAgo: number): Review {
  return {
    id: nextId("rev"),
    productId,
    authorId,
    authorName: sellerName(authorId),
    rating,
    body,
    createdAt: new Date(Date.now() + daysAgo * 86_400_000).toISOString().slice(0, 10),
    mine: authorId === currentUser.id,
  };
}

export function mockGetReviews(productId: string): Review[] {
  return [...(reviews[productId] ?? [])];
}

export function mockAddReview(productId: string, input: ReviewInput): Review {
  const list = (reviews[productId] ??= []);
  // One review per user: replace an existing own review.
  const existingIdx = list.findIndex((r) => r.authorId === currentUser.id);
  const r: Review = {
    id: existingIdx >= 0 ? list[existingIdx].id : nextId("rev"),
    productId,
    authorId: currentUser.id,
    authorName: currentUser.displayName,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    body: input.body,
    createdAt: today(),
    mine: true,
  };
  if (existingIdx >= 0) list[existingIdx] = r;
  else list.unshift(r);
  recomputeRating(productId);
  return r;
}

function recomputeRating(productId: string) {
  const list = reviews[productId] ?? [];
  const p = products.find((x) => x.id === productId);
  if (!p) return;
  p.ratingCount = list.length;
  p.rating = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
}

// --- subscriptions ---------------------------------------------------------

function addDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
const periodDays = (p: "monthly" | "yearly") => (p === "yearly" ? 365 : 30);

const subscriptions: Subscription[] = [];

// Seed one active subscription so the Subscriptions tab isn't empty.
(() => {
  const p = products.find((x) => x.id === "prd_010");
  if (!p) return;
  p.owned = true;
  subscriptions.push({
    id: "sub_seed",
    product: p,
    status: "active",
    billingPeriod: "monthly",
    priceCents: p.priceCents,
    currency: p.currency,
    startedAt: addDays(-12),
    currentPeriodEnd: addDays(18),
    autoRenew: true,
  });
})();

export function mockGetSubscriptions(): Subscription[] {
  return subscriptions.map((s) => ({ ...s }));
}

export function mockSubscribe(productId: string, planIndex?: number): Subscription {
  const p = mockGetProduct(productId);
  if (!p) throw Object.assign(new Error("product not found"), { code: "not_found" });
  const existing = subscriptions.find((s) => s.product.id === productId && s.status === "active");
  if (existing) return existing;

  const period: "monthly" | "yearly" = p.billingPeriod === "yearly" ? "yearly" : "monthly";
  const { cents, label } = planPrice(p, planIndex);
  if (cents > 0) {
    if (wallet.balanceCents < cents) {
      throw Object.assign(new Error("Insufficient balance. Top up your wallet."), {
        code: "insufficient_funds",
      });
    }
    wallet = {
      ...wallet,
      balanceCents: wallet.balanceCents - cents,
      totalSpentCents: wallet.totalSpentCents + cents,
    };
    transactions.unshift(tx("purchase", -cents, `Subscription: ${p.name}${label}`, "confirmed", 0));
  }
  p.owned = true;
  const sub: Subscription = {
    id: nextId("sub"),
    product: p,
    status: "active",
    billingPeriod: period,
    priceCents: cents,
    currency: p.currency,
    startedAt: today(),
    currentPeriodEnd: addDays(periodDays(period)),
    autoRenew: true,
  };
  subscriptions.unshift(sub);
  deliverCodeToChat(p);
  return sub;
}

export function mockCancelSubscription(id: string): Subscription {
  const s = subscriptions.find((x) => x.id === id);
  if (!s) throw Object.assign(new Error("subscription not found"), { code: "not_found" });
  s.autoRenew = false;
  return { ...s };
}

export function mockResumeSubscription(id: string): Subscription {
  const s = subscriptions.find((x) => x.id === id);
  if (!s) throw Object.assign(new Error("subscription not found"), { code: "not_found" });
  s.autoRenew = true;
  s.status = "active";
  return { ...s };
}

// --- digital good delivery -------------------------------------------------

export function mockGetDelivery(productId: string): DigitalDelivery {
  const p = mockGetProduct(productId);
  const deliveryType = p?.deliveryType ?? "license_key";
  const seed = productId.replace(/\D/g, "") || "00";
  switch (deliveryType) {
    case "license_key":
      return {
        productId,
        deliveryType,
        content: `OBS-${seed}-7F3A-91C2-${seed}D4E`,
        instructions: "Enter this key in Settings → Activate. Valid for one machine.",
      };
    case "account":
      return {
        productId,
        deliveryType,
        content: "user: r00t_" + seed + "  ·  pass: " + Math.random().toString(36).slice(2, 12),
        instructions: "Change the password on first login.",
      };
    case "link":
      return {
        productId,
        deliveryType,
        content: "http://Foveadl" + seed + "obscuredonionaddrxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.onion/d",
        instructions: "Open over Tor. Link expires in 24h.",
      };
    case "code": {
      // Inline source. For subscriptions there is no stored source, so issue an
      // access code instead; for code products hand back the seller's source.
      const code =
        p?.codeContent ??
        `FOVEA-SUB-${seed}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      return {
        productId,
        deliveryType,
        content: code,
        language: p?.codeLanguage ?? null,
        lineCount: code.split("\n").length,
        instructions: p?.kind === "subscription"
          ? "Use this access code to activate your subscription."
          : "Also sent to your messages with the seller. Copy and save it.",
      };
    }
    case "contact":
      return {
        productId,
        deliveryType,
        content: "",
        sellerId: p?.sellerId ?? null,
        instructions: "Message the seller to arrange access. They'll provision your subscription manually.",
      };
    case "file":
    default:
      return {
        productId,
        deliveryType: "file",
        content: `${p?.slug ?? productId}.zip`,
        instructions: "Fetched and decrypted by the core after license verification.",
      };
  }
}

/**
 * When an item is delivered as inline code, drop the source into the buyer's
 * conversation with the seller (auto-message), matching production behaviour.
 */
function deliverCodeToChat(p: Product) {
  if (p.deliveryType !== "code" || !p.codeContent) return;
  if (p.sellerId === currentUser.id) return; // own product
  const conv = mockStartConversation(p.sellerId, p.id);
  const lang = p.codeLanguage ? `${p.codeLanguage}\n` : "";
  const m = msg(
    conv.id,
    p.sellerId,
    `Here's your code for ${p.name}:\n\n\`\`\`${lang}${p.codeContent}\n\`\`\``,
    false,
    0,
  );
  (messages[conv.id] ??= []).push(m);
  conv.unread += 1;
  refreshLast(conv.id);
  notifyCodeDelivered(p);
}

function notifyCodeDelivered(p: Product) {
  notifications.unshift({
    id: nextId("ntf"),
    type: "message",
    title: "Code delivered",
    body: `Source for “${p.name}” was sent to your messages.`,
    link: "/messages",
    read: false,
    createdAt: nowIso(),
  });
}

// --- notifications ---------------------------------------------------------

const notifications: AppNotification[] = [
  { id: "ntf_1", type: "sale", title: "New sale", body: "NightVault (+$49.00)", link: "/wallet", read: false, createdAt: nowIso() },
  { id: "ntf_2", type: "moderated", title: "Listing approved", body: "“ObsidianCLI” is now live.", link: "/sell", read: false, createdAt: nowIso() },
  { id: "ntf_3", type: "message", title: "Message from anon_0x91", body: "Is the key export air-gapped?", link: "/messages", read: true, createdAt: nowIso() },
];

export function mockGetNotifications(): AppNotification[] {
  return notifications.map((n) => ({ ...n }));
}

export function mockMarkNotificationRead(id: string): void {
  const n = notifications.find((x) => x.id === id);
  if (n) n.read = true;
}

export function mockMarkAllNotificationsRead(): void {
  notifications.forEach((n) => (n.read = true));
}

// --- users registry (moderation / admin management) ------------------------

type DirUser = ManagedUser & { about: string; storeName: string };

const userDir: DirUser[] = [
  { id: "usr_me", username: currentUser.username, displayName: "you", isSeller: true, isModerator: true, isAdmin: true, sellerStatus: "approved", bannedUntil: null, banReason: null, createdAt: "2026-01-12", about: "Local-first, zero-knowledge tooling.", storeName: "Obsidian Labs" },
  { id: "usr_hollow", username: "hollow", displayName: "Hollow Point", isSeller: true, isModerator: false, isAdmin: false, sellerStatus: "approved", bannedUntil: null, banReason: null, createdAt: "2026-02-01", about: "Network tooling for authorized engagements.", storeName: "Hollow Point" },
  { id: "usr_quiet", username: "quiet", displayName: "Quiet Machines", isSeller: true, isModerator: false, isAdmin: false, sellerStatus: "approved", bannedUntil: null, banReason: null, createdAt: "2026-02-14", about: "Offline-first software.", storeName: "Quiet Machines" },
  { id: "usr_prism", username: "prism", displayName: "Prism Co.", isSeller: true, isModerator: false, isAdmin: false, sellerStatus: "pending", bannedUntil: null, banReason: null, createdAt: "2026-06-10", about: "Frame-accurate media tools. New to Fovea.", storeName: "Prism Co." },
  { id: "usr_buyer1", username: "anon", displayName: "anon_0x91", isSeller: false, isModerator: false, isAdmin: false, sellerStatus: null, bannedUntil: null, banReason: null, createdAt: "2026-03-02", about: "", storeName: "" },
  { id: "usr_buyer2", username: "ghost", displayName: "ghost_user", isSeller: false, isModerator: false, isAdmin: false, sellerStatus: null, bannedUntil: null, banReason: null, createdAt: "2026-04-19", about: "", storeName: "" },
];

const banActive = (u: { bannedUntil?: string | null }) =>
  !!u.bannedUntil && new Date(u.bannedUntil).getTime() > Date.now();

function toManaged(u: DirUser): ManagedUser {
  const { about: _a, storeName: _s, ...rest } = u;
  return { ...rest };
}

function findDirUser(id: string): DirUser | undefined {
  return userDir.find((u) => u.id === id);
}

/** Login-time ban check, keyed by email. Returns the active ban or null. */
export function mockCheckBan(email: string): { bannedUntil: string; banReason: string } | null {
  const u = userDir.find((x) => x.username.toLowerCase() === email.toLowerCase());
  if (u && banActive(u)) {
    return { bannedUntil: u.bannedUntil as string, banReason: u.banReason || "Account suspended." };
  }
  return null;
}

export function mockGetUsers(query?: string): ManagedUser[] {
  const q = (query ?? "").trim().toLowerCase();
  return userDir
    .filter((u) => !q || u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q))
    .map(toManaged);
}

export function mockBlockProduct(productId: string, reason: string): void {
  const p = products.find((x) => x.id === productId);
  if (!p) return;
  p.status = "suspended";
  p.rejectionReason = reason;
}

export function mockUnblockProduct(productId: string): void {
  const p = products.find((x) => x.id === productId);
  if (!p) return;
  p.status = "approved";
  p.rejectionReason = null;
}

export function mockBanUser(userId: string, input: BanInput): ManagedUser {
  const u = findDirUser(userId);
  if (!u) throw Object.assign(new Error("user not found"), { code: "not_found" });
  const until =
    input.days > 0
      ? new Date(Date.now() + input.days * 86_400_000).toISOString()
      : "9999-12-31T00:00:00.000Z"; // permanent
  u.bannedUntil = until;
  u.banReason = input.reason.trim() || "Violation of marketplace rules.";
  if (userId === currentUser.id) currentUser = { ...currentUser, bannedUntil: u.bannedUntil, banReason: u.banReason };
  return toManaged(u);
}

export function mockUnbanUser(userId: string): ManagedUser {
  const u = findDirUser(userId);
  if (!u) throw Object.assign(new Error("user not found"), { code: "not_found" });
  u.bannedUntil = null;
  u.banReason = null;
  if (userId === currentUser.id) currentUser = { ...currentUser, bannedUntil: null, banReason: null };
  return toManaged(u);
}

export function mockSetModerator(userId: string, on: boolean): ManagedUser {
  const u = findDirUser(userId);
  if (!u) throw Object.assign(new Error("user not found"), { code: "not_found" });
  u.isModerator = on;
  if (userId === currentUser.id) currentUser = { ...currentUser, isModerator: on };
  return toManaged(u);
}

export function mockGetSellerSales(days = 30): SalesPoint[] {
  const buckets: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "sale") continue;
    const key = t.createdAt.slice(0, 10);
    buckets[key] = (buckets[key] ?? 0) + Math.abs(t.amountCents);
  }
  const out: SalesPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, revenueCents: buckets[key] ?? 0 });
  }
  return out;
}

export function mockGetAdminStats(): AdminStats {
  const sum = (type: Transaction["type"]) =>
    transactions.filter((t) => t.type === type).reduce((s, t) => s + Math.abs(t.amountCents), 0);
  return {
    userCount: userDir.length,
    onlineCount: 1 + Math.round(Math.random() * 3),
    sellerCount: userDir.filter((u) => u.isSeller).length,
    moderatorCount: userDir.filter((u) => u.isModerator).length,
    bannedCount: userDir.filter(banActive).length,
    productCount: products.length,
    pendingProducts: products.filter((p) => p.status === "pending_review").length,
    walletBalanceCents: wallet.balanceCents,
    transactionCount: transactions.length,
    depositVolumeCents: sum("deposit"),
    salesVolumeCents: sum("sale"),
    purchaseVolumeCents: sum("purchase"),
    currency: wallet.currency,
    uptimeSeconds: 3600 * 6 + 42 * 60,
    serverTime: new Date().toISOString(),
    version: "1.0.0",
    dbSizeBytes: 12 * 1024 * 1024,
    cpuPercent: 8 + Math.round(Math.random() * 10),
    memUsedBytes: 900 * 1024 * 1024,
    memTotalBytes: 3.3 * 1024 * 1024 * 1024,
  };
}

export function mockGetAdminTimeseries(days = 30): AdminTimeseriesPoint[] {
  const n = Math.max(1, Math.min(days, 90));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (n - 1));
  const sales: Record<string, number> = {};
  const deposits: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "sale" && t.type !== "deposit") continue;
    const key = new Date(t.createdAt).toISOString().slice(0, 10);
    const bucket = t.type === "sale" ? sales : deposits;
    bucket[key] = (bucket[key] ?? 0) + Math.abs(t.amountCents);
  }
  const out: AdminTimeseriesPoint[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, salesCents: sales[key] ?? 0, depositsCents: deposits[key] ?? 0 });
  }
  return out;
}

export function mockGetAllTransactions(): Transaction[] {
  return [...transactions];
}

// --- global chat -----------------------------------------------------------

function roleOf(userId: string): "admin" | "moderator" | null {
  if (userId === currentUser.id)
    return currentUser.isAdmin ? "admin" : currentUser.isModerator ? "moderator" : null;
  return null;
}

function chatMsg(userId: string, body: string, minutesAgo: number, image?: string): ChatMessage {
  return {
    id: nextId("chat"),
    userId,
    authorName: sellerName(userId),
    authorRole: roleOf(userId),
    authorAvatar: userId === currentUser.id ? currentUser.avatarUrl ?? null : null,
    replyTo: null,
    body,
    image: image ?? null,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    mine: userId === currentUser.id,
    canModerate: !!(currentUser.isModerator || currentUser.isAdmin),
  };
}

const chatMessages: ChatMessage[] = [
  chatMsg("usr_hollow", "Всем привет! Кто что нового прикупил?", 90),
  chatMsg("usr_quiet", "Взял NightVault — пока доволен.", 72),
  chatMsg("usr_buyer1", "А чекеры у кого брали? Подскажите проверенных продавцов.", 45),
  chatMsg("usr_me", "Вопросы по товарам — в чат с продавцом, тут общее общение.", 30),
];

export function mockGetChat(): ChatMessage[] {
  const canMod = !!(currentUser.isModerator || currentUser.isAdmin);
  return chatMessages.map((m) => ({ ...m, mine: m.userId === currentUser.id, canModerate: canMod }));
}

export function mockSendChat(input: ChatInput): ChatMessage {
  const m = chatMsg(currentUser.id, (input.body ?? "").trim(), 0, input.image ?? undefined);
  m.authorName = currentUser.displayName;
  if (input.replyToId) {
    const target = chatMessages.find((x) => x.id === input.replyToId);
    if (target) {
      m.replyTo = {
        id: target.id,
        authorName: target.authorName,
        authorAvatar: target.authorAvatar ?? null,
        text: (target.body || (target.image ? "📷" : "")).slice(0, 160),
      };
    }
  }
  chatMessages.push(m);
  return m;
}

export function mockDeleteChat(id: string): void {
  const i = chatMessages.findIndex((x) => x.id === id);
  if (i >= 0) chatMessages.splice(i, 1);
}

export function mockGetUser(id: string): PublicUser {
  if (id === currentUser.id) {
    return {
      id: currentUser.id,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl ?? null,
      bannerImage: currentUser.bannerImage ?? null,
      backgroundImage: currentUser.backgroundImage ?? null,
      bio: currentUser.bio ?? null,
      role: currentUser.isAdmin ? "admin" : currentUser.isModerator ? "moderator" : null,
      isSeller: currentUser.isSeller,
      createdAt: currentUser.createdAt,
      seller: currentUser.seller ?? null,
    };
  }
  return {
    id,
    displayName: sellerName(id),
    avatarUrl: null,
    bannerImage: null,
    backgroundImage: null,
    bio: null,
    role: roleOf(id),
    isSeller: false,
    createdAt: "2026-01-01",
    seller: null,
  };
}

// --- discussion topics (side mini-forum) -----------------------------------

interface TopicRow extends ChatTopic {
  posts: ChatTopicPost[];
}

function tpost(userId: string, body: string, minutesAgo: number): ChatTopicPost {
  return {
    id: nextId("tpost"),
    userId,
    authorName: sellerName(userId),
    authorRole: roleOf(userId),
    authorAvatar: userId === currentUser.id ? currentUser.avatarUrl ?? null : null,
    body,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    mine: userId === currentUser.id,
    canModerate: !!(currentUser.isModerator || currentUser.isAdmin),
  };
}

const topics: TopicRow[] = [];

(function seedTopics() {
  const rulesPost = tpost(
    "usr_me",
    "Добро пожаловать! Правила: уважайте друг друга, без спама, вопросы по товарам — в чат с продавцом, " +
      "без незаконных сделок и деанона. Модераторы могут удалять сообщения и банить. Создавайте темы справа!",
    6000,
  );
  topics.push({
    id: "topic_rules",
    title: "Правила форума и чата",
    authorId: "usr_me",
    authorName: sellerName("usr_me"),
    authorRole: roleOf("usr_me"),
    pinned: true,
    locked: true,
    replyCount: 0,
    createdAt: rulesPost.createdAt,
    lastActivity: rulesPost.createdAt,
    mine: false,
    canModerate: !!(currentUser.isModerator || currentUser.isAdmin),
    posts: [rulesPost],
  });
})();

function topicView(r: TopicRow): ChatTopic {
  const { posts: _p, ...rest } = r;
  return { ...rest, replyCount: Math.max(0, r.posts.length - 1) };
}

export function mockGetTopics(): ChatTopic[] {
  const canMod = !!(currentUser.isModerator || currentUser.isAdmin);
  return topics
    .slice()
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.lastActivity < b.lastActivity ? 1 : -1))
    .map((r) => ({ ...topicView(r), canModerate: canMod, mine: r.authorId === currentUser.id }));
}

export function mockGetTopic(id: string): ChatTopicDetail {
  const r = topics.find((x) => x.id === id);
  if (!r) throw Object.assign(new Error("topic not found"), { code: "not_found" });
  const canMod = !!(currentUser.isModerator || currentUser.isAdmin);
  return {
    topic: { ...topicView(r), canModerate: canMod, mine: r.authorId === currentUser.id },
    posts: r.posts.map((p) => ({ ...p, canModerate: canMod, mine: p.userId === currentUser.id })),
  };
}

export function mockCreateTopic(input: TopicInput): ChatTopic {
  const id = nextId("topic");
  const post = tpost(currentUser.id, input.body.trim(), 0);
  post.authorName = currentUser.displayName;
  const row: TopicRow = {
    id,
    title: input.title.trim(),
    authorId: currentUser.id,
    authorName: currentUser.displayName,
    authorRole: roleOf(currentUser.id),
    pinned: false,
    locked: false,
    replyCount: 0,
    createdAt: post.createdAt,
    lastActivity: post.createdAt,
    mine: true,
    canModerate: !!(currentUser.isModerator || currentUser.isAdmin),
    posts: [post],
  };
  topics.unshift(row);
  return topicView(row);
}

export function mockReplyTopic(topicId: string, body: string): ChatTopicPost {
  const r = topics.find((x) => x.id === topicId);
  if (!r) throw Object.assign(new Error("topic not found"), { code: "not_found" });
  if (r.locked && !(currentUser.isModerator || currentUser.isAdmin)) {
    throw Object.assign(new Error("Topic is locked."), { code: "locked" });
  }
  const post = tpost(currentUser.id, body.trim(), 0);
  post.authorName = currentUser.displayName;
  r.posts.push(post);
  r.lastActivity = post.createdAt;
  return post;
}

export function mockDeleteTopic(id: string): void {
  const i = topics.findIndex((x) => x.id === id);
  if (i >= 0) topics.splice(i, 1);
}

export function mockDeleteTopicPost(id: string): void {
  for (const r of topics) {
    const i = r.posts.findIndex((p) => p.id === id);
    if (i > 0) {
      r.posts.splice(i, 1);
      return;
    }
  }
}

// --- helpers ---------------------------------------------------------------

function byOwnedId(id: string): Product {
  const p = products.find((x) => x.id === id && x.sellerId === currentUser.id);
  if (!p) throw Object.assign(new Error("product not found"), { code: "not_found" });
  return p;
}

function pickReply(_incoming: string): string {
  const canned = [
    "Got it — let me check and get back to you.",
    "Thanks! That's supported.",
    "Good question. The docs cover that in the security section.",
    "Sure, I can issue a license key once payment clears over the relay.",
  ];
  return canned[Math.floor(Math.random() * canned.length)];
}

// --- news ------------------------------------------------------------------

import type { NewsPost, NewsComment, NewsPostInput } from "@/types/api";

let news: NewsPost[] = [
  {
    id: "news_1",
    title: "Добро пожаловать в новый Каталог",
    content: "Мы полностью переработали дизайн главной страницы. Теперь навигация стала удобнее, а интерфейс работает быстрее. Оставляйте свои отзывы в комментариях!",
    authorId: "usr_me",
    authorName: "Admin",
    authorRole: "admin",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    likes: 42,
    commentCount: 1,
    likedByMe: false,
  }
];

let newsComments: NewsComment[] = [
  {
    id: "nc_1",
    postId: "news_1",
    authorId: "usr_buyer1",
    authorName: "anon_0x91",
    text: "Выглядит просто супер! Стеклянный дизайн это то, что было нужно.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  }
];

export function mockGetNews(): NewsPost[] {
  return [...news].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function mockCreateNewsPost(input: NewsPostInput): NewsPost {
  if (!currentUser.isAdmin) throw new Error("Only admins can post news");
  const post: NewsPost = {
    id: `news_${Date.now()}`,
    title: input.title,
    content: input.content,
    coverImage: input.coverImage,
    authorId: currentUser.id,
    authorName: currentUser.displayName,
    authorRole: "admin",
    createdAt: new Date().toISOString(),
    likes: 0,
    commentCount: 0,
    likedByMe: false,
  };
  news.push(post);
  return post;
}

export function mockGetNewsComments(postId: string): NewsComment[] {
  return newsComments.filter((c) => c.postId === postId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function mockAddNewsComment(postId: string, text: string): NewsComment {
  const comment: NewsComment = {
    id: `nc_${Date.now()}`,
    postId,
    authorId: currentUser.id,
    authorName: currentUser.displayName,
    authorRole: currentUser.isAdmin ? "admin" : currentUser.isModerator ? "moderator" : null,
    text,
    createdAt: new Date().toISOString(),
  };
  newsComments.push(comment);
  const post = news.find((p) => p.id === postId);
  if (post) post.commentCount++;
  return comment;
}

export function mockSendDigitalDelivery(_input: any): void {
  // stub
}
