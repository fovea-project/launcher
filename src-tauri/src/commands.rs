//! Tauri commands — the only surface the webview can call. Each one runs in the
//! Rust core, performs any network I/O over HTTPS, and returns plain data.

use std::sync::Arc;

use crate::connection::ConnectionManager;
use crate::error::{CoreError, Result};
use crate::models::*;
use crate::storage;
use tauri::State;

type Core<'a> = State<'a, Arc<ConnectionManager>>;

/// Current connection snapshot. The frontend also receives live updates on the
/// `conn://status` event, but uses this to read the value on mount.
#[tauri::command]
pub async fn connection_status(core: Core<'_>) -> std::result::Result<ConnectionStatus, String> {
    Ok(core.status().await)
}

/// Restart the whole app process — used by the "Retry" button on the connecting
/// screen. A webview reload alone wouldn't restart the core.
#[tauri::command]
pub async fn restart_app(app: tauri::AppHandle) -> std::result::Result<(), String> {
    app.restart();
}

/// Authenticate against the backend, store the JWT securely, and return the
/// session. The token is held in the OS keychain and attached to every
/// subsequent request by the core — it is never returned to or stored by the UI
/// beyond this session object.
#[tauri::command]
pub async fn login(
    core: Core<'_>,
    username: String,
    password: String,
) -> std::result::Result<AuthSession, String> {
    let session = do_login(&core, &username, &password).await?;
    storage::save_session(&session)?;
    Ok(session)
}

#[tauri::command]
pub async fn logout() -> std::result::Result<(), String> {
    storage::clear_session()?;
    Ok(())
}

#[tauri::command]
pub async fn current_session() -> std::result::Result<Option<AuthSession>, String> {
    Ok(storage::load_session()?)
}

#[tauri::command]
pub async fn get_products(core: Core<'_>) -> std::result::Result<Vec<Product>, String> {
    Ok(fetch_products(&core).await?)
}

#[tauri::command]
pub async fn get_product(core: Core<'_>, id: String) -> std::result::Result<Product, String> {
    Ok(fetch_product(&core, &id).await?)
}

#[tauri::command]
pub async fn get_library(core: Core<'_>) -> std::result::Result<Vec<LibraryItem>, String> {
    Ok(fetch_library(&core).await?)
}

/// Request the encrypted artifact and its decryption key. The backend only
/// releases the key after verifying the caller's license against the JWT.
#[tauri::command]
pub async fn download_item(
    core: Core<'_>,
    id: String,
) -> std::result::Result<DownloadBundle, String> {
    Ok(fetch_download(&core, &id).await?)
}

// ---------------------------------------------------------------------------
// helpers — real network path
// ---------------------------------------------------------------------------

fn jwt() -> Result<String> {
    storage::current_jwt()?.ok_or(CoreError::Unauthorized)
}

#[cfg(not(feature = "mock-network"))]
async fn do_login(core: &Core<'_>, username: &str, password: &str) -> Result<AuthSession> {
    let body = serde_json::to_vec(&LoginRequest { username, password })?;
    let path = core.config().api_path("login");
    let resp = core.request("POST", &path, Some(body), None).await?;
    if !resp.is_success() {
        // Surface a moderation ban as a clean, readable message.
        if resp.status == 403 {
            if let Ok(v) = serde_json::from_slice::<serde_json::Value>(&resp.body) {
                let detail = v.get("detail").unwrap_or(&v);
                if detail.get("code").and_then(|c| c.as_str()) == Some("banned") {
                    let msg = detail
                        .get("message")
                        .and_then(|m| m.as_str())
                        .unwrap_or("Account suspended.");
                    return Err(CoreError::Banned(msg.to_string()));
                }
            }
        }
        return Err(CoreError::Http { status: resp.status, body: resp.text() });
    }
    let parsed: LoginResponse = serde_json::from_slice(&resp.body)?;
    let expires_at = if parsed.expires_at != 0 {
        parsed.expires_at
    } else {
        now_secs() + 3600
    };
    Ok(AuthSession { jwt: parsed.jwt, username: username.to_string(), expires_at })
}

