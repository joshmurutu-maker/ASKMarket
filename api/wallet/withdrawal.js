export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const auth = req.headers.authorization || "";
  if (!supabaseUrl || !anon) return res.status(503).json({ error: "Wallet account service is not configured." });
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "Sign in is required." });
  try {
    const verified = await fetch(new URL("/auth/v1/user", supabaseUrl), { headers: { apikey: anon, Authorization: auth } });
    if (!verified.ok) return res.status(401).json({ error: "Your session is invalid. Please sign in again." });
    const user = await verified.json();
    const body = req.body || {};
    if (body.confirmed !== true || !Number.isFinite(body.amount) || body.amount <= 0 || body.amount > 500000) return res.status(400).json({ error: "Confirm the destination and enter a valid withdrawal amount." });
    if (body.method === "mobile") {
      if (typeof body.phone !== "string" || !/^\+?254[17]\d{8}$/.test(body.phone.replace(/[\s-]/g, ""))) return res.status(400).json({ error: "Enter a valid Kenyan mobile number." });
    } else if (body.method === "crypto") {
      if (!["USDT", "USDC", "ETH", "BTC"].includes(body.asset) || !["Ethereum", "Polygon", "Bitcoin", "Arbitrum"].includes(body.network) || typeof body.address !== "string" || body.address.length < 20 || body.address.length > 128) return res.status(400).json({ error: "Check the selected asset, network and destination address." });
    } else return res.status(400).json({ error: "Choose a supported withdrawal method." });

    // Intentionally no payout execution or balance reservation until a ledger,
    // verification-status check, provider adapter, limits and approval workflow exist.
    return res.status(503).json({ error: "Withdrawals are not enabled yet. Your request was not saved and no funds were moved. Provider integration, verified KYC/KYB, available-balance checks and payout controls are required first." });
  } catch {
    return res.status(500).json({ error: "Unable to process the withdrawal request." });
  }
}
