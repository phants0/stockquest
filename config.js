window.STOCKQUEST_CONFIG = (() => {
    const savedKey = localStorage.getItem("stockquest_twelvedata_key") || "";
    return {
        get TWELVEDATA_API_KEY() {
            return savedKey || "";
        },
        setKey(key) {
            const clean = String(key || "").trim();
            if (clean) localStorage.setItem("stockquest_twelvedata_key", clean);
            else localStorage.removeItem("stockquest_twelvedata_key");
        },
        hasKey() {
            return Boolean(localStorage.getItem("stockquest_twelvedata_key"));
        }
    };
})();