#[cfg(not(feature = "mock-network"))]
async fn get_json<T: serde::de::DeserializeOwned>(core: &Core<'_>, path: &str) -> Result<T> {
    let resp = core.request("GET", path, None, Some(jwt()?)).await?;
    if resp.status == 401 {
        return Err(CoreError::Unauthorized);
    }
    if !resp.is_success() {
        return Err(CoreError::Http { status: resp.status, body: resp.text() });
    }
    Ok(serde_json::from_slice(&resp.body)?)
}

#[cfg(not(feature = "mock-network"))]
async fn fetch_products(core: &Core<'_>) -> Result<Vec<Product>> {
    get_json(core, &core.config().api_path("products")).await
}

#[cfg(not(feature = "mock-network"))]
async fn fetch_product(core: &Core<'_>, id: &str) -> Result<Product> {
    get_json(core, &core.config().api_path(&format!("products/{id}"))).await
}

#[cfg(not(feature = "mock-network"))]
async fn fetch_library(core: &Core<'_>) -> Result<Vec<LibraryItem>> {
    get_json(core, &core.config().api_path("library")).await
}

#[cfg(not(feature = "mock-network"))]
async fn fetch_download(core: &Core<'_>, id: &str) -> Result<DownloadBundle> {
    get_json(core, &core.config().api_path(&format!("download/{id}"))).await
}

#[cfg(not(feature = "mock-network"))]
fn now_secs() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

// ---------------------------------------------------------------------------
// helpers — mock-network path (no Arti / no backend required)
// ---------------------------------------------------------------------------

#[cfg(feature = "mock-network")]
async fn do_login(_core: &Core<'_>, username: &str, password: &str) -> Result<AuthSession> {
    if username.is_empty() || password.is_empty() {
        return Err(CoreError::Http { status: 400, body: "missing credentials".into() });
    }
    Ok(AuthSession { jwt: "mock.jwt.token".into(), username: username.into(), expires_at: 0 })
}

#[cfg(feature = "mock-network")]
async fn fetch_products(_core: &Core<'_>) -> Result<Vec<Product>> {
    Ok(crate::mockdata::approved_products())
}

#[cfg(feature = "mock-network")]
fn mock_managed(id: &str) -> ManagedUser {
    ManagedUser {
        id: id.into(),
        username: "user".into(),
        display_name: "user".into(),
        is_seller: false,
        is_moderator: false,
        is_admin: false,
        seller_status: None,
        banned_until: None,
        ban_reason: None,
        created_at: "2026-01-01".into(),
    }
}

#[cfg(feature = "mock-network")]
async fn fetch_product(_core: &Core<'_>, id: &str) -> Result<Product> {
    crate::mockdata::products()
        .into_iter()
        .find(|p| p.id == id || p.slug == id)
        .ok_or(CoreError::Http { status: 404, body: "not found".into() })
}

#[cfg(feature = "mock-network")]
async fn fetch_library(_core: &Core<'_>) -> Result<Vec<LibraryItem>> {
    Ok(crate::mockdata::library())
}

#[cfg(feature = "mock-network")]
async fn fetch_download(_core: &Core<'_>, id: &str) -> Result<DownloadBundle> {
    Ok(DownloadBundle {
        product_id: id.into(),
        license_id: format!("lic_{id}"),
        filename: format!("{id}.bin"),
        ciphertext_b64: String::new(),
        key_b64: "bW9jay1rZXk=".into(),
        nonce_b64: "bW9jay1ub25jZQ==".into(),
        size_bytes: 0,
        sha256: "0".repeat(64),
    })
}

// ===========================================================================
// Marketplace: profiles, seller listings, moderation, messaging
// ===========================================================================

#[tauri::command]
pub async fn get_profile(core: Core<'_>) -> std::result::Result<User, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("profile")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        let username = storage::load_session()?.map(|s| s.username).unwrap_or_else(|| "you".into());
        return Ok(crate::mockdata::current_user(&username));
    }
}

#[tauri::command]
pub async fn update_profile(core: Core<'_>, input: ProfileInput) -> std::result::Result<User, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "PUT", &core.config().api_path("profile"), Some(to_value(&input)?)).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        let mut u = crate::mockdata::current_user("you@fovea.shop");
        u.display_name = input.display_name;
        u.bio = Some(input.bio);
        return Ok(u);
    }
}

