// script.js - Crypto Price Tracker with all features & UI polish

const API_BASE = "https://api.coingecko.com/api/v3";

const selectors = {
  homeSection: document.getElementById("homeSection"),
  searchSection: document.getElementById("searchSection"),
  detailSection: document.getElementById("detailSection"),

  coinsGrid: document.getElementById("coinsGrid"),
  homeStatus: document.getElementById("homeStatus"),

  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  searchStatus: document.getElementById("searchStatus"),
  searchBackBtn: document.getElementById("searchBackBtn"),

  detailTitle: document.getElementById("detailTitle"),
  detailContent: document.getElementById("detailContent"),
  detailStatus: document.getElementById("detailStatus"),
  detailBackBtn: document.getElementById("detailBackBtn"),
  priceChart: document.getElementById("priceChart"),

  currencySelect: document.getElementById("currencySelect"),
  sortSelect: document.getElementById("sortSelect"),
  autoRefreshSelect: document.getElementById("autoRefreshSelect"),

  btnHome: document.getElementById("btnHome"),
  btnSearch: document.getElementById("btnSearch"),
  btnFavFilter: document.getElementById("btnFavFilter"),
};

let coinsData = [];
let favorites = new Set(JSON.parse(localStorage.getItem("favorites") || "[]"));
let currentCurrency = selectors.currencySelect.value;
let currentSort = selectors.sortSelect.value;
let autoRefreshInterval = null;
let chartInstance = null;

