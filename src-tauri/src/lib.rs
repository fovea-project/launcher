//! r00tshop core library. The webview talks only to the commands registered
//! here; all network access happens in Rust, over HTTPS (origin behind a
//! Cloudflare Tunnel).

mod commands;
mod config;
mod connection;
mod error;
mod http;
#[cfg(feature = "mock-network")]
mod mockdata;
mod models;
mod storage;

use config::AppConfig;
use connection::{ConnectionManager, TauriEmitter};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Logs to stderr; set RUST_LOG=r00tshop=debug for detail.
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "r00tshop=info,warn".into()),
        )
        .try_init();

    // Load runtime config (backend base URL). A failure here is surfaced as an
    // error connection status rather than a crash, so the UI can explain.
    let config_result = AppConfig::load();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(move |app| {
            let handle = app.handle().clone();
            let emitter = TauriEmitter { app: handle };

            match &config_result {
                Ok(cfg) => {
                    let manager = ConnectionManager::new(cfg.clone());
                    app.manage(manager.clone());
                    // Mark the connection ready in the background — never blocks
                    // the window.
                    manager.spawn_ready(emitter);
                }
                Err(e) => {
                    // Still register a manager so commands resolve; it will report
                    // the configuration error as the connection status.
                    use crate::connection::Emit;
                    use crate::models::ConnectionStatus;
                    emitter.emit_status(&ConnectionStatus::error(format!(
                        "Configuration error: {e}"
                    )));
                    // A minimal placeholder config keeps the type happy; every
                    // network command will fail fast.
                    let fallback = AppConfig::placeholder();
                    let manager = ConnectionManager::new(fallback);
                    app.manage(manager);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connection_status,
            commands::restart_app,
            commands::login,
            commands::logout,
            commands::current_session,
            commands::get_products,
            commands::get_product,
            commands::get_library,
            commands::download_item,
            // marketplace
            commands::get_profile,
            commands::update_profile,
            commands::recover,
            commands::change_display_name,
            commands::become_seller,
            commands::get_seller_store,
            commands::get_user,
            commands::get_my_products,
            commands::get_seller_sales,
            commands::create_product,
            commands::update_product,
            commands::submit_for_review,
            commands::delete_product,
            commands::ban_user,
            commands::get_conversations,
            commands::get_messages,
            commands::send_message,
            commands::start_conversation,
            // wallet & reviews
            commands::get_wallet,
            commands::get_transactions,
            commands::create_deposit,
            commands::check_deposit,
            commands::get_pending_deposits,
            commands::cancel_deposit,
            commands::create_withdrawal,
            commands::get_withdrawals,
            commands::purchase_product,
            commands::get_reviews,
            commands::add_review,
            commands::get_image,
            commands::get_chat,
            commands::send_chat,
            commands::delete_chat_message,
            commands::get_topics,
            commands::get_topic,
            commands::create_topic,
            commands::reply_topic,
            commands::delete_topic,
            commands::delete_topic_post,
            // subscriptions & delivery
            commands::get_subscriptions,
            commands::subscribe_product,
            commands::cancel_subscription,
            commands::resume_subscription,
            commands::get_delivery,
            // seller stock inventory
            commands::inventory_summary,
            commands::add_inventory,
            commands::clear_inventory,
            // seller marketplace API
            commands::marketplace_settings,
            commands::regenerate_api_key,
            commands::set_webhook,
            commands::test_webhook,
            commands::seller_sales,
            // notifications
            commands::get_notifications,
            commands::mark_notification_read,
            commands::mark_all_notifications_read,
        ])
        .run(tauri::generate_context!())
        .expect("error while running r00tshop");
}

// Marker so we can build a placeholder config when the real one fails to load.
impl AppConfig {
    fn placeholder() -> Self {
        use config::BackendConfig;
        AppConfig {
            backend: BackendConfig {
                api_base: "/api".into(),
                base_url: "https://shop.fovea-project.com".into(),
            },
        }
    }
}
