import { randomUUID } from "node:crypto";

function send(res, status, body) {
  return res.status(status).json(body);
}

function config() {
  return {
    url: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_ANON_KEY || ""
  };
}

async function verifyUser(url, key, authorization) {
  if (!authorization.startsWith("Bearer ")) return null;
  const response = await fetch(url + "/auth/v1/user", {
    headers: { apikey: key, Authorization: authorization }
  });
  if (!response.ok) return null;
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const { url, key } = config();
  if (!url || !key) return send(res, 503, { error: "Marketplace database is not configured." });

  try {
    if (req.method === "GET") {
      const authorization = req.headers.authorization || "";
      const headers = { apikey: key, Authorization: authorization.startsWith("Bearer ") ? authorization : "Bearer " + key };
      const response = await fetch(
        url + "/rest/v1/seller_listings?select=id,seller_id,name,description,category,price,currency,quantity,image_url,status,moderation_note,created_at&order=created_at.desc&limit=100",
        { headers }
      );
      const rows = await response.json().catch(() => []);
      if (!response.ok) return send(res, 502, { error: "Could not load marketplace listings." });
      return send(res, 200, { products: Array.isArray(rows) ? rows : [] });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed." });
    }

    const authorization = req.headers.authorization || "";
    const user = await verifyUser(url, key, authorization);
    if (!user?.id) return send(res, 401, { error: "Sign in before submitting a product." });

    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const price = Number(body.price);
    const quantity = Number(body.quantity);
    if (name.length < 2 || name.length > 160) return send(res, 400, { error: "Product name must be 2–160 characters." });
    if (!["Electronics", "Food & Grocery", "Home & Living", "Agriculture", "Fashion", "Beauty", "Other"].includes(category)) {
      return send(res, 400, { error: "Choose a valid product category." });
    }
    if (!Number.isFinite(price) || price <= 0 || price > 1000000000) return send(res, 400, { error: "Enter a valid product price." });
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 10000000) return send(res, 400, { error: "Enter a valid available quantity." });

    let imageUrl = null;
    let uploadedPath = null;
    if (body.image) {
      const match = typeof body.image === "string" && body.image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match || body.image.length > 3500000) return send(res, 400, { error: "Product photo must be a JPG, PNG or WebP image within the upload size limit." });
      const mime = "image/" + match[1];
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const bytes = Buffer.from(match[2], "base64");
      if (!bytes.length || bytes.length > 2600000) return send(res, 400, { error: "Product photo is too large." });
      uploadedPath = user.id + "/" + randomUUID() + "." + ext;
      const storagePath = uploadedPath.split("/").map(encodeURIComponent).join("/");
      const upload = await fetch(url + "/storage/v1/object/product-images/" + storagePath, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: authorization,
          "Content-Type": mime,
          "Cache-Control": "public, max-age=31536000, immutable",
          "x-upsert": "false"
        },
        body: bytes
      });
      if (!upload.ok) {
        const details = await upload.json().catch(() => ({}));
        return send(res, upload.status === 403 ? 403 : 502, { error: details.message || details.error || "Could not store the product photo. Apply the product-image migration first." });
      }
      imageUrl = url + "/storage/v1/object/public/product-images/" + storagePath;
    }

    const insert = await fetch(url + "/rest/v1/seller_listings?select=id,seller_id,name,description,category,price,currency,quantity,image_url,status,moderation_note,created_at", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: authorization,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        seller_id: user.id,
        name,
        description,
        category,
        price,
        currency: "KES",
        quantity,
        image_url: imageUrl,
        status: "pending_review"
      })
    });
    const rows = await insert.json().catch(() => []);
    if (!insert.ok || !Array.isArray(rows) || !rows[0]) {
      if (uploadedPath) {
        await fetch(url + "/storage/v1/object/product-images/" + uploadedPath.split("/").map(encodeURIComponent).join("/"), {
          method: "DELETE",
          headers: { apikey: key, Authorization: authorization }
        }).catch(() => {});
      }
      const message = rows?.message || rows?.details || "Could not save the listing. Confirm your seller role and apply the seller-listings migration.";
      return send(res, insert.status === 401 || insert.status === 403 ? insert.status : 400, { error: message });
    }
    return send(res, 201, { product: rows[0] });
  } catch {
    return send(res, 500, { error: "Marketplace service is temporarily unavailable." });
  }
}
