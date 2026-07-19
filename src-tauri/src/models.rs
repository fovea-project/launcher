//! API models — kept in lock-step with `src/types/api.ts` on the frontend.
//! All fields serialize as camelCase so the webview receives the exact shapes
//! its TypeScript types expect.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionPhase {
    Idle,
    Starting,
    Ready,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatus {
    pub phase: ConnectionPhase,
    /// 0..1 readiness progress.
    pub progress: f32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ConnectionStatus {
    pub fn new(phase: ConnectionPhase, progress: f32, message: impl Into<String>) -> Self {
        Self { phase, progress, message: message.into(), error: None }
    }

    pub fn error(message: impl Into<String>) -> Self {
        let m = message.into();
        Self { phase: ConnectionPhase::Error, progress: 0.0, message: m.clone(), error: Some(m) }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSession {
    pub jwt: String,
    pub username: String,
    /// Unix seconds.
    pub expires_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProductStatus {
    Draft,
    PendingReview,
    Approved,
    Rejected,
    Suspended,
}

// Product taxonomy (kind / billing period / delivery method) is owned by the
// backend and the TS layer; the core treats these as opaque pass-through
// strings so new kinds never require a core rebuild to transit it.

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub tagline: String,
    // Omitted from the lean catalog-list payload; present on product detail.
    #[serde(default)]
    pub description: String,
    pub category: String,
    pub version: String,
    pub price_cents: i64,
    pub currency: String,
    pub icon_url: String,
    #[serde(default)]
    pub icon_image: Option<String>,
    #[serde(default)]
    pub cover_image: Option<String>,
    #[serde(default)]
    pub banner_image: Option<String>,
    pub screenshots: Vec<String>,
    pub size_bytes: u64,
    pub rating: f32,
    pub rating_count: u32,
    pub publisher: String,
    pub owned: bool,
    pub tags: Vec<String>,
    pub updated_at: String,
    pub status: ProductStatus,
    pub seller_id: String,
    #[serde(default)]
    pub rejection_reason: Option<String>,
    pub kind: String,
    #[serde(default)]
    pub billing_period: Option<String>,
    #[serde(default)]
    pub delivery_type: Option<String>,
    // Units available for stock listings (accounts); null on non-stock products.
    #[serde(default)]
    pub stock_count: Option<i64>,
    #[serde(default)]
    pub code_content: Option<String>,
    #[serde(default)]
    pub code_language: Option<String>,
    #[serde(default)]
    pub faq: Vec<FaqItem>,
    #[serde(default)]
    pub plans: Vec<PricePlan>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PricePlan {
    pub name: String,
    pub price_cents: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FaqItem {
    pub q: String,
    pub a: String,
}

/// Editable fields when a seller creates/updates a listing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductInput {
    pub name: String,
    pub tagline: String,
    pub description: String,
    pub category: String,
    pub version: String,
    pub price_cents: i64,
    pub tags: Vec<String>,
    #[serde(default)]
    pub icon_url: Option<String>,
    #[serde(default)]
    pub cover_image: Option<String>,
    #[serde(default)]
    pub banner_image: Option<String>,
    pub kind: String,
    #[serde(default)]
    pub billing_period: Option<String>,
    #[serde(default)]
    pub delivery_type: Option<String>,
    #[serde(default)]
    pub code_content: Option<String>,
    #[serde(default)]
    pub code_language: Option<String>,
    #[serde(default)]
    pub screenshots: Vec<String>,
    #[serde(default)]
    pub faq: Vec<FaqItem>,
    #[serde(default)]
    pub plans: Vec<PricePlan>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub user_id: String,
    pub author_name: String,
    #[serde(default)]
    pub author_role: Option<String>,
    #[serde(default)]
    pub author_avatar: Option<String>,
    #[serde(default)]
    pub reply_to: Option<ChatReply>,
    pub body: String,
    #[serde(default)]
    pub image: Option<String>,
    pub created_at: String,
    pub mine: bool,
    #[serde(default)]
    pub can_moderate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatReply {
    pub id: String,
    pub author_name: String,
    #[serde(default)]
    pub author_avatar: Option<String>,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicUser {
    pub id: String,
    pub display_name: String,
    #[serde(default)]
    pub avatar_url: Option<String>,
    #[serde(default)]
    pub banner_image: Option<String>,
    #[serde(default)]
    pub background_image: Option<String>,
    #[serde(default)]
    pub bio: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    pub is_seller: bool,
    pub created_at: String,
    #[serde(default)]
    pub seller: Option<SellerProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatInput {
    pub body: String,
    #[serde(default)]
    pub image: Option<String>,
    #[serde(default)]
    pub reply_to_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatTopic {
    pub id: String,
    pub title: String,
    pub author_id: String,
    pub author_name: String,
    #[serde(default)]
    pub author_role: Option<String>,
    pub pinned: bool,
    pub locked: bool,
    pub reply_count: u32,
    pub created_at: String,
    pub last_activity: String,
    pub mine: bool,
    #[serde(default)]
    pub can_moderate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatTopicPost {
    pub id: String,
    pub user_id: String,
    pub author_name: String,
    #[serde(default)]
    pub author_role: Option<String>,
    #[serde(default)]
    pub author_avatar: Option<String>,
    pub body: String,
    pub created_at: String,
    pub mine: bool,
    #[serde(default)]
    pub can_moderate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatTopicDetail {
    pub topic: ChatTopic,
    pub posts: Vec<ChatTopicPost>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicInput {
    pub title: String,
    pub body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryItem {
    pub product: Product,
    pub purchased_at: String,
    pub license_id: String,
    pub state: serde_json::Value,
}

/// Encrypted artifact + decryption key released after the server verifies the
/// caller's license. Bytes are base64 so they can cross the IPC boundary.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadBundle {
    pub product_id: String,
    pub license_id: String,
    pub filename: String,
    pub ciphertext_b64: String,
    pub key_b64: String,
    pub nonce_b64: String,
    pub size_bytes: u64,
    pub sha256: String,
}

/// Request body for `POST {api_base}/login`.
#[derive(Debug, Serialize)]
pub struct LoginRequest<'a> {
    pub username: &'a str,
    pub password: &'a str,
}

/// Response body for `POST {api_base}/login`.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub jwt: String,
    #[serde(default)]
    pub expires_at: i64,
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub username: String,
    pub display_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    #[serde(default)]
    pub banner_image: Option<String>,
    #[serde(default)]
    pub background_image: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bio: Option<String>,
    pub is_seller: bool,
    pub is_moderator: bool,
    #[serde(default)]
    pub is_admin: bool,
    pub created_at: String,
    #[serde(default)]
    pub seller: Option<SellerProfile>,
    #[serde(default)]
    pub seller_status: Option<String>,
    #[serde(default)]
    pub banned_until: Option<String>,
    #[serde(default)]
    pub ban_reason: Option<String>,
    pub free_name_change_used: bool,
    pub name_change_fee_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SellerProfile {
    pub store_name: String,
    pub store_slug: String,
    pub about: String,
    pub rating: f32,
    pub rating_count: u32,
    pub total_sales: u64,
    pub product_count: u32,
    pub joined_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInput {
    pub display_name: String,
    pub bio: String,
    #[serde(default)]
    pub avatar_url: Option<String>,
    #[serde(default)]
    pub banner_image: Option<String>,
    #[serde(default)]
    pub background_image: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SellerInput {
    pub store_name: String,
    pub about: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SellerStore {
    pub seller: SellerProfile,
    pub seller_id: String,
    pub products: Vec<Product>,
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModerationItem {
    pub product: Product,
    pub seller_name: String,
    pub submitted_at: String,
}

/// `{ "action": "approve" }` or `{ "action": "reject", "reason": "…" }`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum ModerationDecision {
    Approve,
    Reject { reason: String },
}

/// A user as shown in moderation/admin management tables.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedUser {
    pub id: String,
    pub username: String,
    pub display_name: String,
    pub is_seller: bool,
    pub is_moderator: bool,
    #[serde(default)]
    pub is_admin: bool,
    #[serde(default)]
    pub seller_status: Option<String>,
    #[serde(default)]
    pub banned_until: Option<String>,
    #[serde(default)]
    pub ban_reason: Option<String>,
    pub created_at: String,
}

/// Parameters for banning a user (`{ days, reason }`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BanInput {
    #[serde(default)]
    pub days: i64,
    pub reason: String,
}

/// Aggregate server statistics for the admin dashboard.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminStats {
    pub user_count: u64,
    #[serde(default)]
    pub online_count: u64,
    pub seller_count: u64,
    pub moderator_count: u64,
    pub banned_count: u64,
    pub product_count: u64,
    pub pending_products: u64,
    pub wallet_balance_cents: i64,
    pub transaction_count: u64,
    pub deposit_volume_cents: i64,
    pub sales_volume_cents: i64,
    pub purchase_volume_cents: i64,
    pub currency: String,
    // Real server metrics (System panel).
    #[serde(default)]
    pub uptime_seconds: u64,
    #[serde(default)]
    pub server_time: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub db_size_bytes: u64,
    #[serde(default)]
    pub cpu_percent: Option<f32>,
    #[serde(default)]
    pub mem_used_bytes: Option<u64>,
    #[serde(default)]
    pub mem_total_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SalesPoint {
    pub date: String,
    pub revenue_cents: i64,
}

/// One day of platform-wide volume for the admin overview chart.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminTimeseriesPoint {
    pub date: String,
    pub sales_cents: i64,
    pub deposits_cents: i64,
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatPeer {
    pub id: String,
    pub display_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub peer: ChatPeer,
    #[serde(default)]
    pub product_id: Option<String>,
    #[serde(default)]
    pub product_name: Option<String>,
    #[serde(default)]
    pub last_message: Option<Message>,
    pub unread: u32,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub body: String,
    pub sent_at: String,
    pub mine: bool,
}

// ---------------------------------------------------------------------------
// Wallet & payments
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Wallet {
    pub balance_cents: i64,
    pub currency: String,
    pub pending_cents: i64,
    pub total_spent_cents: i64,
    pub total_earned_cents: i64,
    pub deposit_address: String,
    pub deposit_currency: String,
    #[serde(default)]
    pub withdraw_fee_percent: f64,
    #[serde(default)]
    pub withdraw_fee_flat_cents: i64,
}

/// A payout request. Fulfilled out-of-band by the operator; status tracks it.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Withdrawal {
    pub id: String,
    /// "monero" | "ton".
    pub method: String,
    pub asset: String,
    pub address: String,
    pub amount_cents: i64,
    #[serde(default)]
    pub fee_cents: i64,
    #[serde(default)]
    pub net_cents: i64,
    /// "pending" | "paid" | "rejected".
    pub status: String,
    #[serde(default)]
    pub reason: String,
    #[serde(default)]
    pub txid: String,
    pub created_at: String,
    #[serde(default)]
    pub processed_at: Option<String>,
}

/// A wallet top-up in progress — the requirements to pay plus its live status.
/// One shape across providers: CryptoBot fills `pay_url`; on-chain methods
/// (monero/ton) fill `pay_address` (+ `pay_comment` for TON) and `pay_amount`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DepositIntent {
    pub deposit_id: String,
    /// "cryptobot" | "monero" | "ton".
    pub method: String,
    /// "active" | "paid" | "expired".
    pub status: String,
    pub amount_usd_cents: i64,
    #[serde(default)]
    pub asset: String,
    #[serde(default)]
    pub pay_url: String,
    #[serde(default)]
    pub pay_address: String,
    #[serde(default)]
    pub pay_comment: String,
    #[serde(default)]
    pub pay_amount: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransactionType {
    Deposit,
    Purchase,
    Sale,
    Withdrawal,
    Refund,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransactionStatus {
    Confirmed,
    Pending,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: String,
    #[serde(rename = "type")]
    pub tx_type: TransactionType,
    pub amount_cents: i64,
    pub currency: String,
    pub description: String,
    pub created_at: String,
    pub status: TransactionStatus,
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Review {
    pub id: String,
    pub product_id: String,
    pub author_id: String,
    pub author_name: String,
    pub rating: f32,
    pub body: String,
    pub created_at: String,
    pub mine: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewInput {
    pub rating: f32,
    pub body: String,
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppNotification {
    pub id: String,
    #[serde(rename = "type")]
    pub notif_type: String,
    pub title: String,
    pub body: String,
    #[serde(default)]
    pub link: Option<String>,
    pub read: bool,
    pub created_at: String,
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionStatus {
    Active,
    Canceled,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub id: String,
    pub product: Product,
    pub status: SubscriptionStatus,
    pub billing_period: String,
    pub price_cents: i64,
    pub currency: String,
    pub started_at: String,
    pub current_period_end: String,
    pub auto_renew: bool,
}

// ---------------------------------------------------------------------------
// Digital good delivery
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DigitalDelivery {
    pub product_id: String,
    pub delivery_type: String,
    pub content: String,
    #[serde(default)]
    pub instructions: Option<String>,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub line_count: Option<u32>,
    #[serde(default)]
    pub seller_id: Option<String>,
    // Stock (account) deliveries: one credential per unit the buyer owns.
    #[serde(default)]
    pub items: Option<Vec<String>>,
    #[serde(default)]
    pub count: Option<u32>,
}

// ---------------------------------------------------------------------------
// Seller stock inventory (account listings)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventorySummary {
    pub product_id: String,
    pub available: i64,
    pub sold: i64,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryUploadResult {
    pub product_id: String,
    pub added: i64,
    pub available: i64,
}

// ---------------------------------------------------------------------------
// Seller marketplace API (sales feed + outbound webhook)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceSettings {
    pub api_key: String,
    #[serde(default)]
    pub webhook_url: String,
    #[serde(default)]
    pub sales_endpoint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookTestResult {
    pub ok: bool,
    pub status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleEvent {
    pub sale_id: String,
    #[serde(default)]
    pub seq: Option<i64>,
    pub product_id: String,
    pub product_name: String,
    pub kind: String,
    pub amount_cents: i64,
    pub currency: String,
    #[serde(default)]
    pub buyer: Option<String>,
    #[serde(default)]
    pub unit_secret: Option<String>,
    pub sold_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SalesPage {
    pub cursor: i64,
    pub sales: Vec<SaleEvent>,
}
