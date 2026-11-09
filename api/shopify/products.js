export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawShop = process.env.SHOPIFY_STORE_DOMAIN || "8d4ygm-d0.myshopify.com";
  const shop = rawShop.trim().replace("https://", "").replace("http://", "").split("/")[0].toLowerCase();
  if (!shop.endsWith(".myshopify.com") || shop.length > 253 || shop.includes("..")) {
    return res.status(503).json({ error: "Shopify store domain is not configured correctly." });
  }

  const query = `query MarketplaceProducts {
    products(first: 24, sortKey: BEST_SELLING) {
      nodes {
        id title handle descriptionHtml vendor productType availableForSale
        onlineStoreUrl
        featuredImage { url altText }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }`;

  try {
    const response = await fetch(`https://${shop}/api/2026-10/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.errors?.length) {
      return res.status(502).json({ error: "Shopify product catalog is temporarily unavailable." });
    }
    const products = (payload.data?.products?.nodes || []).map((p) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      vendor: p.vendor || "",
      category: p.productType || "Shopify product",
      available: Boolean(p.availableForSale),
      url: p.onlineStoreUrl || `https://${shop}/products/${encodeURIComponent(p.handle)}`,
      image: p.featuredImage?.url || "",
      imageAlt: p.featuredImage?.altText || p.title,
      amount: p.priceRange?.minVariantPrice?.amount || "0",
      currency: p.priceRange?.minVariantPrice?.currencyCode || "KES"
    }));
    return res.status(200).json({ products, shopDomain: shop });
  } catch {
    return res.status(502).json({ error: "Could not connect to Shopify right now." });
  }
}
