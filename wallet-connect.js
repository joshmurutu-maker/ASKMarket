(function () {
  const SEPOLIA = {
    chainId: "0xaa36a7",
    chainName: "Sepolia",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"]
  };
  const $ = (id) => document.getElementById(id);
  let provider = null;
  let account = null;
  const short = (value) => value ? value.slice(0, 6) + "…" + value.slice(-4) : "Not connected";
  const status = (message, error) => {
    const el = $("ncwStatus");
    if (el) { el.textContent = message; el.style.color = error ? "#a12c2c" : "#52665a"; }
  };
  const setConnected = (address) => {
    account = address || null;
    $("ncwAddress").textContent = short(account);
    $("ncwForget").disabled = !account;
    $("ncwConnect").textContent = account ? "Refresh wallet" : "Connect wallet";
    if (!account) { $("ncwBalance").textContent = "—"; $("ncwNetwork").textContent = "Not connected"; }
  };
  async function refresh() {
    if (!provider || !account) return;
    const [chain, balance] = await Promise.all([
      provider.request({ method: "eth_chainId" }),
      provider.request({ method: "eth_getBalance", params: [account, "latest"] })
    ]);
    const onSepolia = chain.toLowerCase() === SEPOLIA.chainId;
    $("ncwNetwork").textContent = onSepolia ? "Sepolia testnet" : "Wrong network — switch to Sepolia";
    $("ncwBalance").textContent = (Number(BigInt(balance)) / 1e18).toFixed(6) + " ETH";
    $("ncwSwitch").disabled = onSepolia;
    status(onSepolia ? "Connected. Read-only testnet balance; no funds can be moved here." : "Connected, but switch to Sepolia before testing.");
  }
  async function connect() {
    const eth = window.ethereum;
    if (!eth || typeof eth.request !== "function") {
      status("No browser wallet detected. Open ASKMarket inside MetaMask, Trust Wallet or Coinbase Wallet, then try again.", true);
      return;
    }
    provider = eth;
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || !accounts.length) throw new Error("Wallet did not return an account.");
      setConnected(accounts[0]);
      await refresh();
    } catch (error) {
      status(error && error.message ? error.message : "Wallet connection was cancelled.", true);
    }
  }
  async function switchNetwork() {
    if (!provider || !account) { await connect(); if (!account) return; }
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA.chainId }] });
    } catch (error) {
      if (error && error.code === 4902) {
        await provider.request({ method: "wallet_addEthereumChain", params: [SEPOLIA] });
      } else {
        status(error && error.message ? error.message : "Could not switch network.", true);
        return;
      }
    }
    await refresh();
  }
  $("ncwConnect").addEventListener("click", connect);
  $("ncwSwitch").addEventListener("click", switchNetwork);
  $("ncwForget").addEventListener("click", () => { setConnected(null); status("Wallet display cleared. This does not revoke the site's permission in your wallet."); });
  if (window.ethereum && window.ethereum.on) {
    window.ethereum.on("accountsChanged", (accounts) => { setConnected(accounts && accounts[0]); if (account) refresh().catch(e => status(e.message, true)); });
    window.ethereum.on("chainChanged", () => { if (account) refresh().catch(e => status(e.message, true)); });
  }
})();