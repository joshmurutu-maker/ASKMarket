import { readFileSync } from "node:fs";
import vm from "node:vm";
import { spawnSync } from "node:child_process";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const requiredSections = ["home", "discover", "cart", "dashboard", "wallet", "earn", "investors", "profile", "settings"];
for (const id of requiredSections) {
  if (!html.includes('id="' + id + '"')) throw new Error("Missing app section: " + id);
}
if (html.includes("\\nasync function")) throw new Error("Escaped newline found in inline app JavaScript.");
if (/SUMSUB_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|PRIVATE_KEY/.test(html)) throw new Error("A server-only secret name appears in public HTML.");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
if (scripts.length === 0) throw new Error("No inline app script found.");
for (const source of scripts) new vm.Script(source, { filename: "index.inline.js" });
for (const path of ["../api/config.js", "../api/verification/access-token.js"]) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  if (source.includes("\\n")) throw new Error("Escaped newline found in API module: " + path);
}
const imageTools = readFileSync(new URL("../seller-image-tools.js", import.meta.url), "utf8");
new vm.Script(imageTools, { filename: "seller-image-tools.js" });
const imageApi = readFileSync(new URL("../api/images/customize-background.js", import.meta.url), "utf8");
const productApi = readFileSync(new URL("../api/products.js", import.meta.url), "utf8");
for (const [path, source] of [["api/images/customize-background.js", imageApi], ["api/products.js", productApi]]) {
  const checked = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: source, encoding: "utf8" });
  if (checked.status !== 0) throw new Error("Invalid API module syntax in " + path + ": " + (checked.stderr || checked.stdout));
}
if (!imageApi.includes('auth.startsWith("Bearer ")')) throw new Error("AI image endpoint must require an authenticated session.");
if (!imageApi.includes("OPENAI_API_KEY")) throw new Error("AI image API key must remain server-side.");
if (!productApi.includes('auth.startsWith("Bearer ")')) throw new Error("Product API must authenticate sellers.");
if (!productApi.includes("seller_listings")) throw new Error("Product API must use durable seller listings.");

const migration = readFileSync(new URL("../supabase/migrations/202611060001_marketplace_core.sql", import.meta.url), "utf8");
for (const table of ["profiles", "businesses", "products", "orders", "payment_intents", "ledger_entries", "verification_cases"]) {
  if (!migration.includes("create table if not exists public." + table)) throw new Error("Missing core table: " + table);
  if (!migration.includes("alter table public." + table + " enable row level security")) throw new Error("RLS not enabled for: " + table);
}
for (const path of ["../legal/terms.html", "../legal/privacy.html", "../legal/returns.html", "../legal/seller-standards.html"]) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  if (!source.includes("Draft for legal review")) throw new Error("Legal page must remain clearly marked as a draft: " + path);
}
const config = readFileSync(new URL("../api/config.js", import.meta.url), "utf8");
if (!config.includes("accountServiceConfigured")) throw new Error("Config endpoint must expose account-service readiness.");
if (/SUPABASE_SERVICE_ROLE_KEY|SUMSUB_SECRET_KEY/.test(config)) throw new Error("A server-only secret is referenced by the public config endpoint.");

const sellerMigration = readFileSync(new URL("../supabase/migrations/202611090001_product_image_storage.sql", import.meta.url), "utf8");
for (const required of ["seller_listings", "enable row level security", "product-images", "pending_review", "protect_seller_role_from_self_change"]) {
  if (!sellerMigration.includes(required)) throw new Error("Seller listing migration missing: " + required);
}
const walletMigration = readFileSync(new URL("../supabase/migrations/202611060003_wallet.sql", import.meta.url), "utf8");
for (const table of ["wallet_accounts", "wallet_transactions"]) {
  if (!walletMigration.includes("create table if not exists public." + table)) throw new Error("Missing wallet table: " + table);
  if (!walletMigration.includes("alter table public." + table + " enable row level security")) throw new Error("RLS not enabled for: " + table);
  if (!walletMigration.includes("revoke insert, update, delete on public." + table)) throw new Error("Client writes not revoked for: " + table);
}
for (const path of ["../api/wallet/deposit.js", "../api/wallet/withdrawal.js"]) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  if (!source.includes('auth.startsWith("Bearer ")')) throw new Error("Wallet API must require a signed-in session: " + path);
  if (!source.includes("return res.status(503)")) throw new Error("Wallet API must remain fail-closed until provider integration: " + path);
  if (source.includes("\\n")) throw new Error("Escaped newline found in wallet API module: " + path);
}
console.log("ASKMarket static checks passed.");