// Helper: format number with commas
function formatNumber(num) {
  if (num === null || num === undefined) return "N/A";
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
// Helper: format price based on currency
function formatPrice(num, currency) {
  if (num === null || num === undefined) return "N/A";
  const symbolMap = {
    usd: "$",
    eur: "€",
    pkr: "₨",
    gbp: "£",
    inr: "₹",
  };
  const symbol = symbolMap[currency.toLowerCase()] || "";
  return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

// Show section helper
function showSection(section) {
  [selectors.homeSection, selectors.searchSection, selectors.detailSection].forEach(sec => {
    sec.classList.add("hidden");
  });
  section.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Render a single coin card (for home & search)
function renderCoinCard(coin) {
  const changeClass = coin.price_change_percentage_24h >= 0 ? "badge-up" : "badge-down";
  const starClass = favorites.has(coin.id) ? "star-active" : "";
  return `
  <div class="coin-card" data-id="${coin.id}" tabindex="0" role="button" aria-label="View details for ${coin.name}">
    <div class="coin-header">
      <img src="${coin.image}" alt="${coin.name} logo" class="coin-image" />
      <div class="flex-grow">
        <h3 class="text-lg font-semibold">${coin.name} <span class="text-gray-400 text-sm uppercase">(${coin.symbol})</span></h3>
        <div class="text-sm text-gray-400">Rank #${coin.market_cap_rank || "N/A"}</div>
      </div>
      <button class="star-btn ${starClass}" aria-label="Toggle favorite for ${coin.name}" title="Toggle Favorite">&#9733;</button>
    </div>
    <div class="mt-2 space-y-1 text-sm">
      <div>Price: <strong>${formatPrice(coin.current_price, currentCurrency)}</strong></div>
      <div>Market Cap: <strong>${formatNumber(coin.market_cap)}</strong></div>
      <div>24h Change: <span class="${changeClass}">${coin.price_change_percentage_24h?.toFixed(2)}%</span></div>
    </div>
  </div>
  `;
}

// Fetch top coins for home
async function fetchTopCoins() {
  selectors.homeStatus.textContent = "Loading...";
  try {
    const url = `${API_BASE}/coins/markets?vs_currency=${currentCurrency}&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch coins");
    coinsData = await res.json();
    sortCoins();
    renderCoinsGrid();
    selectors.homeStatus.textContent = `Showing top ${coinsData.length} coins.`;
  } catch (e) {
    selectors.homeStatus.textContent = "Error loading data. Try refreshing.";
    console.error(e);
  }
}

// Sort coins based on currentSort
function sortCoins() {
  switch (currentSort) {
    case "market_cap_asc":
      coinsData.sort((a, b) => a.market_cap - b.market_cap);
      break;
    case "market_cap_desc":
      coinsData.sort((a, b) => b.market_cap - a.market_cap);
      break;
    case "price_asc":
      coinsData.sort((a, b) => a.current_price - b.current_price);
      break;
    case "price_desc":
      coinsData.sort((a, b) => b.current_price - a.current_price);
      break;
    case "change_asc":
      coinsData.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
      break;
    case "change_desc":
      coinsData.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
      break;
    default:
      break;
  }
}

// Render coins grid on home
function renderCoinsGrid(filterFav = false) {
  let dataToRender = coinsData;
  if (filterFav) {
    dataToRender = coinsData.filter(c => favorites.has(c.id));
  }
  if (dataToRender.length === 0) {
    selectors.coinsGrid.innerHTML = `<p class="text-center text-gray-400 col-span-full">No coins to display.</p>`;
    return;
  }
  selectors.coinsGrid.innerHTML = dataToRender.map(renderCoinCard).join("");
}

// Handle favorite toggle
function toggleFavorite(coinId) {
  if (favorites.has(coinId)) {
    favorites.delete(coinId);
  } else {
    favorites.add(coinId);
  }
  localStorage.setItem("favorites", JSON.stringify(Array.from(favorites)));
  renderCoinsGrid(selectors.btnFavFilter.classList.contains("active"));
}

// Attach event listeners to coin cards
function attachCoinCardListeners() {
  document.querySelectorAll(".coin-card").forEach(card => {
    // Click for details
    card.onclick = () => showCoinDetail(card.dataset.id);
    // Favorite star button
    const starBtn = card.querySelector(".star-btn");
    starBtn.onclick = e => {
      e.stopPropagation();
      toggleFavorite(card.dataset.id);
      starBtn.classList.toggle("star-active");
    };
  });
}


// Show coin detail page
async function showCoinDetail(coinId) {
  showSection(selectors.detailSection);
  selectors.detailStatus.textContent = "Loading details...";
  selectors.detailContent.innerHTML = "";
  selectors.detailTitle.textContent = "";

  try {
    // Fetch coin detail
    const coinRes = await fetch(`${API_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
    if (!coinRes.ok) throw new Error("Coin not found");
    const coin = await coinRes.json();

    selectors.detailTitle.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;

    const market = coin.market_data;

    // Description with scrollbar
    const descriptionHTML = coin.description?.en
      ? `<div class="max-h-40 overflow-auto text-gray-300 leading-relaxed mb-4">${coin.description.en.split(". ")[0] || ""}.</div>`
      : "";

    // Price change badge color
    const change24 = market.price_change_percentage_24h_in_currency[currentCurrency] ?? 0;
    const changeClass = change24 >= 0 ? "badge-up" : "badge-down";

    selectors.detailContent.innerHTML = `
      <div>
        ${descriptionHTML}
        <ul class="space-y-2 text-sm">
          <li><strong>Rank:</strong> ${coin.market_cap_rank || "N/A"}</li>
          <li><strong>Current Price:</strong> ${formatPrice(market.current_price[currentCurrency], currentCurrency)}</li>
          <li><strong>Market Cap:</strong> ${formatNumber(market.market_cap[currentCurrency])}</li>
          <li><strong>Total Supply:</strong> ${formatNumber(coin.market_data.total_supply)}</li>
          <li><strong>Circulating Supply:</strong> ${formatNumber(market.circulating_supply)}</li>
          <li><strong>24h Change:</strong> <span class="${changeClass}">${change24.toFixed(2)}%</span></li>
          <li><strong>All-Time High:</strong> ${formatPrice(market.ath[currentCurrency], currentCurrency)} (${new Date(market.ath_date[currentCurrency]).toLocaleDateString()})</li>
          <li><strong>Volume (24h):</strong> ${formatNumber(market.total_volume[currentCurrency])}</li>
        </ul>
      </div>
    `;

    // Fetch price chart data
    await drawPriceChart(coinId);

    selectors.detailStatus.textContent = "";
  } catch (err) {
    selectors.detailStatus.textContent = "Error loading coin details.";
    console.error(err);
  }
}

// Draw price chart using Chart.js
async function drawPriceChart(coinId) {
  try {
    const res = await fetch(`${API_BASE}/coins/${coinId}/market_chart?vs_currency=${currentCurrency}&days=30&interval=daily`);
    if (!res.ok) throw new Error("Failed to fetch chart data");
    const data = await res.json();

    const labels = data.prices.map(p => new Date(p[0]).toLocaleDateString());
    const prices = data.prices.map(p => p[1]);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(selectors.priceChart.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: `${coinId} price (${currentCurrency.toUpperCase()})`,
          data: prices,
          borderColor: "#facc15",
          backgroundColor: "rgba(250, 204, 21, 0.3)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: "#facc15" } }
        },
        scales: {
          x: { ticks: { color: "#ccc" }, grid: { display: false } },
          y: { ticks: { color: "#ccc" }, grid: { color: "#444" } }
        }
      }
    });
  } catch (err) {
    console.error("Chart error", err);
  }
}

// Search coins
async function performSearch(query) {
  selectors.searchStatus.textContent = "Searching...";
  selectors.searchResults.innerHTML = "";
  try {
    const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();

    if (!data.coins.length) {
      selectors.searchStatus.textContent = "No results found.";
      return;
    }

    selectors.searchStatus.textContent = `Found ${data.coins.length} results.`;
    selectors.searchResults.innerHTML = data.coins
      .map(c => renderCoinCard({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        image: c.thumb,
        market_cap_rank: c.market_cap_rank || "N/A",
        current_price: coinsData.find(cd => cd.id === c.id)?.current_price || 0,
        market_cap: coinsData.find(cd => cd.id === c.id)?.market_cap || 0,
        price_change_percentage_24h: coinsData.find(cd => cd.id === c.id)?.price_change_percentage_24h || 0,
      }))
      .join("");

    attachCoinCardListeners();
  } catch (err) {
    selectors.searchStatus.textContent = "Error performing search.";
    console.error(err);
  }
}

// Event listeners and initialization
function addEventListeners() {
  // Navigation buttons
  selectors.btnHome.onclick = () => {
    showSection(selectors.homeSection);
    renderCoinsGrid();
  };
  selectors.btnSearch.onclick = () => {
    showSection(selectors.searchSection);
    selectors.searchInput.value = "";
    selectors.searchResults.innerHTML = "";
    selectors.searchStatus.textContent = "";
  };
  selectors.btnFavFilter.onclick = () => {
    selectors.btnFavFilter.classList.toggle("active");
    renderCoinsGrid(selectors.btnFavFilter.classList.contains("active"));
  };

  // Back buttons
  selectors.searchBackBtn.onclick = () => {
    showSection(selectors.homeSection);
  };
  selectors.detailBackBtn.onclick = () => {
    showSection(selectors.homeSection);
  };

  // Search form submit
  selectors.searchForm.onsubmit = e => {
    e.preventDefault();
    const query = selectors.searchInput.value.trim();
    if (query) performSearch(query);
  };

  // Currency change
  selectors.currencySelect.onchange = () => {
    currentCurrency = selectors.currencySelect.value;
    fetchTopCoins();
  };

  // Sort change
  selectors.sortSelect.onchange = () => {
    currentSort = selectors.sortSelect.value;
    sortCoins();
    renderCoinsGrid(selectors.btnFavFilter.classList.contains("active"));
  };

  // Auto refresh
  selectors.autoRefreshSelect.onchange = () => {
    const val = Number(selectors.autoRefreshSelect.value);
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    if (val > 0) {
      autoRefreshInterval = setInterval(fetchTopCoins, val * 1000);
    }
  };

  // Delegate clicks on coin cards (for home grid)
  selectors.coinsGrid.addEventListener("click", e => {
    const card = e.target.closest(".coin-card");
    if (!card) return;

    // If star clicked, handle favorite toggle
    if (e.target.classList.contains("star-btn")) {
      e.stopPropagation();
      toggleFavorite(card.dataset.id);
      e.target.classList.toggle("star-active");
    } else {
      showCoinDetail(card.dataset.id);
    }
  });
}

// Initial load
async function init() {
  addEventListeners();
  await fetchTopCoins();

  // Start auto-refresh if selected
  const val = Number(selectors.autoRefreshSelect.value);
  if (val > 0) {
    autoRefreshInterval = setInterval(fetchTopCoins, val * 1000);
  }
}

init();
