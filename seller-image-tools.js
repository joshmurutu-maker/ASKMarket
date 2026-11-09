(function () {
  "use strict";
  const form = document.getElementById("listingForm");
  if (!form) return;
  const input = document.getElementById("productImageInput");
  const status = document.getElementById("productImageStatus");
  const ask = document.getElementById("askBeforeProductImage");
  let selectedImage = "";

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
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        selectedImage = canvas.toDataURL("image/jpeg", 0.78);
        document.getElementById("productImagePreview").src = selectedImage;
        document.getElementById("productImagePreviewWrap").classList.remove("hidden");
        status.textContent = "Photo selected and optimized on this device. Not uploaded yet.";
      };
      img.onerror = function () { status.textContent = "Could not read this photo. Try another image."; };
      img.src = reader.result;
    };
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
      document.getElementById("productImagePreview").src = selectedImage;
      status.textContent = "AI background customized. Check the product details before saving.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  // Capture the form submit before the original demo handler so the image is
  // included in the listing and the form is reset only once.
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (selectedImage && ask.checked && !window.confirm("Save this product photo with the listing on this device?")) return;
    const item = {
      id: Date.now(),
      name: document.getElementById("pname").value,
      cat: document.getElementById("pcat").value,
      price: Number(document.getElementById("pprice").value),
      qty: "Min. " + document.getElementById("pqty").value,
      seller: document.getElementById("pcontact").value || "Your business",
      emoji: "📦",
      image: selectedImage
    };
    try {
      const listings = JSON.parse(localStorage.getItem("ask-listings") || "[]");
      listings.push(item);
      localStorage.setItem("ask-listings", JSON.stringify(listings));
    } catch (error) {
      status.textContent = "Could not save this image in browser storage. Try a smaller photo.";
      return;
    }
    form.reset();
    selectedImage = "";
    document.getElementById("productImagePreviewWrap").classList.add("hidden");
    document.getElementById("productImagePreview").removeAttribute("src");
    status.textContent = "No image selected.";
    alert("Product listing saved on this device.");
    if (typeof renderProducts === "function") renderProducts();
  }, true);

  // Product images are displayed in listing cards. Escape text and image data
  // before inserting into the existing demo marketplace UI.
  window.productCard = function (product) {
    const safe = typeof escapeHTML === "function" ? escapeHTML : function (value) {
      return String(value || "").replace(/[&<>"]/g, function (c) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
      });
    };
    const photo = product.image && /^data:image\/(jpeg|png|webp);base64,/i.test(product.image)
      ? '<div class="product-art" style="height:190px;background:#f4f1ea"><img src="' + safe(product.image) + '" alt="' + safe(product.name) + '" loading="lazy" style="width:100%;height:100%;object-fit:contain"></div>'
      : '<div class="product-art">' + safe(product.emoji || "📦") + "</div>";
    return '<article class="card">' + photo + '<div class="card-body"><span class="tag">' + safe(product.cat) + "</span><h3>" + safe(product.name) + '</h3><div class="price">' + money(product.price) + '</div><div class="small">' + safe(product.qty || "MOQ not set") + " · " + safe(product.seller || "E-commerce seller") + '</div><div class="card-foot"><span class="small">Seller listing</span><button class="btn dark" onclick="addCart(' + (Number(product.id) || 0) + ')">Add to cart</button></div></div></article>';
  };
})();