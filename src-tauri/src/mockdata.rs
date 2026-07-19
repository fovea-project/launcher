//! Mock catalog used only in `--features mock-network` builds so the native app
//! compiles and runs end-to-end without a real Tor connection or backend. The
//! rich, stateful marketplace demo lives in the frontend's browser mock; here we
//! return simple, static data so every command resolves.

use crate::models::*;

const ICON: &str = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='%23222'/></svg>";

fn product(
    id: &str,
    slug: &str,
    name: &str,
    tagline: &str,
    category: &str,
    price_cents: i64,
    owned: bool,
    status: ProductStatus,
    seller_id: &str,
) -> Product {
    Product {
        id: id.into(),
        slug: slug.into(),
        name: name.into(),
        tagline: tagline.into(),
        description: format!("{name} — {tagline}. (mock-network build placeholder description)"),
        category: category.into(),
        version: "1.0.0".into(),
        price_cents,
        currency: "USD".into(),
        icon_url: ICON.into(),
        icon_image: None,
        cover_image: None,
        banner_image: None,
        screenshots: vec![],
        size_bytes: 48_300_000,
        rating: 4.7,
        rating_count: 128,
        publisher: "Obsidian Labs".into(),
        owned,
        tags: vec![category.into()],
        updated_at: "2026-06-01".into(),
        status,
        seller_id: seller_id.into(),
        rejection_reason: None,
        kind: "program".into(),
        billing_period: None,
        delivery_type: Some("file".into()),
        stock_count: None,
        code_content: None,
        code_language: None,
        faq: vec![],
        plans: vec![],
    }
}

pub fn products() -> Vec<Product> {
    use ProductStatus::*;
    vec![
        product("prd_001", "nightvault", "NightVault", "Zero-knowledge encrypted file vault", "security", 4900, true, Approved, "usr_me"),
        product("prd_002", "packetwraith", "PacketWraith", "Stealth network analysis toolkit", "tools", 12900, false, Approved, "usr_hollow"),
        product("prd_003", "ghostwrite", "GhostWrite", "Offline AI writing companion", "productivity", 0, false, Approved, "usr_quiet"),
        product("prd_004", "forgekit", "ForgeKit", "Reproducible build environments", "development", 7900, true, Approved, "usr_me"),
    ]
}

pub fn approved_products() -> Vec<Product> {
    products()
        .into_iter()
        .filter(|p| matches!(p.status, ProductStatus::Approved))
        .collect()
}

pub fn library() -> Vec<LibraryItem> {
    products()
        .into_iter()
        .filter(|p| p.owned)
        .map(|product| LibraryItem {
            license_id: format!("lic_{}", product.id),
            product,
            purchased_at: "2026-05-01".into(),
            state: serde_json::json!({ "kind": "not_downloaded" }),
        })
        .collect()
}

pub fn my_products() -> Vec<Product> {
    products()
        .into_iter()
        .filter(|p| p.seller_id == "usr_me")
        .collect()
}

pub fn current_user(username: &str) -> User {
    User {
        id: "usr_me".into(),
        username: username.into(),
        display_name: "you".into(),
        avatar_url: None,
        banner_image: None,
        background_image: None,
        bio: Some("Privacy maximalist.".into()),
        is_seller: true,
        is_moderator: true,
        is_admin: true,
        created_at: "2026-01-12".into(),
        seller: Some(seller_profile()),
        seller_status: Some("approved".into()),
        banned_until: None,
        ban_reason: None,
        free_name_change_used: false,
        name_change_fee_cents: 500,
    }
}

fn seller_profile() -> SellerProfile {
    SellerProfile {
        store_name: "Obsidian Labs".into(),
        store_slug: "obsidian-labs".into(),
        about: "Local-first, zero-knowledge tooling.".into(),
        rating: 4.7,
        rating_count: 539,
        total_sales: 1284,
        product_count: 2,
        joined_at: "2026-01-12".into(),
    }
}

pub fn seller_store(id: &str) -> SellerStore {
    SellerStore {
        seller: seller_profile(),
        seller_id: id.into(),
        products: approved_products(),
    }
}

pub fn moderation_queue() -> Vec<ModerationItem> {
    vec![ModerationItem {
        product: product("prd_pending_a", "meshdrop", "MeshDrop", "Anonymous file drop", "security", 1900, false, ProductStatus::PendingReview, "usr_hollow"),
        seller_name: "Hollow Point".into(),
        submitted_at: "2026-06-10".into(),
    }]
}

