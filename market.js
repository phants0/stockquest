async function renderMarket() {
    const marketEl = document.getElementById("market");
    if (!marketEl) return;

    if (!market || market.length === 0) {
        market = [...starterMarkets];
        saveCurrentProfile();
    }

    marketEl.innerHTML = "";
    const cards = new Map();

    for (const stock of market) {
        const safe = String(stock.ticker).replace(/[^a-zA-Z0-9_-]/g, "_");
        const div = document.createElement("div");
        div.className = "stock";
        div.innerHTML = `
            <h2>${stock.ticker}</h2>
            <p>${stock.name || stock.ticker}</p>
            <h1 id="price-${safe}" class="loading-price">Loading...</h1>
            <div class="chart" id="chartbox-${safe}">
                <div class="chart-status loading">Loading chart...</div>
                <canvas id="chart-${safe}" style="display:none;"></canvas>
            </div>
            <div class="buy-row">
                <input type="number" min="1" value="1" class="share-input" id="buy-${safe}">
                <button class="menu-btn buy-btn" id="buybtn-${safe}" disabled>Buy</button>
                <button class="menu-btn gold unf-btn" id="unfeature-${safe}">Unfeature</button>
            </div>`;
        marketEl.appendChild(div);

        cards.set(stock.ticker, {
            stock, safe,
            priceEl: document.getElementById(`price-${safe}`),
            chartBox: document.getElementById(`chartbox-${safe}`),
            buyInput: document.getElementById(`buy-${safe}`),
            buyButton: document.getElementById(`buybtn-${safe}`),
            unfeatureButton: document.getElementById(`unfeature-${safe}`)
        });
    }

    function chartLoading(card) {
        card.chartBox.innerHTML = `
            <div class="chart-status loading">Loading chart...</div>
            <canvas id="chart-${card.safe}" style="display:none;"></canvas>`;
    }

    function chartFailed(card) {
        card.chartBox.innerHTML = `
            <div class="chart-status error">
                <div>Unable to load chart</div>
                <button class="chart-retry" type="button">Retry</button>
            </div>`;
        card.chartBox.querySelector(".chart-retry").onclick = () => loadGraph(card, true);
    }

    async function loadGraph(card, retry = false) {
        chartLoading(card);
        if (retry && typeof clearStockCache === "function") clearStockCache(card.stock.ticker);

        const data = await getGraphData(card.stock.ticker);
        if (!data || data.length < 2) {
            chartFailed(card);
            return;
        }

        const canvas = document.getElementById(`chart-${card.safe}`);
        if (!canvas) return chartFailed(card);
        canvas.style.display = "block";

        try {
            createChart(canvas, data, card.live?.green !== false);
        } catch (error) {
            console.error(`Chart render failed for ${card.stock.ticker}:`, error);
            chartFailed(card);
        }
    }

    async function loadPrice(card) {
        const live = await getStock(card.stock.ticker);
        card.live = live;

        if (live && Number.isFinite(Number(live.price)) && Number(live.price) > 0) {
            const price = Number(live.price);
            card.priceEl.textContent = `$${price.toFixed(2)}${live.stale ? " • Last known" : ""}`;
            card.priceEl.className = live.stale ? "loading-price stale-price" : "";
            card.buyButton.disabled = false;

            card.buyButton.onclick = () => {
                const amount = Number(card.buyInput.value) || 1;
                const total = price * amount;
                if (total <= 0) return showError("Invalid stock price");
                if (cash < total) return showError("Not enough money");

                cash -= total;
                if (!portfolio[card.stock.ticker]) portfolio[card.stock.ticker] = { shares: 0 };
                portfolio[card.stock.ticker].shares += amount;
                saveCurrentProfile();
                renderPortfolio();
                renderApp();
            };
            return;
        }

        card.priceEl.textContent = "Price unavailable";
        card.priceEl.className = "loading-price error-price";
        card.buyButton.disabled = true;
    }

    await Promise.all([...cards.values()].map(card => Promise.all([loadPrice(card), loadGraph(card)])));

    for (const card of cards.values()) {
        card.unfeatureButton.onclick = () => {
            market = market.filter(item => item.ticker !== card.stock.ticker);
            saveCurrentProfile();
            renderMarket();
        };
    }

    renderPortfolio();
}

function renderPortfolio() {
    const port = document.getElementById("portfolio");
    if (!port) return;
    port.innerHTML = "";

    const entries = Object.entries(portfolio);
    if (entries.length === 0) {
        port.innerHTML = `<p style="color:#777">No shares owned.</p>`;
        return;
    }

    entries.forEach(([ticker, data]) => {
        const div = document.createElement("div");
        div.className = "stock";
        div.innerHTML = `<h3>${ticker}</h3><p>Shares: ${data.shares}</p>`;
        port.appendChild(div);
    });
}
