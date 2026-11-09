(function () {
  "use strict";
  const form = document.getElementById("listingForm");
  if (!form) return;

  const input = document.getElementById("productImageInput");
  const status = document.getElementById("productImageStatus");
  const ask = document.getElementById("askBeforeProductImage");
  const preview = document.getElementById("productImagePreview");
  const previewWrap = document.getElementById("productImagePreviewWrap");
  let selectedImage = "";
  let remoteListings = [];
  let remoteLoaded = false;
  let loadingListings = null;

  ask.checked = localStorage.getItem("ask-image-permission") !== "false";
  ask.addEventListener("change", function () {
    localStorage.setItem("ask-image-permission", String(ask.checked));
  });

  document.getElementById("chooseProductImage").addEventListener("click", function () {
    if (ask.checked && !window.confirm("ASKMarket wants to open Android's photo picker. Continue?")) return;
    input.click();
  });

  input.addEventListener("change", function () {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      status.textContent = "Choose a JPG, PNG or WebP image.";
      input.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      status.textContent = "Choose an image smaller than 8 MB.";
      input.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const context = canvas.getContext("2d");
        if (!context) { status.textContent = "Image processing is unavailable on this device."; return; }
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        selectedImage = canvas.toDataURL("image/jpeg", 0.72);
        preview.src = selectedImage;
        previewWrap.classList.remove("hidden");
        status.textContent = "Photo selected and optimized on this device. It has not been uploaded.";
      };
      img.onerror = function () { status.textContent = "Could not read this photo. Try another image."; };
      img.src = reader.result;
    };
    reader.onerror = function () { status.textContent = "Could not read this photo. Try another image."; };
    reader.readAsDataURL(file);
  });

  document.getElementById("customizeProductBg").addEventListener("click", async function () {
    if (!selectedImage) { status.textContent = "Choose a product photo first."; return; }
    if (!window.confirm("Send this photo to the AI image service to redesign its background? The product itself should remain as faithful as possible.")) return;
    const button = this;
    button.disabled = true;
    status.textContent = "AI is customizing the product background…";
    try {
      const token = typeof getAccessToken === "function" ? getAccessToken() : null;
      if (!token) throw new Error("Sign in before using AI image customization.");
      const response = await fetch("/api/images/customize-background", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ image: selectedImage, style: document.getElementById("productBgStyle").value })
      });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || "AI image customization is unavailable.");
      selectedImage = data.image;
      preview.src = selectedImage;
      status.textContent = "AI background customized. Review the result before saving.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  function mapProduct(row) {
    return {
      id: row.id,
      name: row.name,
      cat: row.category,
      price: Number(row.price),
      qty: "Available: " + Number(row.quantity || 0),
      seller: "Marketplace seller",
      status: row.status,
      emoji: "📦",
      image: row.image_url || "",
      description: row.description || "",
      currency: row.currency || "KES"
    };
  }

  async function loadRemoteListings(force) {
    if (remoteLoaded && !force) return remoteListings;
    if (loadingListings && !force) return loadingListings;
    loadingListings = fetch("/api/products", { headers: { "Accept": "application/json" } })
      .then(async function (response) {
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || "Could not load marketplace listings.");
        remoteListings = Array.isArray(data.products) ? data.products.map(mapProduct) : [];
        remoteLoaded = true;
        return remoteListings;
      })
      .catch(function (error) {
        remoteLoaded = false;
        const target = document.getElementById("products");
        if (target && !remoteListings.length) target.innerHTML = '<div class="empty">' + escapeHTML(error.message) + '</div>';
        return remoteListings;
      })
      .finally(function () { loadingListings = null; });
    return loadingListings;
  }

  function productCard(product) {
    const safe = typeof escapeHTML === "function" ? escapeHTML : value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const photo = typeof product.image === "string" && (/^data:image\/(jpeg|png|webp);base64,/i.test(product.image) || /^https:\/\//i.test(product.image))
      ? '<div class="product-art" style="height:190px;background:#f4f1ea"><img src="' + safe(product.image) + '" alt="' + safe(product.name) + '" loading="lazy" style="width:100%;height:100%;object-fit:contain"></div>'
      : '<div class="product-art">' + safe(product.emoji || "📦") + "</div>";
    const footer = product.status === "pending_review"
      ? '<span class="tag">Review pending</span>'
      : '<button class="btn dark" onclick="addCart(\\'' + safe(product.id) + '\\')">Add to cart</button>';
    const label = product.status === "pending_review" ? "Submitted for review" : product.localOnly ? "Saved on this device" : product.status === "published" ? "Approved listing" : "Sample listing";
    return '<article class="card">' + photo + '<div class="card-body"><span class="tag">' + safe(product.cat) + '</span><h3>' + safe(product.name) + '</h3><div class="price">' + money(product.price) + '</div><div class="small">' + safe(product.qty || "MOQ not set") + " · " + safe(product.seller || "E-commerce seller") + '</div><div class="card-foot"><span class="small">' + label + '</span>' + footer + '</div></div></article>';
  }

  window.productCard = productCard;
  window.renderProducts = async function () {
    const target = document.getElementById("products");
    if (!target) return;
    if (!remoteLoaded) target.innerHTML = '<div class="empty">Loading marketplace listings…</div>';
    await loadRemoteListings(false);
    const q = (document.getElementById("search")?.value || "").toLowerCase();
    const category = document.getElementById("category")?.value || "";
    const list = [...products, ...custom.map(function (p) { return Object.assign({}, p, { localOnly: true }); }), ...remoteListings].filter(function (p) {
      return (!category || p.cat === category) && (p.name || "").toLowerCase().includes(q);
    });
    target.innerHTML = list.map(productCard).join("") || '<div class="empty">No matching products yet.</div>';
  };

  window.addCart = function (id) {
    const product = [...products, ...custom, ...remoteListings].find(function (item) { return String(item.id) === String(id); });
    if (!product) return;
    cart.push(product);
    localStorage.setItem("ask-cart", JSON.stringify(cart));
    document.getElementById("cartCount").textContent = cart.length;
    if (product.status === "pending_review") { alert("This listing is awaiting marketplace review and cannot be purchased yet."); return; }
    alert("Added to your demo cart. Checkout remains disabled until payment and order services are approved.");
  };

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const token = typeof getAccessToken === "function" ? getAccessToken() : null;
    if (!token) {
      status.textContent = "Sign in with a seller, distributor or retailer account before saving a marketplace listing.";
      if (typeof show === "function") show("profile");
      if (typeof setAuthMode === "function") setAuthMode("signin");
      return;
    }
    if (selectedImage && ask.checked && !window.confirm("Upload this product photo and publish the listing to the shared marketplace?")) return;

    const button = form.querySelector('button[type="submit"],button:not([type])');
    if (button) button.disabled = true;
    status.textContent = "Saving your listing and securely uploading its product photo…";
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({
          name: document.getElementById("pname").value.trim(),
          category: document.getElementById("pcat").value,
          price: Number(document.getElementById("pprice").value),
          quantity: Number(document.getElementById("pqty").value),
          description: "",
          image: selectedImage || null
        })
      });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || "Could not save the product listing.");
      const item = mapProduct(data.product);
      remoteListings.unshift(item);
      remoteLoaded = true;
      form.reset();
      selectedImage = "";
      previewWrap.classList.add("hidden");
      preview.removeAttribute("src");
      input.value = "";
      status.textContent = "Submitted successfully. Your listing and product photo are stored in your account and will appear publicly after marketplace review.";
      if (typeof window.renderProducts === "function") await window.renderProducts();
      alert("Your listing has been submitted for marketplace review. You can see it in Discover while signed in.");
    } catch (error) {
      status.textContent = error.message;
    } finally {
      if (button) button.disabled = false;
    }
  }, true);

  window.addEventListener("load", function () { loadRemoteListings(false); });
})();