pub fn conversations() -> Vec<Conversation> {
    vec![Conversation {
        id: "cnv_1".into(),
        peer: ChatPeer { id: "usr_buyer1".into(), display_name: "anon_0x91".into(), avatar_url: None },
        product_id: Some("prd_001".into()),
        product_name: Some("NightVault".into()),
        last_message: Some(message("cnv_1", "usr_buyer1", "Is the key export air-gapped?", false)),
        unread: 1,
        updated_at: "2026-06-11T10:00:00Z".into(),
    }]
}

pub fn messages(conversation_id: &str) -> Vec<Message> {
    vec![
        message(conversation_id, "usr_buyer1", "Does NightVault support hidden volumes?", false),
        message(conversation_id, "usr_me", "Yes — on all desktop platforms.", true),
    ]
}

pub fn notifications() -> Vec<AppNotification> {
    vec![
        AppNotification { id: "ntf_1".into(), notif_type: "sale".into(), title: "New sale".into(), body: "NightVault (+$49.00)".into(), link: Some("/wallet".into()), read: false, created_at: "2026-06-12T10:00:00Z".into() },
        AppNotification { id: "ntf_2".into(), notif_type: "moderated".into(), title: "Listing approved".into(), body: "ObsidianCLI is now live.".into(), link: Some("/sell".into()), read: false, created_at: "2026-06-12T09:00:00Z".into() },
    ]
}

pub fn message(conversation_id: &str, sender_id: &str, body: &str, mine: bool) -> Message {
    Message {
        id: format!("msg_{}", body.len()),
        conversation_id: conversation_id.into(),
        sender_id: sender_id.into(),
        body: body.into(),
        sent_at: "2026-06-11T10:00:00Z".into(),
        mine,
    }
}

pub fn wallet() -> Wallet {
    Wallet {
        balance_cents: 25_000,
        currency: "USD".into(),
        pending_cents: 1_500,
        total_spent_cents: 12_900,
        total_earned_cents: 84_300,
        deposit_address: "84r00tShoPxMRdEpoSitAddr3ssExAmPLe9z7q2wK5vN8mYjH6bT4cF1gD0sR".into(),
        deposit_currency: "XMR".into(),
        withdraw_fee_percent: 2.0,
        withdraw_fee_flat_cents: 0,
    }
}

pub fn transactions() -> Vec<Transaction> {
    vec![
        txn("txn_1", TransactionType::Sale, 4_900, "Sale: NightVault license", TransactionStatus::Confirmed),
        txn("txn_2", TransactionType::Deposit, 20_000, "Deposit (XMR)", TransactionStatus::Confirmed),
        txn("txn_3", TransactionType::Purchase, -12_900, "Purchase: PacketWraith", TransactionStatus::Confirmed),
        txn("txn_4", TransactionType::Deposit, 1_500, "Deposit (XMR)", TransactionStatus::Pending),
    ]
}

fn txn(id: &str, tx_type: TransactionType, amount_cents: i64, description: &str, status: TransactionStatus) -> Transaction {
    Transaction {
        id: id.into(),
        tx_type,
        amount_cents,
        currency: "USD".into(),
        description: description.into(),
        created_at: "2026-06-10".into(),
        status,
    }
}

pub fn reviews(product_id: &str) -> Vec<Review> {
    vec![
        review(product_id, "usr_buyer1", "anon_0x91", 5.0, "Rock-solid. Saved me during a border crossing."),
        review(product_id, "usr_buyer2", "ghost_user", 4.0, "Great, though the key export has a learning curve."),
    ]
}

fn review(product_id: &str, author_id: &str, author_name: &str, rating: f32, body: &str) -> Review {
    Review {
        id: format!("rev_{}", body.len()),
        product_id: product_id.into(),
        author_id: author_id.into(),
        author_name: author_name.into(),
        rating,
        body: body.into(),
        created_at: "2026-06-01".into(),
        mine: false,
    }
}

pub fn subscriptions() -> Vec<Subscription> {
    let mut p = product("prd_010", "nightvault-cloud", "NightVault Cloud", "Encrypted off-site backups", "security", 900, true, ProductStatus::Approved, "usr_me");
    p.kind = "subscription".into();
    p.billing_period = Some("monthly".into());
    vec![Subscription {
        id: "sub_seed".into(),
        product: p,
        status: SubscriptionStatus::Active,
        billing_period: "monthly".into(),
        price_cents: 900,
        currency: "USD".into(),
        started_at: "2026-05-30".into(),
        current_period_end: "2026-06-29".into(),
        auto_renew: true,
    }]
}

pub fn delivery(product_id: &str) -> DigitalDelivery {
    DigitalDelivery {
        product_id: product_id.into(),
        delivery_type: "license_key".into(),
        content: "OBS-7F3A-91C2-4D5E-XK20".into(),
        instructions: Some("Enter this key in Settings → Activate.".into()),
        language: None,
        line_count: None,
        seller_id: None,
        items: None,
        count: None,
    }
}