#[tauri::command]
pub async fn become_seller(core: Core<'_>, input: SellerInput) -> std::result::Result<User, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path("seller"), Some(to_value(&input)?)).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, &input);
        return Ok(crate::mockdata::current_user("you@fovea.shop"));
    }
}

/// Recover an account with its seed phrase: sets a new password and logs in.
/// Returns the fresh session (also persisted).
#[tauri::command]
pub async fn recover(
    core: Core<'_>,
    username: String,
    seed_phrase: String,
    new_password: String,
) -> std::result::Result<AuthSession, String> {
    #[cfg(not(feature = "mock-network"))]
    {
        let body = serde_json::json!({ "username": username, "seedPhrase": seed_phrase, "newPassword": new_password });
        let resp = core.request("POST", &core.config().api_path("auth/recover"), Some(serde_json::to_vec(&body).map_err(|e| e.to_string())?), None).await.map_err(|e| e.to_string())?;
        if !resp.is_success() {
            return Err(resp.text());
        }
        let parsed: LoginResponse = serde_json::from_slice(&resp.body).map_err(|e| e.to_string())?;
        let session = AuthSession { jwt: parsed.jwt, username: username.clone(), expires_at: if parsed.expires_at != 0 { parsed.expires_at } else { now_secs() + 3600 } };
        storage::save_session(&session)?;
        return Ok(session);
    }
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, &seed_phrase, &new_password);
        let session = AuthSession { jwt: "mock.jwt.token".into(), username, expires_at: 0 };
        return Ok(session);
    }
}

/// Change the display name. First change is free; subsequent ones are charged
/// the account's `name_change_fee_cents` (enforced server-side).
#[tauri::command]
pub async fn change_display_name(
    core: Core<'_>,
    display_name: String,
) -> std::result::Result<User, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path("account/display-name"), Some(serde_json::json!({ "displayName": display_name }))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        let mut u = crate::mockdata::current_user("you@fovea.shop");
        u.display_name = display_name;
        u.free_name_change_used = true;
        return Ok(u);
    }
}

#[tauri::command]
pub async fn get_seller_store(core: Core<'_>, id: String) -> std::result::Result<SellerStore, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path(&format!("sellers/{id}"))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::seller_store(&id));
    }
}

#[tauri::command]
pub async fn get_user(core: Core<'_>, id: String) -> std::result::Result<PublicUser, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path(&format!("users/{id}"))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id);
        return Err("unavailable in mock build".into());
    }
}

#[tauri::command]
pub async fn get_seller_sales(core: Core<'_>) -> std::result::Result<Vec<SalesPoint>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("seller/sales")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(vec![]);
    }
}

#[tauri::command]
pub async fn get_my_products(core: Core<'_>) -> std::result::Result<Vec<Product>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("seller/products")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::my_products());
    }
}

#[tauri::command]
pub async fn create_product(core: Core<'_>, input: ProductInput) -> std::result::Result<Product, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path("seller/products"), Some(to_value(&input)?)).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(mock_product_from_input("prd_new", input, ProductStatus::Draft));
    }
}

#[tauri::command]
pub async fn update_product(core: Core<'_>, id: String, input: ProductInput) -> std::result::Result<Product, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "PUT", &core.config().api_path(&format!("seller/products/{id}")), Some(to_value(&input)?)).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(mock_product_from_input(&id, input, ProductStatus::Draft));
    }
}

#[tauri::command]
pub async fn submit_for_review(core: Core<'_>, id: String) -> std::result::Result<Product, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path(&format!("seller/products/{id}/submit")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        let mut p = crate::mockdata::my_products().into_iter().next().unwrap();
        p.id = id;
        p.status = ProductStatus::PendingReview;
        return Ok(p);
    }
}

#[tauri::command]
pub async fn delete_product(core: Core<'_>, id: String) -> std::result::Result<(), String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_void(&core, "DELETE", &core.config().api_path(&format!("seller/products/{id}")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id);
        return Ok(());
    }
}


