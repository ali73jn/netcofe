const GRID = document.getElementById("grid-container");
const DATA_URL = "data/bookmarks.json";
const DEFAULT_ICON = "icons/default_icon.png";
const FOLDER_ICON = "icons/folder.png";
const CACHE_KEY = "favicon_cache_site_v1";
const SETTINGS_KEY = "user_settings_v1";

function isHttp(url) {
    return url && (url.startsWith("http://") || url.startsWith("https://"));
}

function loadImageSafe(src, timeout = 3000) {
    return new Promise(resolve => {
        const img = new Image();
        let done = false;

        const finish = ok => {
            if (!done) {
                done = true;
                resolve(ok);
            }
        };

        img.onload = () => {
            if (img.naturalWidth > 1 && img.naturalHeight > 1) finish(true);
            else finish(false);
        };

        img.onerror = () => finish(false);
        img.src = src;
        setTimeout(() => finish(false), timeout);
    });
}

function blobToBase64(blob) {
    return new Promise(resolve => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result);
        r.readAsDataURL(blob);
    });
}

function getCache() {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
}

function saveCache(c) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
}

async function tryDirect(iconUrl) {
    const ok = await loadImageSafe(iconUrl);
    return ok ? iconUrl : null;
}

async function tryHtml(url) {
    try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const t = await r.text();
        const d = new DOMParser().parseFromString(t, "text/html");
        const links = d.querySelectorAll("link[rel]");
        for (const l of links) {
            const rel = l.getAttribute("rel").toLowerCase();
            if (rel.includes("icon")) {
                const href = l.getAttribute("href");
                if (href) return new URL(href, url).href;
            }
        }
    } catch {}
    return null;
}

async function cacheIcon(pageUrl, iconUrl) {
    try {
        const ok = await loadImageSafe(iconUrl);
        if (!ok) return null;
        const r = await fetch(iconUrl);
        if (!r.ok) return null;
        const b = await r.blob();
        const base64 = await blobToBase64(b);
        const c = getCache();
        c[pageUrl] = base64;
        saveCache(c);
        return base64;
    } catch {
        return null;
    }
}

async function resolveFavicon(url) {
    if (!isHttp(url)) return null;

    const cache = getCache();
    if (cache[url]) return cache[url];

    const host = new URL(url).hostname;

    const fast = [
        new URL("/favicon.ico", url).href,
        `https://icons.duckduckgo.com/ip3/${host}.ico`,
        `https://www.google.com/s2/favicons?domain=${host}&sz=64`
    ];

    for (const f of fast) {
        const ok = await tryDirect(f);
        if (ok) return await cacheIcon(url, ok);
    }

    const htmlIcon = await tryHtml(url);
    if (htmlIcon) return await cacheIcon(url, htmlIcon);

    return null;
}

function createTile(item) {
    const tile = document.createElement("div");
    tile.className = "tile";

    const img = document.createElement("img");
    img.className = "tile-icon";
    img.src = DEFAULT_ICON;

    const title = document.createElement("div");
    title.className = "tile-title";
    title.textContent = item.title || "";

    if (item.url) {
        resolveFavicon(item.url).then(icon => {
            if (icon) img.src = icon;
        });

        tile.onclick = () => window.open(item.url, "_blank");
    } else {
        img.src = FOLDER_ICON;
    }

    tile.appendChild(img);
    tile.appendChild(title);
    return tile;
}

function render(items) {
    GRID.innerHTML = "";
    items.forEach(i => GRID.appendChild(createTile(i)));
}

async function loadBookmarks() {
    const r = await fetch(DATA_URL, { cache: "no-store" });
    const data = await r.json();
    render(data);
}

function loadSettings() {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
}

function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function applySettings() {
    const s = loadSettings();
    if (s.background) document.body.style.backgroundImage = `url(${s.background})`;
}

document.getElementById("background-file-input").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
        const s = loadSettings();
        s.background = r.result;
        saveSettings(s);
        applySettings();
    };
    r.readAsDataURL(f);
});

document.getElementById("export-settings-btn").onclick = () => {
    const s = loadSettings();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(s)], { type: "application/json" }));
    a.download = "settings.json";
    a.click();
};

document.getElementById("import-settings-btn").onclick = () => {
    document.getElementById("import-settings-file").click();
};

document.getElementById("import-settings-file").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
        localStorage.setItem(SETTINGS_KEY, r.result);
        applySettings();
    };
    r.readAsText(f);
});

document.getElementById("combined-online-import-btn").onclick = loadBookmarks;

document.addEventListener("DOMContentLoaded", () => {
    applySettings();
    loadBookmarks();
});
