// Public product catalogue and authenticated seller publishing.
// Uses the caller's Supabase JWT with PostgREST RLS; never uses a service-role key.
const CATEGORIES = new Set(["Electronics","Food & Grocery","Home & Living","Agriculture"]);
const json = (res, status, body) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(body);
};
export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return json(res, 503, { error: "Marketplace catalogue is not configured." });
  const auth = req.headers.authorization || "";
  const headers = { apikey: anon, "Content-Type": "application/json" };
  if (req.method === "GET") {
    try {
      const endpoint = new URL("/rest/v1/products", url);
      endpoint.searchParams.set("select", "id,name,description,category,price,currency,quantity,seller_id,image_url,created_at");
      endpoint.searchParams.set("status", "eq.published");
      endpoint.searchParams.set("order", "created_at.desc");
      endpoint.searchParams.set("limit", "100");
      const response = await fetch(endpoint, { headers });
      const data = await response.json().catch(() => []);
      if (!response.ok) return json(res, 502, { error: "Could not load published products." });
      return json(res, 200, { products: Array.isArray(data) ? data : [] });
    } catch {
      return json(res, 502, { error: "Marketplace catalogue is temporarily unavailable." });
    }
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed." });
  }
  if (!auth.startsWith("Bearer ")) return json(res, 401, { error: "Sign in to publish a product." });
  try {
    const identity = await fetch(new URL("/auth/v1/user", url), { headers: { apikey: anon, Authorization: auth } });
    if (!identity.ok) return json(res, 401, { error: "Your session is invalid. Sign in again." });
    const user = await identity.json();
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = body.category;
    const price = Number(body.price);
    const quantity = Number(body.quantity);
    const imageUrl = typeof body.image_url === "string" ? body.image_url : "";
    if (name.length < 3 || name.length > 160) return json(res, 400, { error: "Product name must be 3–160 characters." });
    if (!CATEGORIES.has(category)) return json(res, 400, { error: "Choose a valid product category." });
    if (!Number.isFinite(price) || price <= 0 || price > 1000000000) return json(res, 400, { error: "Enter a valid positive price." });
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000000) return json(res, 400, { error: "Enter a valid available quantity." });
    if (description.length > 5000) return json(res, 400, { error: "Description must be 5,000 characters or fewer." });
    let image; try { image = new URL(imageUrl); } catch { return json(res, 400, { error: "Generate an AI product image before publishing." }); }
    const expectedPrefix = new URL("/storage/v1/object/public/product-images/" + user.id + "/", url).toString();
    if (!imageUrl.startsWith(expectedPrefix) || image.origin !== new URL(url).origin) return json(res, 400, { error: "Use the AI-generated image saved to your seller account." });
    const endpoint = new URL("/rest/v1/products", url);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { ...headers, Authorization: auth, Prefer: "return=representation" },
      body: JSON.stringify({
        seller_id: user.id, name, description, category, price,
        currency: "KES", quantity, image_url: imageUrl, status: "published"
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return json(res, 403, { error: "Your account is not permitted to publish listings. Seller, distributor or retailer access is required." });
      return json(res, 400, { error: "Could not publish this listing. Confirm the marketplace database migration is installed and your account has seller permissions." });
    }
    return json(res, 201, { product: Array.isArray(result) ? result[0] : result, message: "Your product has been published to the marketplace." });
  } catch {
    return json(res, 502, { error: "Marketplace publishing is temporarily unavailable." });
  }
}
