let searchRequestId = 0;
let searchTimer = null;

async function search(query) {
    const resultsEl = document.getElementById("results");
    if (!resultsEl) return;

    const clean = String(query || "").trim();

    if (!clean) {
        searchRequestId++;
        if (searchTimer) clearTimeout(searchTimer);
        resultsEl.innerHTML = "";
        resultsEl.style.display = "none";
        return;
    }

    const requestId = ++searchRequestId;
    if (searchTimer) clearTimeout(searchTimer);
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<div class="stock">Searching...</div>`;

    await new Promise(resolve => { searchTimer = setTimeout(resolve, 350); });
    if (requestId !== searchRequestId) return;

    const raw = await fetchSearch(clean);
    if (requestId !== searchRequestId) return;
    resultsEl.innerHTML = "";

    if (!raw || raw.length === 0) {
        resultsEl.innerHTML = `<div class="stock">No Results</div>`;
        return;
    }

    const seen = new Set();
    const results = raw.filter(item => {
        const symbol = String(item.symbol || "").toUpperCase();
        if (!symbol || seen.has(symbol)) return false;
        seen.add(symbol);
        return true;
    });

    const q = clean.toLowerCase();
    const best =
        results.find(r => String(r.symbol).toLowerCase() === q) ||
        results.find(r => String(r.symbol).toLowerCase().startsWith(q)) ||
        results.find(r => String(r.instrument_name || "").toLowerCase().startsWith(q)) ||
        results.find(r => String(r.instrument_name || "").toLowerCase().includes(q)) ||
        results[0];

    const others = results.filter(r => r !== best);

    function closeSearch() {
        resultsEl.innerHTML = "";
        resultsEl.style.display = "none";
        const input = document.getElementById("searchInput");
        if (input) input.value = "";
    }

    function feature(result) {
        const ticker = String(result.symbol).toUpperCase();
        if (market.some(item => String(item.ticker).toUpperCase() === ticker)) {
            showError("Already Featured");
            return;
        }
        market.unshift({ticker,name:result.instrument_name || ticker,featured:true});
        saveCurrentProfile();
        closeSearch();
        renderMarket();
    }

    function makeCard(result, isBest) {
        const ticker = String(result.symbol).toUpperCase();
        const safe = ticker.replace(/[^a-zA-Z0-9_-]/g, "_");
        const div = document.createElement("div");
        div.className = "stock";
        div.innerHTML = `
            ${isBest ? `<div style="color:gold;font-weight:bold;margin-bottom:10px;font-size:14px;">BEST MATCH</div>` : ""}
            <h2>${ticker}</h2>
            <p>${result.instrument_name || ticker}</p>
            <h1 id="search-price-${safe}" class="loading-price">Loading...</h1>
            <div class="chart" id="search-chartbox-${safe}">
                <div class="chart-status loading">Loading chart...</div>
                <canvas id="search-chart-${safe}" style="display:none;"></canvas>
            </div>
            <button class="menu-btn gold" style="width:auto;padding:10px 18px;margin-top:14px;" id="search-feature-${safe}">Feature</button>`;
        resultsEl.appendChild(div);

        const priceEl = document.getElementById(`search-price-${safe}`);
        const box = document.getElementById(`search-chartbox-${safe}`);
        const featureBtn = document.getElementById(`search-feature-${safe}`);
        featureBtn.onclick = () => feature(result);

        async function loadPrice() {
            const live = await getStock(ticker);
            if (live && Number.isFinite(Number(live.price)) && Number(live.price) > 0) {
                priceEl.textContent = `$${Number(live.price).toFixed(2)}${live.stale ? " • Last known" : ""}`;
                priceEl.className = live.stale ? "loading-price stale-price" : "";
            } else {
                priceEl.textContent = "Price unavailable";
                priceEl.className = "loading-price error-price";
            }
        }

        async function loadGraph(retry = false) {
            if (retry && typeof clearStockCache === "function") clearStockCache(ticker);
            box.innerHTML = `<div class="chart-status loading">Loading chart...</div><canvas id="search-chart-${safe}" style="display:none;"></canvas>`;
            const data = await getGraphData(ticker);
            if (!data || data.length < 2) {
                box.innerHTML = `<div class="chart-status error"><div>Unable to load chart</div><button class="chart-retry" type="button">Retry</button></div>`;
                box.querySelector(".chart-retry").onclick = () => loadGraph(true);
                return;
            }
            const canvas = document.getElementById(`search-chart-${safe}`);
            if (!canvas) return;
            canvas.style.display = "block";
            createChart(canvas, data, true);
        }

        return Promise.all([loadPrice(), loadGraph()]);
    }

    const bestPromise = makeCard(best, true);
    await bestPromise;
    if (requestId !== searchRequestId) return;
    await Promise.all(others.map(result => makeCard(result, false)));
}
