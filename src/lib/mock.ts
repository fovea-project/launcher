// Base mock catalog + Tor bootstrap simulation, used when the app runs in a
// plain browser (no Tauri runtime). The stateful marketplace demo (profiles,
// seller listings, moderation, chats) lives in `mockStore.ts`, which seeds from
// the catalog below.

import type {
  BillingPeriod,
  DeliveryKind,
  Product,
  ProductKind,
  ProductStatus,
  ConnectionStatus,
} from "@/types/api";

const cover = (hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},65%,22%)"/><stop offset="1" stop-color="hsl(${hue + 40},70%,12%)"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="200" cy="170" r="70" fill="hsla(${hue},80%,60%,0.25)"/></svg>`,
  )}`;

export const swatch = cover;

interface Seed {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: Product["category"];
  version: string;
  priceCents: number;
  hue: number;
  sizeBytes: number;
  rating: number;
  ratingCount: number;
  publisher: string;
  owned: boolean;
  tags: string[];
  updatedAt: string;
  sellerId: string;
  status: ProductStatus;
  kind?: ProductKind;
  billingPeriod?: BillingPeriod;
  deliveryType?: DeliveryKind;
  codeContent?: string;
  codeLanguage?: string;
}

const PY_POOL = `import asyncio, aiohttp

async def fetch(session, url):
    async with session.get(url, timeout=15) as r:
        return url, r.status, await r.text()

async def run(urls, concurrency=20):
    sem = asyncio.Semaphore(concurrency)
    async with aiohttp.ClientSession() as session:
        async def bound(u):
            async with sem:
                return await fetch(session, u)
        return await asyncio.gather(*(bound(u) for u in urls))

if __name__ == "__main__":
    targets = ["https://example.com"] * 5
    for url, status, _ in asyncio.run(run(targets)):
        print(status, url)`;

const JS_JWT = `// Decode a JWT payload without verifying the signature (debug only).
function decodeJwt(token) {
  const [, payload] = token.split(".");
  if (!payload) throw new Error("malformed token");
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(
    decodeURIComponent(
      json
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    ),
  );
}

