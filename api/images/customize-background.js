export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const authorization = req.headers.authorization || "";
  if (!supabaseUrl || !supabaseAnonKey) return res.status(503).json({ error: "Account service is not configured." });
  if (!authorization.startsWith("Bearer ")) return res.status(401).json({ error: "Sign in is required." });
  if (!openaiKey) return res.status(503).json({ error: "AI background editing is not configured yet. Add OPENAI_API_KEY to Vercel environment variables." });

  try {
    const userResponse = await fetch(new URL("/auth/v1/user", supabaseUrl), {
      headers: { apikey: supabaseAnonKey, Authorization: authorization }
    });
    if (!userResponse.ok) return res.status(401).json({ error: "Your session is invalid. Please sign in again." });
    const body = req.body || {};
    const image = body.image;
    const style = body.style;
    if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 3500000) {
      return res.status(400).json({ error: "Choose a valid JPG, PNG or WebP product image under the upload size limit." });
    }
    const allowedStyles = [
      "clean white studio",
      "luxury bronze and graphite studio",
      "soft natural outdoor setting",
      "minimal modern retail display",
      "warm lifestyle setting"
    ];
    if (!allowedStyles.includes(style)) return res.status(400).json({ error: "Choose one of the available background styles." });

    const prompt = "Edit this ecommerce product photograph. Replace only the background with a " + style + ". Preserve the actual product, its shape, proportions, colour, materials, labels, logo, text, packaging and all visible details as faithfully as possible. Keep the product fully visible, sharply focused, realistic, and naturally lit. Do not add extra products, props that obscure it, invented branding, watermarks, promotional text, or prices. Professional marketplace product photography.";
    const editResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: "Bearer " + openaiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-2.5-sunburst",
        images: [{ image_url: image }],
        prompt,
        output_format: "jpeg",
        quality: "medium",
        size: "auto",
        n: 1
      })
    });
    const result = await editResponse.json().catch(() => ({}));
    if (!editResponse.ok) {
      return res.status(502).json({ error: result.error?.message || "The AI image provider could not edit this photo." });
    }
    const edited = result.data?.[0]?.b64_json;
    if (!edited) return res.status(502).json({ error: "The AI image provider returned no edited image." });
    return res.status(200).json({ image: "data:image/jpeg;base64," + edited });
  } catch {
    return res.status(500).json({ error: "Unable to customize the product image right now." });
  }
}