// Chat quick-ban (global chat): kept in the public edition — gated on the
// caller's moderator flag and enforced server-side.
#[tauri::command]
pub async fn ban_user(core: Core<'_>, user_id: String, input: BanInput) -> std::result::Result<ManagedUser, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path(&format!("users/{user_id}/ban")), Some(to_value(&input)?)).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, &input);
        return Ok(mock_managed(&user_id));
    }
}


#[tauri::command]
pub async fn get_conversations(core: Core<'_>) -> std::result::Result<Vec<Conversation>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("conversations")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::conversations());
    }
}

#[tauri::command]
pub async fn get_messages(
    core: Core<'_>,
    conversation_id: String,
) -> std::result::Result<Vec<Message>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path(&format!("conversations/{conversation_id}/messages"))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::messages(&conversation_id));
    }
}

#[tauri::command]
pub async fn send_message(
    core: Core<'_>,
    conversation_id: String,
    body: String,
) -> std::result::Result<Message, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(
        &core,
        "POST",
        &core.config().api_path(&format!("conversations/{conversation_id}/messages")),
        Some(serde_json::json!({ "body": body })),
    )
    .await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::message(&conversation_id, "usr_me", &body, true));
    }
}

#[tauri::command]
pub async fn start_conversation(
    core: Core<'_>,
    peer_id: String,
    product_id: Option<String>,
) -> std::result::Result<Conversation, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(
        &core,
        "POST",
        &core.config().api_path("conversations"),
        Some(serde_json::json!({ "peerId": peer_id, "productId": product_id })),
    )
    .await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(Conversation {
            id: "cnv_new".into(),
            peer: crate::models::ChatPeer { id: peer_id, display_name: "Seller".into(), avatar_url: None },
            product_id,
            product_name: None,
            last_message: None,
            unread: 0,
            updated_at: "2026-06-11T10:00:00Z".into(),
        });
    }
}

// ===========================================================================
// Wallet, payments & reviews
// ===========================================================================

#[tauri::command]
pub async fn get_wallet(core: Core<'_>) -> std::result::Result<Wallet, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("wallet")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::wallet());
    }
}

#[tauri::command]
pub async fn get_transactions(core: Core<'_>) -> std::result::Result<Vec<Transaction>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("wallet/transactions")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::transactions());
    }
}

/// Start a wallet top-up via `method` ("cryptobot" | "monero" | "ton"). The
/// backend returns the payment requirements; the balance is credited only after
/// the payment is confirmed on the provider/chain.
#[tauri::command]
pub async fn create_deposit(core: Core<'_>, method: String, amount_usd_cents: i64, asset: String) -> std::result::Result<DepositIntent, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path(&format!("wallet/deposit/{method}")), Some(serde_json::json!({ "amountCents": amount_usd_cents, "asset": asset }))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &asset;
        let _ = &core;
        return Ok(DepositIntent {
            deposit_id: format!("mock-{amount_usd_cents}"),
            method,
            status: "active".into(),
            amount_usd_cents,
            asset,
            pay_url: "https://t.me/CryptoBot".into(),
            pay_address: String::new(),
            pay_comment: String::new(),
            pay_amount: String::new(),
        });
    }
}

/// Poll a deposit; the backend credits the wallet on first confirmed payment.
#[tauri::command]
pub async fn check_deposit(core: Core<'_>, deposit_id: String) -> std::result::Result<DepositIntent, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path(&format!("wallet/deposit/{deposit_id}"))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(DepositIntent {
            deposit_id, method: "cryptobot".into(), status: "paid".into(), amount_usd_cents: 0,
            asset: String::new(), pay_url: String::new(), pay_address: String::new(),
            pay_comment: String::new(), pay_amount: String::new(),
        });
    }
}

/// The user's still-unpaid top-ups, so the wallet can resume them after a restart.
#[tauri::command]
pub async fn get_pending_deposits(core: Core<'_>) -> std::result::Result<Vec<DepositIntent>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("wallet/deposits/pending")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(Vec::new());
    }
}

/// Cancel an unpaid top-up so it drops off the "awaiting payment" list.
#[tauri::command]
pub async fn cancel_deposit(core: Core<'_>, deposit_id: String) -> std::result::Result<DepositIntent, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path(&format!("wallet/deposit/{deposit_id}/cancel")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(DepositIntent {
            deposit_id, method: "cryptobot".into(), status: "expired".into(), amount_usd_cents: 0,
            asset: String::new(), pay_url: String::new(), pay_address: String::new(),
            pay_comment: String::new(), pay_amount: String::new(),
        });
    }
}