console.log(decodeJwt(process.argv[2]));`;

const SEEDS: Seed[] = [
  { id: "prd_001", slug: "nightvault", name: "NightVault", tagline: "Zero-knowledge encrypted file vault", description: "NightVault is a local-first, zero-knowledge vault. Files are encrypted with XChaCha20-Poly1305 before they ever touch disk. Includes deniable hidden volumes, plausible-deniability decoys, and an air-gapped key export workflow.", category: "security", version: "3.2.1", priceCents: 4900, hue: 265, sizeBytes: 48_300_000, rating: 4.8, ratingCount: 412, publisher: "Obsidian Labs", owned: true, tags: ["encryption", "privacy", "vault"], updatedAt: "2026-05-28", sellerId: "usr_me", status: "approved" },
  { id: "prd_002", slug: "packetwraith", name: "PacketWraith", tagline: "Stealth network analysis toolkit", description: "A passive-first packet analysis suite with protocol fingerprinting, anomaly detection, and an extensible Lua scripting engine. Built for authorized red-team and blue-team engagements.", category: "tools", version: "1.9.0", priceCents: 12900, hue: 190, sizeBytes: 132_000_000, rating: 4.6, ratingCount: 188, publisher: "Hollow Point", owned: false, tags: ["network", "analysis", "security"], updatedAt: "2026-06-02", sellerId: "usr_hollow", status: "approved", kind: "checker", deliveryType: "file" },
  { id: "prd_003", slug: "ghostwrite", name: "GhostWrite", tagline: "Offline AI writing companion", description: "A fully offline writing assistant powered by a local model. No telemetry, no cloud — your drafts never leave the machine.", category: "productivity", version: "0.8.4", priceCents: 0, hue: 20, sizeBytes: 890_000_000, rating: 4.3, ratingCount: 97, publisher: "Quiet Machines", owned: false, tags: ["ai", "writing", "offline"], updatedAt: "2026-05-19", sellerId: "usr_quiet", status: "approved" },
  { id: "prd_004", slug: "forgekit", name: "ForgeKit", tagline: "Reproducible build environments", description: "Declarative, hermetic build environments that pin every dependency down to the byte. Reproduce any build from any point in history.", category: "development", version: "2.4.7", priceCents: 7900, hue: 150, sizeBytes: 64_500_000, rating: 4.7, ratingCount: 256, publisher: "Obsidian Labs", owned: true, tags: ["build", "reproducible", "devtools"], updatedAt: "2026-06-08", sellerId: "usr_me", status: "approved" },
  { id: "prd_005", slug: "spectra", name: "Spectra", tagline: "Frame-accurate media scrubber", description: "Inspect, trim, and transcode media with frame-accurate scrubbing and a hardware-accelerated decode pipeline.", category: "media", version: "5.1.0", priceCents: 3500, hue: 330, sizeBytes: 210_000_000, rating: 4.5, ratingCount: 143, publisher: "Prism Co.", owned: false, tags: ["media", "video", "tools"], updatedAt: "2026-04-30", sellerId: "usr_prism", status: "approved" },
  { id: "prd_006", slug: "relaynet", name: "RelayNet", tagline: "Self-hosted mesh messaging", description: "End-to-end encrypted mesh messaging that runs over Tor or LAN with no central server. Forward secrecy by default.", category: "security", version: "1.2.2", priceCents: 5900, hue: 220, sizeBytes: 39_000_000, rating: 4.4, ratingCount: 71, publisher: "Obsidian Labs", owned: false, tags: ["messaging", "mesh", "tor"], updatedAt: "2026-06-10", sellerId: "usr_me", status: "approved" },

  // Subscriptions — delivered as a contact handoff or an access code
  { id: "prd_010", slug: "nightvault-cloud", name: "NightVault Cloud", tagline: "Encrypted off-site backups", description: "Hosted zero-knowledge backup for NightVault, synced over Tor. 100 GB encrypted storage, versioned snapshots, and priority support. Provisioning is arranged directly with the seller after you subscribe.", category: "security", version: "—", priceCents: 900, hue: 270, sizeBytes: 0, rating: 4.6, ratingCount: 84, publisher: "Obsidian Labs", owned: false, tags: ["backup", "cloud", "subscription"], updatedAt: "2026-06-09", sellerId: "usr_me", status: "approved", kind: "subscription", billingPeriod: "monthly", deliveryType: "contact" },
  { id: "prd_011", slug: "relaynet-pro", name: "RelayNet Pro", tagline: "Hosted relays + priority routing", description: "A managed pool of high-uptime relays for RelayNet, with priority routing and a higher rate limit. Billed yearly. Your access code is issued instantly on subscribe.", category: "security", version: "—", priceCents: 5400, hue: 210, sizeBytes: 0, rating: 4.5, ratingCount: 39, publisher: "Obsidian Labs", owned: false, tags: ["relay", "subscription"], updatedAt: "2026-06-07", sellerId: "usr_hollow", status: "approved", kind: "subscription", billingPeriod: "yearly", deliveryType: "code" },

  // Private software (key-delivered)
  { id: "prd_020", slug: "obsidian-pro-key", name: "Obsidian Suite — License Key", tagline: "Lifetime key for the full suite", description: "A single lifetime license key unlocking every Obsidian Labs desktop app. Delivered instantly after purchase.", category: "tools", version: "—", priceCents: 19900, hue: 255, sizeBytes: 0, rating: 4.9, ratingCount: 61, publisher: "Obsidian Labs", owned: false, tags: ["license", "key", "bundle"], updatedAt: "2026-06-05", sellerId: "usr_me", status: "approved", kind: "private_software", deliveryType: "license_key" },
  { id: "prd_021", slug: "hardened-vpn-config", name: "Hardened VPN Config Pack", tagline: "Audited WireGuard configs + endpoints", description: "A curated pack of hardened WireGuard configuration files and vetted endpoints. Delivered as a downloadable bundle after license verification.", category: "security", version: "2026.06", priceCents: 1500, hue: 195, sizeBytes: 240_000, rating: 4.3, ratingCount: 28, publisher: "Hollow Point", owned: false, tags: ["vpn", "config", "wireguard"], updatedAt: "2026-06-03", sellerId: "usr_hollow", status: "approved", kind: "private_software", deliveryType: "file" },

  // Code (sold source, delivered inline in a message or as an archive)
  { id: "prd_030", slug: "async-fetch-pool", name: "AsyncFetch Pool", tagline: "Bounded-concurrency async HTTP fetcher", description: "A compact, production-ready async fetch pool with a concurrency semaphore and timeouts. Drop it into any aiohttp project. Delivered as source in your messages right after purchase.", category: "development", version: "1.0.0", priceCents: 800, hue: 145, sizeBytes: 0, rating: 4.7, ratingCount: 33, publisher: "Quiet Machines", owned: false, tags: ["python", "async", "snippet"], updatedAt: "2026-06-11", sellerId: "usr_quiet", status: "approved", kind: "code", deliveryType: "code", codeContent: PY_POOL, codeLanguage: "python" },

  // Free code (no charge, same inline delivery)
  { id: "prd_031", slug: "jwt-payload-decoder", name: "JWT Payload Decoder", tagline: "Decode a JWT payload in the browser", description: "A tiny dependency-free helper that base64url-decodes a JWT payload for debugging. Free — grab the source and go.", category: "development", version: "1.0.0", priceCents: 0, hue: 95, sizeBytes: 0, rating: 4.4, ratingCount: 51, publisher: "Quiet Machines", owned: false, tags: ["javascript", "jwt", "free"], updatedAt: "2026-06-12", sellerId: "usr_quiet", status: "approved", kind: "free_code", deliveryType: "code", codeContent: JS_JWT, codeLanguage: "javascript" },
];

function toProduct(s: Seed): Product {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    description: s.description,
    category: s.category,
    version: s.version,
    priceCents: s.priceCents,
    currency: "USD",
    iconUrl: cover(s.hue),
    screenshots: [cover(s.hue), cover(s.hue + 25)],
    sizeBytes: s.sizeBytes,
    rating: s.rating,
    ratingCount: s.ratingCount,
    publisher: s.publisher,
    owned: s.owned,
    tags: s.tags,
    updatedAt: s.updatedAt,
    sellerId: s.sellerId,
    status: s.status,
    rejectionReason: null,
    kind: s.kind ?? "program",
    billingPeriod: s.billingPeriod ?? null,
    deliveryType: s.deliveryType ?? null,
    codeContent: s.codeContent ?? null,
    codeLanguage: s.codeLanguage ?? null,
  };
}

// --- random filler catalog -------------------------------------------------
// Extra randomized listings so the storefront (carousel, grids) feels populated
// in browser-mock dev. Real data comes from the backend in the native app.

const SNIPPET = `def main():
    print("hello from fovea")

