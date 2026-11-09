(function () {
  "use strict";

  const SELECTOR = "0xa397fc12";
  const SIGNATURE = "ASKMarket()";
  const SEPOLIA_CHAIN_ID = "0xaa36a7";
  const host = document.getElementById("nonCustodialWallet");
  if (!host || document.getElementById("askmarketChainCard")) return;

  const card = document.createElement("section");
  card.id = "askmarketChainCard";
  card.setAttribute("aria-label", "ASKMarket blockchain integration");
  card.style.cssText = "margin-top:16px;padding:15px;border:1px solid #c39b45;border-radius:14px;background:linear-gradient(135deg,#fffdf8,#f4eee0)";
  card.innerHTML =
    '<div class="eyebrow">ASKMarket blockchain interface</div>' +
    '<h3 style="margin:6px 0">ASKMarket()</h3>' +
    '<p class="small">Supplied function selector: <code>0xa397fc12</code></p>' +
    '<div class="formgrid">' +
      '<div class="field"><b>Target network</b><span>Sepolia · chain 11155111</span></div>' +
      '<div class="field"><b>Selector verification</b><span id="askmarketSelectorStatus">Pending independent Keccak verification</span></div>' +
      '<div class="field"><b>Contract deployment</b><span>Not deployed / no address configured</span></div>' +
      '<div class="field"><b>Transfer capability</b><span>Disabled</span></div>' +
    '</div>' +
    '<p id="askmarketChainStatus" class="small" role="status" aria-live="polite">Read-only integration preparation. No signatures or transactions are requested.</p>' +
    '<p class="small">The selector is recorded as supplied, not represented as a verified callable contract method. Never send real funds to Sepolia.</p>';
  host.appendChild(card);

  function updateNetwork() {
    const status = document.getElementById("askmarketChainStatus");
    const ethereum = window.ethereum;
    if (!ethereum || typeof ethereum.request !== "function") {
      status.textContent = "No injected wallet detected. The website remains in read-only preparation mode.";
      return;
    }
    ethereum.request({ method: "eth_chainId" }).then(function (chainId) {
      status.textContent = String(chainId).toLowerCase() === SEPOLIA_CHAIN_ID
        ? "Wallet network: Sepolia. Read-only testnet mode; no transaction methods are enabled."
        : "Wallet network is not Sepolia. Switch networks using the existing wallet control; no transactions are enabled.";
    }).catch(function () {
      status.textContent = "Could not read the wallet network. No transaction methods are enabled.";
    });
  }

  updateNetwork();
  if (window.ethereum && typeof window.ethereum.on === "function") {
    window.ethereum.on("chainChanged", updateNetwork);
    window.ethereum.on("connect", updateNetwork);
  }

  // Keep constants available for future reviewed integration without exposing
  // any write method or relying on a guessed contract address.
  window.ASKMarketChain = Object.freeze({
    signature: SIGNATURE,
    selector: SELECTOR,
    chainId: 11155111,
    transfersEnabled: false
  });
})();