/// Request a payout. Debits (holds) the balance; the operator fulfills it.
#[tauri::command]
pub async fn create_withdrawal(core: Core<'_>, method: String, amount_cents: i64, address: String) -> std::result::Result<Withdrawal, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path("wallet/withdraw"), Some(serde_json::json!({ "amountCents": amount_cents, "method": method, "address": address }))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, &address);
        return Ok(Withdrawal {
            id: format!("wd-{amount_cents}"), method, asset: "XMR".into(), address,
            amount_cents, fee_cents: 0, net_cents: amount_cents, status: "pending".into(),
            reason: String::new(), txid: String::new(), created_at: String::new(), processed_at: None,
        });
    }
}

/// The current user's payout requests and their statuses.
#[tauri::command]
pub async fn get_withdrawals(core: Core<'_>) -> std::result::Result<Vec<Withdrawal>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("wallet/withdrawals")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(Vec::new());
    }
}


#[tauri::command]
pub async fn purchase_product(core: Core<'_>, id: String, plan_index: Option<usize>) -> std::result::Result<Product, String> {
    #[cfg(not(feature = "mock-network"))]
    {
        let body = plan_index.map(|i| serde_json::json!({ "planIndex": i }));
        return Ok(req_send(&core, "POST", &core.config().api_path(&format!("products/{id}/purchase")), body).await?);
    }
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, plan_index);
        let mut p = crate::mockdata::products()
            .into_iter()
            .find(|p| p.id == id || p.slug == id)
            .ok_or(CoreError::Http { status: 404, body: "not found".into() })?;
        p.owned = true;
        return Ok(p);
    }
}

/// In-memory cache of fetched images (ref filename -> data: URI). Images are
/// immutable (content-addressed names), so a fetched copy is valid forever.
#[cfg(not(feature = "mock-network"))]
fn image_cache() -> &'static std::sync::Mutex<std::collections::HashMap<String, String>> {
    static CACHE: std::sync::OnceLock<std::sync::Mutex<std::collections::HashMap<String, String>>> =
        std::sync::OnceLock::new();
    CACHE.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()))
}

/// Fetch a product image by filename over HTTPS and return it as a data: URI the
/// webview can render. Inline images (placeholder/mock data: URIs) pass through
/// untouched. Results are cached so each image is fetched at most once.
#[tauri::command]
pub async fn get_image(core: Core<'_>, path: String) -> std::result::Result<String, String> {
    if path.is_empty() || path.starts_with("data:") {
        return Ok(path);
    }
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(path);
    }
    #[cfg(not(feature = "mock-network"))]
    {
        if let Some(hit) = image_cache().lock().unwrap().get(&path).cloned() {
            return Ok(hit);
        }
        // Defend against path traversal — only bare filenames are valid refs.
        if path.contains('/') || path.contains('\\') || path.contains("..") {
            return Err("invalid image reference".into());
        }
        let api = core.config().api_path(&format!("images/{path}"));
        let resp = core
            .request("GET", &api, None, Some(jwt()?))
            .await
            .map_err(|e| e.to_string())?;
        if resp.status != 200 {
            return Err(format!("image fetch failed: HTTP {}", resp.status));
        }
        let ct = resp
            .headers
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("content-type"))
            .map(|(_, v)| v.clone())
            .unwrap_or_else(|| "image/png".into());
        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&resp.body);
        let uri = format!("data:{ct};base64,{b64}");
        image_cache().lock().unwrap().insert(path, uri.clone());
        Ok(uri)
    }
}

#[tauri::command]
pub async fn get_reviews(core: Core<'_>, product_id: String) -> std::result::Result<Vec<Review>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path(&format!("products/{product_id}/reviews"))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::reviews(&product_id));
    }
}

