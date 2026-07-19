# Fovea Launcher

The desktop client for the Fovea store, built with **Tauri**. The webview does
no networking itself — all traffic goes through the Rust core over HTTPS.

This is the **public user edition**: it contains the storefront, library,
wallet, messaging and seller tools. Staff-only areas (moderation, administration)
are not part of this build.

## Develop

```bash
npm install
npm run tauri dev      # desktop app
npm run dev            # browser mock (no backend required)
```

## Build

```bash
npm run tauri build
```

Configuration lives in `src-tauri/r00tshop.toml` (copy from
`r00tshop.example.toml`); it is not committed.
