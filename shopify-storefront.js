(() => {
  const escape = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = (amount, currency) => {
    const n = Number(amount);
    try { return new Intl.NumberFormat(undefined, {style:"currency",currency}).format(n); }
    catch { return currency + " " + n.toLocaleString(); }
  };
  let shopProducts = [];
  let shopDomain = "8d4ygm-d0.myshopify.com";
  let loaded = false;

  function mount() {
    const discover = document.getElementById("discover");
    const toolbar = discover?.querySelector(".toolbar");
    if (!toolbar || document.getElementById("shopifyMarketplace")) return;
    const section = document.createElement("section");
    section.id = "shopifyMarketplace";
    section.className = "panel";
    section.innerHTML = `
      <div class="section-head" style="margin-top:0">
        <div><div class="eyebrow" style="color:var(--green)">Connected store</div><h2>Shop Shopify products</h2>
        <p class="muted">Discover products from our Shopify store and continue securely to Shopify checkout.</p></div>
        <a class="btn ghost" id="shopifyAccountLink" href="https://${shopDomain}/account" target="_blank" rel="noopener noreferrer">Customer account ↗</a>
      </div>
      <div id="shopifyStatus" class="small" role="status" aria-live="polite">Loading Shopify catalog…</div>
      <div id="shopifyProducts" class="grid" style="margin-top:14px"></div>`;
    toolbar.insertAdjacentElement("afterend", section);
    load();
  }

  function render() {
    const target = document.getElementById("shopifyProducts");
    const status = document.getElementById("shopifyStatus");
    if (!target || !status) return;
    const q = (document.getElementById("search")?.value || "").trim().toLowerCase();
    const filtered = shopProducts.filter(p => !q || (p.title + " " + p.vendor + " " + p.category).toLowerCase().includes(q));
    target.innerHTML = filtered.map(p => `
      <article class="card">
        <div class="product-art" style="height:170px;overflow:hidden">
          ${p.image ? `<img src="${escape(p.image)}" alt="${escape(p.imageAlt)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">` : "🛍️"}
        </div>
        <div class="card-body">
          <span class="tag">Shopify · ${escape(p.category)}</span>
          <h3>${escape(p.title)}</h3>
          <div class="price">${money(p.amount,p.currency)}</div>
          <div class="small">${escape(p.vendor || "Shopify store")} · ${p.available ? "Available" : "Availability varies"}</div>
          <div class="card-foot"><span class="small">Official store listing</span>
          <a class="btn dark" href="${escape(p.url)}" target="_blank" rel="noopener noreferrer">View & buy ↗</a></div>
        </div>
      </article>`).join("") || '<div class="empty">No Shopify products match this search.</div>';
    status.textContent = `Showing ${filtered.length} of ${shopProducts.length} Shopify products.`;
  }

  async function load() {
    const status = document.getElementById("shopifyStatus");
    try {
      const r = await fetch("/api/shopify/products");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Shopify catalog unavailable.");
      shopProducts = Array.isArray(data.products) ? data.products : [];
      shopDomain = data.shopDomain || shopDomain;
      const account = document.getElementById("shopifyAccountLink");
      if (account) account.href = `https://${shopDomain}/account`;
      loaded = true;
      render();
      if (!shopProducts.length && status) status.textContent = "Your Shopify store is connected, but no published products were found.";
    } catch (e) {
      if (status) status.textContent = e.message + " The marketplace's own listings remain available.";
    }
  }

  document.addEventListener("input", e => { if (e.target?.id === "search" && loaded) render(); });
  document.addEventListener("DOMContentLoaded", mount);
  if (document.readyState !== "loading") mount();
})();