#[tauri::command]
pub async fn add_review(
    core: Core<'_>,
    product_id: String,
    input: ReviewInput,
) -> std::result::Result<Review, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path(&format!("products/{product_id}/reviews")), Some(to_value(&input)?)).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(Review {
            id: "rev_new".into(),
            product_id,
            author_id: "usr_me".into(),
            author_name: "you".into(),
            rating: input.rating,
            body: input.body,
            created_at: "2026-06-11".into(),
            mine: true,
        });
    }
}

// ===========================================================================
// Global chat
// ===========================================================================

#[tauri::command]
pub async fn get_chat(core: Core<'_>) -> std::result::Result<Vec<ChatMessage>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("chat")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(vec![]);
    }
}

#[tauri::command]
pub async fn send_chat(core: Core<'_>, input: ChatInput) -> std::result::Result<ChatMessage, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path("chat"), Some(to_value(&input)?)).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(ChatMessage {
            id: "msg_new".into(),
            user_id: "usr_me".into(),
            author_name: "you".into(),
            author_role: Some("admin".into()),
            author_avatar: None,
            reply_to: None,
            body: input.body,
            image: input.image,
            created_at: "2026-06-25T00:00:00Z".into(),
            mine: true,
            can_moderate: false,
        });
    }
}

#[tauri::command]
pub async fn delete_chat_message(core: Core<'_>, id: String) -> std::result::Result<(), String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_void(&core, "DELETE", &core.config().api_path(&format!("chat/{id}")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id);
        return Ok(());
    }
}

#[tauri::command]
pub async fn get_topics(core: Core<'_>) -> std::result::Result<Vec<ChatTopic>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("topics")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(vec![]);
    }
}

#[tauri::command]
pub async fn get_topic(core: Core<'_>, id: String) -> std::result::Result<ChatTopicDetail, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path(&format!("topics/{id}"))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id);
        return Err("unavailable in mock build".into());
    }
}

#[tauri::command]
pub async fn create_topic(core: Core<'_>, input: TopicInput) -> std::result::Result<ChatTopic, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path("topics"), Some(to_value(&input)?)).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, input);
        return Err("unavailable in mock build".into());
    }
}

#[tauri::command]
pub async fn reply_topic(core: Core<'_>, topic_id: String, body: String) -> std::result::Result<ChatTopicPost, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path(&format!("topics/{topic_id}/posts")), Some(serde_json::json!({ "body": body }))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, topic_id, body);
        return Err("unavailable in mock build".into());
    }
}

#[tauri::command]
pub async fn delete_topic(core: Core<'_>, id: String) -> std::result::Result<(), String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_void(&core, "DELETE", &core.config().api_path(&format!("topics/{id}")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id);
        return Ok(());
    }
}

#[tauri::command]
pub async fn delete_topic_post(core: Core<'_>, id: String) -> std::result::Result<(), String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_void(&core, "DELETE", &core.config().api_path(&format!("topic-posts/{id}")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id);
        return Ok(());
    }
}

// ===========================================================================
// Subscriptions & digital delivery
// ===========================================================================

#[tauri::command]
pub async fn get_subscriptions(core: Core<'_>) -> std::result::Result<Vec<Subscription>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("subscriptions")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::subscriptions());
    }
}

#[tauri::command]
pub async fn subscribe_product(core: Core<'_>, id: String, plan_index: Option<usize>) -> std::result::Result<Subscription, String> {
    #[cfg(not(feature = "mock-network"))]
    {
        let body = plan_index.map(|i| serde_json::json!({ "planIndex": i }));
        return Ok(req_send(&core, "POST", &core.config().api_path(&format!("products/{id}/subscribe")), body).await?);
    }
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id, plan_index);
        return Ok(crate::mockdata::subscriptions().into_iter().next().unwrap());
    }
}

#[tauri::command]
pub async fn cancel_subscription(core: Core<'_>, id: String) -> std::result::Result<Subscription, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path(&format!("subscriptions/{id}/cancel")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id);
        let mut s = crate::mockdata::subscriptions().into_iter().next().unwrap();
        s.auto_renew = false;
        return Ok(s);
    }
}

#[tauri::command]
pub async fn resume_subscription(core: Core<'_>, id: String) -> std::result::Result<Subscription, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path(&format!("subscriptions/{id}/resume")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id);
        return Ok(crate::mockdata::subscriptions().into_iter().next().unwrap());
    }
}