if __name__ == "__main__":
    main()`;

function randomSeeds(count: number): Seed[] {
  const ADJ = ["Shadow", "Cipher", "Quantum", "Iron", "Neon", "Hollow", "Vortex", "Phantom", "Crimson", "Echo", "Nova", "Onyx", "Pulse", "Specter", "Zero", "Frost", "Hex", "Aether", "Mirage", "Cobalt"];
  const NOUN = ["Vault", "Forge", "Relay", "Probe", "Cache", "Beacon", "Sweep", "Bridge", "Cloak", "Scanner", "Daemon", "Harbor", "Loader", "Sentinel", "Tunnel", "Matrix", "Cipher", "Grid", "Pylon", "Anchor"];
  const TAGS = [
    "Fast, private, offline.",
    "Built for power users.",
    "Encrypted by default.",
    "Automate the tedious parts.",
    "Audited and reproducible.",
    "Zero telemetry, zero noise.",
    "Runs everywhere over Tor.",
    "Tiny footprint, big results.",
  ];
  const cats: Seed["category"][] = ["tools", "security", "development", "productivity", "media", "other"];
  const kinds: ProductKind[] = ["program", "checker", "private_software", "code", "free_code", "subscription"];
  const sellers: Array<[string, string]> = [
    ["usr_me", "Obsidian Labs"],
    ["usr_hollow", "Hollow Point"],
    ["usr_quiet", "Quiet Machines"],
    ["usr_prism", "Prism Co."],
  ];
  const prices = [0, 500, 900, 1500, 2500, 3900, 4900, 7900, 12900, 19900];
  const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

  const seeds: Seed[] = [];
  for (let i = 0; i < count; i++) {
    const name = `${pick(ADJ)} ${pick(NOUN)}`;
    const kind = pick(kinds);
    const [sellerId, publisher] = pick(sellers);
    const category = pick(cats);
    const sub = kind === "subscription";
    const code = kind === "code" || kind === "free_code";
    const priceCents = kind === "free_code" ? 0 : pick(prices);

    let deliveryType: DeliveryKind = "file";
    let codeContent: string | undefined;
    let codeLanguage: string | undefined;
    if (code) {
      deliveryType = "code";
      codeContent = SNIPPET;
      codeLanguage = "python";
    } else if (kind === "private_software") {
      deliveryType = "license_key";
    } else if (sub) {
      deliveryType = pick<DeliveryKind>(["code", "contact"]);
    }

    seeds.push({
      id: `prd_r${i + 1}`,
      slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${i + 1}`,
      name,
      tagline: pick(TAGS),
      description: `${name} — ${pick(TAGS)} ${pick(TAGS)}`,
      category,
      version: sub ? "—" : `${1 + Math.floor(Math.random() * 4)}.${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 9)}`,
      priceCents,
      hue: Math.floor(Math.random() * 360),
      sizeBytes: sub || code ? 0 : (5 + Math.floor(Math.random() * 200)) * 1_000_000,
      rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
      ratingCount: Math.floor(Math.random() * 400),
      publisher,
      owned: false,
      tags: [category, kind],
      updatedAt: `2026-06-${String(2 + (i % 27)).padStart(2, "0")}`,
      sellerId,
      status: "approved",
      kind,
      billingPeriod: sub ? pick<BillingPeriod>(["monthly", "yearly"]) : undefined,
      deliveryType,
      codeContent,
      codeLanguage,
    });
  }
  return seeds;
}

export const MOCK_PRODUCTS: Product[] = [...SEEDS, ...randomSeeds(24)].map(toProduct);

/** Simulated connection progression, for browser-only dev. */
export function mockBootstrapSequence(): ConnectionStatus[] {
  return [
    { phase: "starting", progress: 0.0, message: "Starting…" },
    { phase: "starting", progress: 0.5, message: "Contacting backend" },
    { phase: "ready", progress: 1.0, message: "Connected" },
  ];
}
