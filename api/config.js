export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  // Only public client settings are returned; service-role and provider secrets stay server-side.
  return res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
    accountServiceConfigured: Boolean(supabaseUrl && supabaseAnonKey)
  });
}