#[tauri::command]
pub async fn get_delivery(core: Core<'_>, product_id: String) -> std::result::Result<DigitalDelivery, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path(&format!("products/{product_id}/delivery"))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::delivery(&product_id));
    }
}

// ===========================================================================
// Seller stock inventory (account listings)
// ===========================================================================

#[tauri::command]
pub async fn inventory_summary(core: Core<'_>, product_id: String) -> std::result::Result<InventorySummary, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path(&format!("seller/products/{product_id}/inventory"))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(InventorySummary { product_id, available: 42, sold: 8, total: 50 });
    }
}

#[tauri::command]
pub async fn add_inventory(core: Core<'_>, product_id: String, raw: String) -> std::result::Result<InventoryUploadResult, String> {
    #[cfg(not(feature = "mock-network"))]
    {
        let body = serde_json::json!({ "raw": raw });
        return Ok(req_send(&core, "POST", &core.config().api_path(&format!("seller/products/{product_id}/inventory")), Some(body)).await?);
    }
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        let added = raw.lines().filter(|l| !l.trim().is_empty()).count() as i64;
        return Ok(InventoryUploadResult { product_id, added, available: added });
    }
}

#[tauri::command]
pub async fn clear_inventory(core: Core<'_>, product_id: String) -> std::result::Result<(), String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_void(&core, "DELETE", &core.config().api_path(&format!("seller/products/{product_id}/inventory")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, product_id);
        return Ok(());
    }
}

// ===========================================================================
// Seller marketplace API (sales feed + outbound webhook)
// ===========================================================================

#[tauri::command]
pub async fn marketplace_settings(core: Core<'_>) -> std::result::Result<MarketplaceSettings, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("seller/marketplace")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(MarketplaceSettings {
            api_key: "fvsk_demo_0123456789abcdef".into(),
            webhook_url: String::new(),
            sales_endpoint: "/api/seller/sales".into(),
        });
    }
}

#[tauri::command]
pub async fn regenerate_api_key(core: Core<'_>) -> std::result::Result<MarketplaceSettings, String> {
    #[cfg(not(feature = "mock-network"))]
    {
        let r: serde_json::Value = req_send(&core, "POST", &core.config().api_path("seller/api-key"), None).await?;
        let key = r.get("apiKey").and_then(|v| v.as_str()).unwrap_or_default().to_string();
        return Ok(MarketplaceSettings { api_key: key, webhook_url: String::new(), sales_endpoint: "/api/seller/sales".into() });
    }
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(MarketplaceSettings { api_key: "fvsk_demo_regenerated_key".into(), webhook_url: String::new(), sales_endpoint: "/api/seller/sales".into() });
    }
}

#[tauri::command]
pub async fn set_webhook(core: Core<'_>, url: String) -> std::result::Result<MarketplaceSettings, String> {
    #[cfg(not(feature = "mock-network"))]
    {
        let body = serde_json::json!({ "url": url });
        let r: serde_json::Value = req_send(&core, "PUT", &core.config().api_path("seller/webhook"), Some(body)).await?;
        let wh = r.get("webhookUrl").and_then(|v| v.as_str()).unwrap_or_default().to_string();
        return Ok(MarketplaceSettings { api_key: String::new(), webhook_url: wh, sales_endpoint: "/api/seller/sales".into() });
    }
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(MarketplaceSettings { api_key: String::new(), webhook_url: url, sales_endpoint: "/api/seller/sales".into() });
    }
}

#[tauri::command]
pub async fn test_webhook(core: Core<'_>) -> std::result::Result<WebhookTestResult, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_send(&core, "POST", &core.config().api_path("seller/webhook/test"), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(WebhookTestResult { ok: true, status: 200 });
    }
}

#[tauri::command]
pub async fn seller_sales(core: Core<'_>, since: i64, limit: i64) -> std::result::Result<SalesPage, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path(&format!("seller/sales-feed?since={since}&limit={limit}"))).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, since, limit);
        return Ok(SalesPage { cursor: 0, sales: vec![] });
    }
}

// ===========================================================================
// Notifications
// ===========================================================================

