import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const requiredSections = ["home", "discover", "cart", "dashboard", "earn", "investors", "profile"];
for (const id of requiredSections) {
  if (!html.includes('id="' + id + '"')) throw new Error("Missing app section: " + id);
}
if (html.includes("\\nasync function")) {
  throw new Error("Found escaped newline text in inline JavaScript; script parsing would fail.");
}
if (/SUMSUB_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|PRIVATE_KEY/.test(html)) {
  throw new Error("A server-only secret name appears in the public app HTML.");
}
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
if (scripts.length === 0) throw new Error("No inline app script found.");
for (const script of scripts) new vm.Script(script, { filename: "index.inline.js" });
const migration = readFileSync(new URL("../supabase/migrations/202611060001_marketplace_core.sql", import.meta.url), "utf8");
for (const table of ["profiles", "businesses", "products", "orders", "payment_intents", "ledger_entries", "verification_cases"]) {
  if (!migration.includes("create table if not exists public." + table)) throw new Error("Missing core table: " + table);
  if (!migration.includes("alter table public." + table + " enable row level security")) throw new Error("RLS not enabled for: " + table);
}
console.log("ASKMarket static checks passed.");
