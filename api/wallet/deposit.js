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
    const body = req.body || {};
    if (body.method === "mobile_money") {
      if (body.currency !== "KES" || !Number.isSafeInteger(body.amount) || body.amount < 10 || body.amount > 500000 || typeof body.phone !== "string" || !/^\+?254[17]\d{8}$/.test(body.phone.replace(/[\s-]/g, ""))) {
        return res.status(400).json({ error: "Enter a valid KES amount (10–500,000) and Kenyan mobile number." });
      }
    } else if (body.method === "crypto") {
      const assets = ["USDT", "USDC", "ETH", "BTC"];
      const networks = ["ethereum", "polygon", "bitcoin", "arbitrum"];
      if (!assets.includes(body.asset) || !networks.includes(body.network)) return res.status(400).json({ error: "Unsupported asset or network selection." });
    } else return res.status(400).json({ error: "Choose mobile_money or crypto." });

    // No payment gateway/custody integration is connected yet. Fail closed:
    // never create a fake payment, display a deposit address, or credit a balance.
    return res.status(503).json({ error: "Deposits are not enabled yet. The E-commerce owner must complete the approved M-Pesa or crypto custody-provider integration and webhook verification first." });
  } catch {
    return res.status(500).json({ error: "Unable to process the deposit request." });
  }
}