#[tauri::command]
pub async fn get_notifications(core: Core<'_>) -> std::result::Result<Vec<AppNotification>, String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_get(&core, &core.config().api_path("notifications")).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(crate::mockdata::notifications());
    }
}

#[tauri::command]
pub async fn mark_notification_read(core: Core<'_>, id: String) -> std::result::Result<(), String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_void(&core, "POST", &core.config().api_path(&format!("notifications/{id}/read")), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = (&core, id);
        return Ok(());
    }
}

#[tauri::command]
pub async fn mark_all_notifications_read(core: Core<'_>) -> std::result::Result<(), String> {
    #[cfg(not(feature = "mock-network"))]
    return Ok(req_void(&core, "POST", &core.config().api_path("notifications/read-all"), None).await?);
    #[cfg(feature = "mock-network")]
    {
        let _ = &core;
        return Ok(());
    }
}

// ---------------------------------------------------------------------------
// shared request helpers (real network path)
// ---------------------------------------------------------------------------

#[cfg(not(feature = "mock-network"))]
async fn req_get<T: serde::de::DeserializeOwned>(core: &Core<'_>, path: &str) -> Result<T> {
    let resp = core.request("GET", path, None, Some(jwt()?)).await?;
    check_resp(&resp)?;
    Ok(serde_json::from_slice(&resp.body)?)
}

#[cfg(not(feature = "mock-network"))]
async fn req_send<T: serde::de::DeserializeOwned>(
    core: &Core<'_>,
    method: &str,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<T> {
    let bytes = match body {
        Some(v) => Some(serde_json::to_vec(&v)?),
        None => None,
    };
    let resp = core.request(method, path, bytes, Some(jwt()?)).await?;
    check_resp(&resp)?;
    Ok(serde_json::from_slice(&resp.body)?)
}

#[cfg(not(feature = "mock-network"))]
async fn req_void(
    core: &Core<'_>,
    method: &str,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<()> {
    let bytes = match body {
        Some(v) => Some(serde_json::to_vec(&v)?),
        None => None,
    };
    let resp = core.request(method, path, bytes, Some(jwt()?)).await?;
    check_resp(&resp)?;
    Ok(())
}

/// Serialize a request body, mapping the error straight to a String so it works
/// with `?` inside the command functions (which return `Result<_, String>`).
#[cfg(not(feature = "mock-network"))]
fn to_value<T: serde::Serialize>(v: &T) -> std::result::Result<serde_json::Value, String> {
    serde_json::to_value(v).map_err(|e| e.to_string())
}

/// Percent-encode a query-string value (keeps the HTTP request line well-formed).
#[cfg(not(feature = "mock-network"))]
fn enc_query(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

#[cfg(not(feature = "mock-network"))]
fn check_resp(resp: &crate::http::Response) -> Result<()> {
    if resp.status == 401 {
        return Err(CoreError::Unauthorized);
    }
    if !resp.is_success() {
        return Err(CoreError::Http { status: resp.status, body: resp.text() });
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// mock helpers
// ---------------------------------------------------------------------------

#[cfg(feature = "mock-network")]
fn mock_product_from_input(id: &str, input: ProductInput, status: ProductStatus) -> Product {
    Product {
        id: id.into(),
        slug: input.name.to_lowercase().replace(' ', "-"),
        name: input.name,
        tagline: input.tagline,
        description: input.description,
        category: input.category,
        version: input.version,
        price_cents: input.price_cents,
        currency: "USD".into(),
        icon_image: input.icon_url.clone(),
        icon_url: input.icon_url.unwrap_or_else(|| "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='%23222'/></svg>".into()),
        cover_image: input.cover_image,
        banner_image: input.banner_image,
        size_bytes: 0,
        rating: 0.0,
        rating_count: 0,
        publisher: "Obsidian Labs".into(),
        owned: false,
        tags: input.tags,
        updated_at: "2026-06-11".into(),
        status,
        seller_id: "usr_me".into(),
        rejection_reason: None,
        kind: input.kind,
        billing_period: input.billing_period,
        delivery_type: input.delivery_type,
        stock_count: None,
        code_content: input.code_content,
        code_language: input.code_language,
        screenshots: input.screenshots,
        faq: input.faq,
        plans: input.plans,
    }
}
