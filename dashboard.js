// --- تنظیمات ---
const ROOT_FOLDER_NAME = "netcofe";
const GRID_CELL_SIZE = 20;
const GRID_GAP = 2;
// 🚨 آیکون پیش‌فرض (فولدر و فال‌بک) را اینجا تغییر دهید
const FALLBACK_ICON_PATH = "icons/default_icon.png";
const DEFAULT_ICON_PATH = "icons/default_icon.png";
const DEFAULT_BG_IMAGE_PATH = "icons/default_bg.jpg"; // 🚨 مسیر پس زمینه پیش فرض
// 🛑🚨 مسیر تصویر پیش‌فرض (برای لود اولیه در JS)
const DEFAULT_IMAGE_PATH = 'icons/wallpaper.jpg'; 

// --- تنظیمات ابعاد جدید لیست ---
const TILE_HEIGHT_PX = '30px'; 
const TILE_WIDTH_PX = '170px'; 
const ICON_SIZE_PX = '28px'; 
const HORIZONTAL_PIXEL_OFFSET = 0; // 🚨 مقدار ثابت ۵ پیکسل برای افزایش عرض کارت‌ها

let hoverTimeout = null; 
// ------------------------------------

// 🛑🛑🛑 لینک‌های Raw GitHub خود را اینجا جایگزین کنید 🛑🛑🛑
const SETTINGS_ONLINE_URL = "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/netcofe_layout.json"; 
const BOOKMARKS_ONLINE_URL = "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/netcofe_bookmarks.json"; 
// -----------------------------------------------------------

// --- وضعیت برنامه ---
let netcofeId = null; 
let layoutMap = {}; 
let isEditMode = false;
let currentPaths = {}; 
let dragInfo = null;
let resizeInfo = null;

// --- شروع برنامه ---
document.addEventListener('DOMContentLoaded', async () => {
    await initNetcofeFolder();
    await applySavedBackground(); 
    setupEventListeners();
});

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
            // بعضی favicon ها 1x1 یا خالی هستن
            if (img.naturalWidth > 1 && img.naturalHeight > 1) {
                finish(true);
            } else {
                finish(false);
            }
        };

        img.onerror = () => finish(false);

        img.src = src;

        setTimeout(() => finish(false), timeout);
    });
}


function getFaviconUrl(url) {
    try {
        const domain = new URL(url).hostname;
        return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch {
        return FALLBACK_ICON_PATH;
    }
}

function isFetchableUrl(url) {
    return url.startsWith("http://") || url.startsWith("https://");
}

// ================= FAVICON FETCH + CACHE (ADVANCED) =================

const FAVICON_CACHE_KEY = "favicon_cache_v2";

async function getFaviconCache() {
    const res = await chrome.storage.local.get(FAVICON_CACHE_KEY);
    return res[FAVICON_CACHE_KEY] || {};
}

async function saveFaviconCache(cache) {
    await chrome.storage.local.set({ [FAVICON_CACHE_KEY]: cache });
}

async function tryDirectIcon(iconUrl) {
    try {
        const ok = await loadImageSafe(iconUrl);
        return ok ? iconUrl : null;
    } catch {
        return null;
    }
}


async function cacheIcon(pageUrl, iconUrl, cache) {
    try {
        const ok = await loadImageSafe(iconUrl);
        if (!ok) return null;

        const res = await fetch(iconUrl);
        if (!res.ok) return null;

        const blob = await res.blob();
        const base64 = await blobToBase64(blob);

        cache[pageUrl] = base64;
        await saveFaviconCache(cache);

        return base64;
    } catch {
        return null;
    }
}


function blobToBase64(blob) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}


async function tryHtmlIcon(url) {
    try {
        const res = await fetch(url, {
            redirect: "follow",
            credentials: "omit",
            mode: "cors"
        });
        if (!res.ok) return null;

        const html = await res.text();

        // فقط parse – بدون inject
        const doc = new DOMParser().parseFromString(html, "text/html");

        const links = doc.querySelectorAll("link[rel]");
        for (const link of links) {
            const rel = link.getAttribute("rel").toLowerCase();
            if (
                rel.includes("icon")
            ) {
                const href = link.getAttribute("href");
                if (href) {
                    return new URL(href, url).href;
                }
            }
        }
    } catch {
        return null;
    }
    return null;
}



// گرفتن favicon نهایی (کش → fetch → fallback)
async function resolveFavicon(url) {
    if (!isFetchableUrl(url)) return null;

    const cache = await getFaviconCache();
    if (cache[url]) return cache[url];

    const domain = new URL(url).hostname;

    // 1️⃣ روش سریع قبلی (بدون HTML)
    const fastCandidates = [
        new URL("/favicon.ico", url).href,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    ];

    for (const iconUrl of fastCandidates) {
        const icon = await tryDirectIcon(iconUrl);
        if (icon) {
            return await cacheIcon(url, icon, cache);
        }
    }

    // 2️⃣ HTML favicon (مرورگرگونه)
    const htmlIcon = await tryHtmlIcon(url);
    if (htmlIcon) {
        return await cacheIcon(url, htmlIcon, cache);
    }

    // 3️⃣ هیچ‌چیز نبود
    return null;
}




async function fetchPageHtml(url) {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error("HTML fetch failed");
    return await res.text();
}


function extractBestIcon(html, baseUrl) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    const selectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]',
        'link[rel="apple-touch-icon-precomposed"]',
        'link[rel="mask-icon"]'
    ];

    for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el && el.href) {
            return new URL(el.getAttribute("href"), baseUrl).href;
        }
    }

    // fallback سنتی
    return new URL("/favicon.ico", baseUrl).href;
}

async function fetchIconAsBase64(iconUrl) {
    try {
        const res = await fetch(iconUrl);
        if (!res.ok) return null;

        const blob = await res.blob();
        return await blobToBase64(blob);
    } catch {
        return null;
    }
}

//function blobToBase64(blob) {
//    return new Promise(resolve => {
//        const reader = new FileReader();
//        reader.onloadend = () => resolve(reader.result);
//        reader.readAsDataURL(blob);
//    });
//}




// ================= FAVICON SYSTEM (FINAL – STABLE) =================

// لیست آدرس‌های احتمالی favicon (امن و بدون CORS)
function getFaviconCandidates(url) {
    try {
        const u = new URL(url);
        const origin = u.origin;
        const domain = u.hostname;

        return [
            // 🚨 NEW: Priority 1 - Local files in 'favicons' folder
            `favicons/${domain}.png`, 
            `favicons/${domain}.ico`,
            
            // بیشترین شانس
            `${origin}/favicon.ico`,

            // سایت‌های مدرن / ایرانی
            `https://icons.duckduckgo.com/ip3/${domain}.ico`,

            // فال‌بک عمومی
            `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
        ];
    } catch {
        return [];
    }
}

// لودر ترتیبی favicon با fallback قطعی
function loadFavicon(img, urls, fallback) {
    if (!urls || urls.length === 0) {
        img.src = fallback;
        return;
    }

    const url = urls.shift();
    img.src = url;

    img.onerror = () => {
        img.onerror = null;
        loadFavicon(img, urls, fallback);
    };
}



// --- مدیریت هسته (Init & Sync) ---

async function initNetcofeFolder() {
    try {
        const results = await chrome.bookmarks.search({ title: ROOT_FOLDER_NAME });
        const folder = results.find(node => !node.url);

        if (folder) {
            netcofeId = folder.id;
        } else {
            const created = await chrome.bookmarks.create({ title: ROOT_FOLDER_NAME });
            netcofeId = created.id;
            
            const c1 = await chrome.bookmarks.create({ parentId: netcofeId, title: 'عمومی' });
            await chrome.bookmarks.create({ parentId: c1.id, title: 'گوگل', url: 'https://google.com' });
            
            const defaultLayout = {};
            defaultLayout[c1.title] = { col: 1, row: 1, w: 10, h: 8 };
            await chrome.storage.local.set({ [ROOT_FOLDER_NAME + '_layout']: defaultLayout });
        }
        
        await loadAndMapLayout();
        renderDashboard();

    } catch (e) {
        console.error("Error during initialization (Check Manifest/Permissions):", e);
    }
}

async function loadAndMapLayout() {
    if (!netcofeId) return;

    const stored = await chrome.storage.local.get([ROOT_FOLDER_NAME + '_layout']);
    const nameBasedLayout = stored[ROOT_FOLDER_NAME + '_layout'] || {}; 
    
    const tree = await chrome.bookmarks.getSubTree(netcofeId);
    const rootChildren = tree[0].children;
    
    layoutMap = {}; 
    
    rootChildren.forEach(node => {
        if (!node.url && nameBasedLayout[node.title]) {
            layoutMap[node.id] = nameBasedLayout[node.title];
        }
    });
}

async function saveLayout() {
    if (!netcofeId) return;
    
    const tree = await chrome.bookmarks.getSubTree(netcofeId);
    const rootChildren = tree[0].children;

    let newNameBasedLayout = {};
    
    rootChildren.forEach(node => {
        if (!node.url && layoutMap[node.id]) {
            newNameBasedLayout[node.title] = layoutMap[node.id];
        }
    });
    
    await chrome.storage.local.set({ [ROOT_FOLDER_NAME + '_layout']: newNameBasedLayout });
}

// --- رندرینگ و DOM ---

async function renderDashboard() {
    const container = document.getElementById('grid-container'); 
    
    if (!container) { 
        console.error("Fatal Error: #grid-container element not found in HTML.");
        return; 
    }
    
    container.innerHTML = ''; 
    document.body.classList.toggle('editing-mode', isEditMode);

    if (!netcofeId) {
        container.textContent = "پوشه netcofe یافت نشد. لطفا صبر کنید یا افزونه را ریلود کنید.";
        return;
    }

    try {
        const tree = await chrome.bookmarks.getSubTree(netcofeId);
        const rootChildren = tree[0].children;

        rootChildren.forEach(node => {
            if (!node.url) { 
                createCardDOM(node, container);
            }
        });
    } catch (e) {
        console.error("Error fetching bookmarks:", e);
    }
}

function createCardDOM(bookmarkNode, container) {
    let layout = layoutMap[bookmarkNode.id];
    if (!layout) {
        layout = { col: 1, row: 1, w: 8, h: 6, view: "list" };
        layoutMap[bookmarkNode.id] = layout;
        saveLayout();
    }

    if (!layout.view) {
        layout.view = "list"; // default
    }

    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmarkNode.id;

    card.style.gridColumnStart = layout.col;
    card.style.gridRowStart = layout.row;

    // width with pixel offset
    const actualWidthInPixels =
        (layout.w * GRID_CELL_SIZE) +
        ((layout.w - 1) * GRID_GAP) +
        HORIZONTAL_PIXEL_OFFSET;

    card.style.width = `${actualWidthInPixels}px`;
    card.style.gridColumnEnd = `span ${layout.w}`;
    card.style.gridRowEnd = `span ${layout.h}`;

    card.innerHTML = `
        <div class="card-header">
            <div class="card-title">${bookmarkNode.title}</div>
            <button class="card-btn btn-drag visible-on-edit">::</button>
        </div>
        <div class="card-breadcrumbs"></div>
        <div class="card-content">
            <div class="bookmark-tiles"></div>
        </div>
        <div class="resize-handle visible-on-edit"></div>
    `;

    // HEADER BUTTONS
    const header = card.querySelector(".card-header");




    const dragBtn = card.querySelector('.btn-drag');
    const titleEl = card.querySelector('.card-title');
    const resizeEl = card.querySelector('.resize-handle');

    titleEl.addEventListener('click', () => {
        if (isEditMode) {
            const oldName = bookmarkNode.title;
            const newName = prompt("نام جدید کارت:", oldName);
            if (newName && newName !== oldName) {
                chrome.bookmarks.update(bookmarkNode.id, { title: newName }, async () => {
                    await saveLayout();
                    renderDashboard();
                });
            }
        }
    });

    dragBtn.addEventListener('mousedown', (e) => startDrag(e, card));
    resizeEl.addEventListener('mousedown', (e) => startResize(e, card));

    renderCardContents(
        card,
        bookmarkNode.id,
        card.querySelector('.card-breadcrumbs')
    );

    container.appendChild(card);
}


// 🚨 تابع بازنویسی شده Breadcrumbs و Tile Rendering
async function renderCardContents(cardEl, rootFolderId, pathContainer) {

    const layout = layoutMap[rootFolderId];
    const viewMode = layout.view || "list"; // list | grid

    const tilesContainer = cardEl.querySelector('.bookmark-tiles');
    tilesContainer.innerHTML = "";

    // Apply Grid/List CSS class
    tilesContainer.classList.toggle("view-grid", viewMode === "grid");
    tilesContainer.classList.toggle("view-list", viewMode === "list");

    let currentPath = currentPaths[rootFolderId] || [];

    pathContainer.innerHTML = '';

    // HOME crumb
    const homeSpan = document.createElement('span');
    homeSpan.className = 'crumb';
    homeSpan.textContent = 'خانه';
    homeSpan.addEventListener('click', () => {
        currentPaths[rootFolderId] = [];
        renderDashboard();
    });
    pathContainer.appendChild(homeSpan);

    // Render crumbs
    let targetId = rootFolderId;
    for (let i = 0; i < currentPath.length; i++) {
        const folderId = currentPath[i];
        try {
            const folder = await chrome.bookmarks.get(folderId);

            pathContainer.appendChild(document.createTextNode(' \u00A0 / \u00A0 '));

            const crumbSpan = document.createElement('span');
            crumbSpan.className = 'crumb';
            crumbSpan.textContent = folder[0].title;
            crumbSpan.dataset.index = i;

            crumbSpan.addEventListener('click', () => {
                currentPaths[rootFolderId] = currentPath.slice(0, i + 1);
                renderDashboard();
            });

            pathContainer.appendChild(crumbSpan);

            targetId = folderId;

        } catch {
            currentPaths[rootFolderId] = currentPath.slice(0, i);
            renderDashboard();
            return;
        }
    }

    // Add control buttons
 if (isEditMode) {

    // ❌ delete card (root only)
    if (targetId === rootFolderId) {
        const delBtn = document.createElement('button');
        delBtn.className = "card-control-btn btn-del-crumb";
        delBtn.textContent = "❌";
        delBtn.title = "حذف کارت";
        delBtn.addEventListener("click", () => {
            if (confirm("آیا مطمئن هستید؟")) {
                chrome.bookmarks.removeTree(rootFolderId, async () => {
                    delete layoutMap[rootFolderId];
                    await saveLayout();
                    renderDashboard();
                });
            }
        });
        pathContainer.appendChild(delBtn);
    }

    // ➕ add item
    const addBtn = document.createElement('button');
    addBtn.className = "card-control-btn btn-add-crumb";
    addBtn.textContent = "➕";
    addBtn.title = "افزودن آیتم جدید";
    addBtn.addEventListener('click', () => openModal(targetId, null));
    pathContainer.appendChild(addBtn);

    // 🔄 toggle view (NEW)
    const viewBtn = document.createElement('button');
    viewBtn.className = "card-control-btn btn-view-crumb";
    viewBtn.textContent = "♾️";
    viewBtn.title = "تغییر حالت نمایش";
    viewBtn.addEventListener("click", () => {
        layoutMap[rootFolderId].view =
            layoutMap[rootFolderId].view === "grid" ? "list" : "grid";

        saveLayout();
        renderDashboard();
    });
    pathContainer.appendChild(viewBtn);
}


    // Now render children
    const items = await chrome.bookmarks.getChildren(targetId);

    items.forEach(item => {
        const isFolder = !item.url;

        const tile = document.createElement("a");
        tile.className = "tile";
        tile.dataset.id = item.id;

        if (isFolder) tile.classList.add("tile-folder");

        // GRID_MODE: override tile style
        tile.classList.toggle("tile-grid-mode", viewMode === "grid");

        if (item.url) {
            tile.href = item.url;
        } else {
            tile.href = "#";
            tile.addEventListener("click", e => {
                e.preventDefault();
                if (!isEditMode) {
                    if (!currentPaths[rootFolderId]) currentPaths[rootFolderId] = [];
                    currentPaths[rootFolderId].push(item.id);
                    renderDashboard();
                }
            });
        }

        // ICON
// ---------- ICON ----------
const img = document.createElement("img");
img.className = "tile-icon";
img.src = DEFAULT_ICON_PATH;

if (item.url) {
    const candidates = getFaviconCandidates(item.url);
    loadFavicon(img, candidates, FALLBACK_ICON_PATH);
} else {
    img.src = "icons/folder.png";
}


// ---------- NAME ----------
const nameDiv = document.createElement("div");
nameDiv.className = "tile-name";
nameDiv.textContent = item.title;

// ---------- EDIT BUTTON ----------
const editBtn = document.createElement("div");
editBtn.className = "tile-edit-btn";
editBtn.textContent = "✏️";

// ---------- APPEND ----------
tile.appendChild(img);
tile.appendChild(nameDiv);
tile.appendChild(editBtn);

tile.title = item.title;

editBtn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    openModal(targetId, item);
});





tile.title = item.title; // full tooltip



        tile.querySelector(".tile-edit-btn").addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            openModal(targetId, item);
        });

        tilesContainer.appendChild(tile);
    });
}


// --- Drag & Resize System (بدون تغییر) ---
function startDrag(e, card) {
    if (e.button !== 0 || !isEditMode) return;
    e.preventDefault();
    dragInfo = {
        card: card,
        startX: e.clientX,
        startY: e.clientY,
        startCol: parseInt(card.style.gridColumnStart),
        startRow: parseInt(card.style.gridRowStart)
    };
    card.classList.add('dragging');
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
    if (!dragInfo) return;
    const dx = e.clientX - dragInfo.startX;
    const dy = e.clientY - dragInfo.startY;
    
    const dCol = Math.round(dx / (GRID_CELL_SIZE + GRID_GAP)); 
    const dRow = Math.round(dy / (GRID_CELL_SIZE + GRID_GAP));
    
    // 🚨 توجه: جهت گرید RTL است
    const newCol = Math.max(1, dragInfo.startCol - dCol); 
    const newRow = Math.max(1, dragInfo.startRow + dRow);

    dragInfo.card.style.gridColumnStart = newCol;
    dragInfo.card.style.gridRowStart = newRow;
}

function stopDrag() {
    if (dragInfo) {
        dragInfo.card.classList.remove('dragging');
        const id = dragInfo.card.dataset.id;
        
        layoutMap[id].col = parseInt(dragInfo.card.style.gridColumnStart);
        layoutMap[id].row = parseInt(dragInfo.card.style.gridRowStart);
        saveLayout(); 
    }
    dragInfo = null;
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag);
}

function startResize(e, card) {
    if (e.button !== 0 || !isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    resizeInfo = {
        card: card,
        startX: e.clientX,
        startY: e.clientY,
        startW: parseInt(card.style.gridColumnEnd.split(' ')[1]),
        startH: parseInt(card.style.gridRowEnd.split(' ')[1])
    };
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResize);
}

function onResize(e) {
    if (!resizeInfo) return;
    const dx = e.clientX - resizeInfo.startX;
    const dy = e.clientY - resizeInfo.startY;
    
    // 🚨 توجه: در سمت چپ، تغییر عرض باید برعکس محاسبه شود (افزایش به سمت چپ = کاهش X)
    const dW = Math.round(dx / (GRID_CELL_SIZE + GRID_GAP));
    const dH = Math.round(dy / (GRID_CELL_SIZE + GRID_GAP));

    const newW = Math.max(6, resizeInfo.startW - dW);
    const newH = Math.max(6, resizeInfo.startH + dH);

    resizeInfo.card.style.gridColumnEnd = `span ${newW}`;
    resizeInfo.card.style.gridRowEnd = `span ${newH}`;
    
    // 🚨 اعمال افزایش عرض پیکسلی روی DOM
    const actualWidthInPixels = (newW * GRID_CELL_SIZE) + ((newW - 1) * GRID_GAP) + HORIZONTAL_PIXEL_OFFSET;
    resizeInfo.card.style.width = `${actualWidthInPixels}px`;
}

function stopResize() {
    if (resizeInfo) {
        const id = resizeInfo.card.dataset.id;
        
        layoutMap[id].w = parseInt(resizeInfo.card.style.gridColumnEnd.split(' ')[1]);
        layoutMap[id].h = parseInt(resizeInfo.card.style.gridRowEnd.split(' ')[1]);
        saveLayout(); 
    }
    resizeInfo = null;
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', stopResize);
}


// --- Import/Export Logic (بدون تغییر) ---

async function fetchJsonFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (e) {
        console.error("Fetch Error:", e);
        alert(`خطا در دریافت داده از ${url}. لطفا لینک را چک کنید و مطمئن شوید که دسترسی به اینترنت و دسترسی افزونه (در مانیفست) فراهم است.`);
        return null;
    }
}

async function handleImportSettingsOnline() {
    const importedLayout = await fetchJsonFromUrl(SETTINGS_ONLINE_URL);
    if (importedLayout) {
        await importLayout(importedLayout);
        return true;
    }
    return false;
}

async function handleImportBookmarksOnline() {
    const importedTree = await fetchJsonFromUrl(BOOKMARKS_ONLINE_URL);
    if (importedTree) {
        await importBookmarks(importedTree, true); 
        return true;
    }
    return false;
}

async function handleBookmarksOnlyOnlineUpdate() {
    if (!isEditMode) return;
    if (!confirm("آیا فقط لیست بوکمارک‌ها بروزرسانی شود؟ (چیدمان شما حفظ می‌شود)")) return;
    
    alert("شروع عملیات: دریافت بوکمارک‌ها از گیت‌هاب...");
    
    const bookmarksSuccess = await handleImportBookmarksOnline();
    
    if (bookmarksSuccess) {
        alert("✅ لیست بوکمارک‌ها با موفقیت به‌روزرسانی شد.");
    } else {
        alert("❌ عملیات با خطا مواجه شد. (لینک بوکمارک‌ها یا ساختار JSON را بررسی کنید).");
    }
}

async function handleCombinedOnlineImport() {
    if (!isEditMode) return;
    if (!confirm("آیا مطمئن هستید؟ این عملیات، بوکمارک‌ها و سپس تنظیمات چیدمان را از لینک‌های آنلاین شما دریافت و اعمال می‌کند.")) {
        return;
    }

    alert("شروع عملیات: ابتدا بوکمارک‌ها...");
    
    const bookmarksSuccess = await handleImportBookmarksOnline();

    if (bookmarksSuccess) {
        alert("بوکمارک‌ها با موفقیت وارد شدند. اکنون تنظیمات چیدمان اعمال می‌شود...");

        const settingsSuccess = await handleImportSettingsOnline();
        
        if (settingsSuccess) {
            alert("عملیات آنلاین کامل شد. چیدمان و بوکمارک‌ها به‌روزرسانی شدند.");
            return;
        }
    }
    alert("عملیات با خطا مواجه شد. (لینک‌ها یا ساختار JSON را بررسی کنید).");
}

async function exportBookmarks() {
    if (!netcofeId) {
        alert("پوشه netcofe یافت نشد.");
        return;
    }
    const tree = await chrome.bookmarks.getSubTree(netcofeId);
    
    const exportData = tree[0].children; 

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netcofe_bookmarks_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function handleImportBookmarksFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedTree = JSON.parse(event.target.result);
            if (confirm("آیا مطمئن هستید که می‌خواهید محتوای netcofe فعلی را با محتوای این فایل جایگزین کنید؟")) {
                   await importBookmarks(importedTree, true);
                   alert("بوکمارک‌ها با موفقیت وارد و اعمال شدند.");
            }
        } catch (error) {
            alert("خطا در خواندن فایل JSON بوکمارک‌ها. مطمئن شوید که فرمت آن صحیح است.");
            console.error("Import Bookmarks JSON Parse Error:", error);
        }
        e.target.value = '';
    };
    reader.readAsText(file);
}

async function importBookmarks(importedChildren, skipConfirm = false) {
    if (!netcofeId) {
        alert("پوشه netcofe یافت نشد. لطفا افزونه را ریلود کنید.");
        return;
    }
    if (!skipConfirm && !confirm("آیا مطمئن هستید؟ این کار محتوای فعلی پوشه netcofe را حذف کرده و با محتوای فایل جایگزین می‌کند.")) {
        return;
    }

    const oldChildren = await chrome.bookmarks.getChildren(netcofeId);
    for (const child of oldChildren) {
        await chrome.bookmarks.removeTree(child.id);
    }

    const createNodes = async (parentId, nodes) => {
        for (const node of nodes) {
            const newNode = await chrome.bookmarks.create({
                parentId: parentId,
                title: node.title,
                url: node.url || undefined,
                // 🛑🚨 اضافه کردن فیلد توضیحات به هنگام Import
                // توجه: اگر JSON ورودی شما فیلد description نداشته باشد، این بخش آن را نادیده می‌گیرد
                // متأسفانه API بوکمارک کروم مستقیماً فیلدی به نام "description" ندارد و داده‌های اضافی (مانند توضیحات) به طور رسمی در API ذخیره نمی‌شوند.
                // اگر قبلاً از متادیتای سفارشی استفاده می‌کردید، نیاز به بازبینی این منطق است.
                // برای سادگی، فعلاً آن را از داده ورودی حذف می‌کنیم. 
                // اگر نیاز به ذخیره توضیحات در جای دیگری (مثل local storage) دارید، لطفاً اطلاع دهید.
            });
            if (node.children && node.children.length > 0) {
                await createNodes(newNode.id, node.children);
            }
        }
    };

    await createNodes(netcofeId, importedChildren);
    
    await loadAndMapLayout(); 
    renderDashboard();
}

function handleImportSettingsFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedLayout = JSON.parse(event.target.result);
            if (confirm("آیا مطمئن هستید؟ این کار تنظیمات چیدمان فعلی شما را بازنویسی می‌کند.")) {
                   await importLayout(importedLayout);
                   alert("تنظیمات چیدمان با موفقیت وارد و اعمال شد.");
            }
        } catch (error) {
            alert("خطا در خواندن فایل JSON تنظیمات. مطمئن شوید که فرمت آن صحیح است.");
            console.error("Import Settings JSON Parse Error:", error);
        }
        e.target.value = ''; 
    };
    reader.readAsText(file);
}

async function importLayout(importedLayout) {
    if (!netcofeId) return;

    await chrome.storage.local.set({ [ROOT_FOLDER_NAME + '_layout']: importedLayout });
    await loadAndMapLayout();
    renderDashboard();
}

// 🚨 --- مدیریت پس زمینه (توابع جدید) ---
//async function applySavedBackground() {
 //   const result = await chrome.storage.local.get('custom_bg_data');
//    const bgData = result.custom_bg_data;
//    const body = document.body;
//
//    body.style.backgroundRepeat = 'no-repeat';
//    body.style.backgroundPosition = 'center center';
//    body.style.backgroundSize = 'cover';
 //   body.style.backgroundAttachment = 'fixed';
    
 //   if (bgData) {
//        body.style.backgroundImage = `url(${bgData})`;
//    } else {
 //       body.style.backgroundImage = `url(${DEFAULT_BG_IMAGE_PATH})`;
 //   }
//}

//function handleBackgroundFileChange(e) {
//    const file = e.target.files[0];
//    if (!file) return;

 //   const reader = new FileReader();
 //   reader.onload = async (event) => {
 //       const bgData = event.target.result;
//        await chrome.storage.local.set({ 'custom_bg_data': bgData });
        
 //       document.body.style.backgroundImage = `url(${bgData})`;
 //       document.body.style.backgroundSize = 'cover';
 //       document.body.style.backgroundAttachment = 'fixed';
//    };
//    reader.readAsDataURL(file);
 //   e.target.value = ''; 
//}


// --- Modal & Utility Functions ---

function setupEventListeners() {
    const editBtn = document.getElementById('edit-mode-btn');
    const gotoBookmarksBtn = document.getElementById('goto-bookmarks-btn');
    const subControls = document.getElementById('sub-controls');
    
    const combinedOnlineImportBtn = document.getElementById('combined-online-import-btn');
	const updateBookmarksOnlyBtn = document.getElementById('update-bookmarks-only-btn'); 
    const importSettingsBtn = document.getElementById('import-settings-btn');
    const importSettingsFile = document.getElementById('import-settings-file');
    const exportSettingsBtn = document.getElementById('export-settings-btn');

    const importBookmarksBtn = document.getElementById('import-bookmarks-btn');
    const importBookmarksFile = document.getElementById('import-bookmarks-file');
    const exportBookmarksBtn = document.getElementById('export-bookmarks-btn');

    // 🚨 المان‌های پس‌زمینه
    const setBgBtn = document.getElementById('set-background-btn');
    const bgFileInput = document.getElementById('background-file-input');


    // منطق نمایش/پنهان‌سازی
    editBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        editBtn.textContent = isEditMode ? '✅' : '✏️';
        if (isEditMode) {
            subControls.classList.remove('hidden-controls');
            subControls.classList.add('visible-controls');
        } else {
            subControls.classList.remove('visible-controls');
            subControls.classList.add('hidden-controls');
        }
        renderDashboard();
    });

    // دکمه رفتن به بوکمارک‌ها (Bookmark Manager)
    gotoBookmarksBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'chrome://bookmarks/' });
    });

    // دکمه افزودن کارت (فقط برای ایجاد پوشه ریشه جدید)
    document.getElementById('add-card-btn').addEventListener('click', async () => {
        if (!isEditMode) return;
        const name = prompt("نام کارت جدید:");
        if (name) {
            const newNode = await chrome.bookmarks.create({ parentId: netcofeId, title: name });
            layoutMap[newNode.id] = { col: 1, row: 1, w: 8, h: 6 };
            await saveLayout(); 
            renderDashboard();
        }
    });

    // 🚨 دکمه آپدیت فقط بوکمارک
    updateBookmarksOnlyBtn.addEventListener('click', handleBookmarksOnlyOnlineUpdate);
	
    // 🚨 دکمه ترکیب آنلاین
    combinedOnlineImportBtn.addEventListener('click', handleCombinedOnlineImport);

    // --- رویدادهای Export/Import تنظیمات ---
    importSettingsBtn.addEventListener('click', () => { if (!isEditMode) return; importSettingsFile.click(); });
    importSettingsFile.addEventListener('change', handleImportSettingsFile);
    
    exportSettingsBtn.addEventListener('click', async () => {
        if (!isEditMode) return;
        
        await saveLayout();
        const stored = await chrome.storage.local.get([ROOT_FOLDER_NAME + '_layout']);
        const nameBasedLayout = stored[ROOT_FOLDER_NAME + '_layout'] || {}; 

        const dataStr = JSON.stringify(nameBasedLayout, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `netcofe_layout_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
    
    // --- رویدادهای Export/Import بوکمارک ---
    exportBookmarksBtn.addEventListener('click', () => { if (!isEditMode) return; exportBookmarks(); });

    importBookmarksBtn.addEventListener('click', () => { if (!isEditMode) return; importBookmarksFile.click(); });
    importBookmarksFile.addEventListener('change', handleImportBookmarksFile);

    // 🚨 رویدادهای پس زمینه
    if (setBgBtn && bgFileInput) { 
        setBgBtn.addEventListener('click', () => { 
            if (!isEditMode) return; 
            bgFileInput.click(); 
        });
        bgFileInput.addEventListener('change', handleBackgroundFileChange);
    }
    
    // --- رویدادهای Modal ---
    const modal = document.getElementById('bookmark-modal');
    document.getElementById('cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('bookmark-form').addEventListener('submit', handleBookmarkFormSubmit);
    document.getElementById('delete-btn').addEventListener('click', handleBookmarkDelete);
    document.getElementById('bookmark-type').addEventListener('change', updateModalFields);
}

function updateModalFields() {
    const type = document.getElementById('bookmark-type').value;
    const urlGroup = document.getElementById('url-field-group');
    // 🛑🚨 فیلد توضیحات (Description)
    const descField = document.getElementById('bookmark-description'); 
    
    if (type === 'bookmark') {
        urlGroup.style.display = 'block';
        // در بوکمارک، توضیحات هم می‌تواند فعال باشد (به URL مرتبط است)
        descField.parentNode.style.display = 'block'; 
    } else {
        urlGroup.style.display = 'none';
        // در پوشه، توضیحات URL ندارد و می‌توان آن را غیرفعال کرد
        descField.parentNode.style.display = 'none'; 
    }
}

function openModal(parentId, item) {
    const modal = document.getElementById('bookmark-modal');
    document.getElementById('current-card-id').value = parentId;
    document.getElementById('editing-item-id').value = item ? item.id : '';
    
    document.getElementById('bookmark-name').value = item ? item.title : '';
    document.getElementById('bookmark-url').value = item && item.url ? item.url : '';
    document.getElementById('bookmark-type').value = (item && !item.url) ? 'folder' : 'bookmark';
    
    // 🛑🚨 نمایش توضیحات در Modal
    // نکته مهم: API رسمی بوکمارک کروم فیلد description را به طور مستقیم ندارد.
    // ما برای ذخیره توضیحات باید از chrome.storage.local استفاده کنیم.
    // اما برای سادگی فعلاً از فیلد description بوکمارک استفاده نمی‌شود تا ساختار اصلی بهم نخورد.
    // اگر توضیحات در ساختار بوکمارک شما ذخیره می‌شده، باید منطق زیر بازنویسی شود:
    document.getElementById('bookmark-description').value = item && item.description ? item.description : ''; 
    
    const delBtn = document.getElementById('delete-btn');
    if (item) delBtn.classList.remove('hidden');
    else delBtn.classList.add('hidden');

    updateModalFields(); 
    modal.classList.remove('hidden');
}

function handleBookmarkFormSubmit(e) {
    e.preventDefault();
    const parentId = document.getElementById('current-card-id').value;
    const itemId = document.getElementById('editing-item-id').value;
    const type = document.getElementById('bookmark-type').value;
    const name = document.getElementById('bookmark-name').value;
    const url = document.getElementById('bookmark-url').value;
    // 🛑🚨 خواندن فیلد توضیحات
    const description = document.getElementById('bookmark-description').value.trim(); 
    const modal = document.getElementById('bookmark-modal');

    const changes = {
        title: name,
        url: type === 'bookmark' ? url : undefined
    };
    
    // 🛑🚨 نکته: API کروم فیلد توضیحات را مستقیماً پشتیبانی نمی‌کند.
    // برای ذخیره توضیحات باید از Local Storage استفاده کنید. 
    // فعلاً این بخش توضیحات را ذخیره نمی‌کند تا ساختار شما بهم نخورد.
    // اگر قصد ذخیره توضیحات را در Local Storage دارید، لطفاً اطلاع دهید تا کد تغییر کند.
    
    if (itemId) {
        chrome.bookmarks.update(itemId, changes, () => {
            modal.classList.add('hidden');
            renderDashboard();
        });
    } else {
        chrome.bookmarks.create({
            parentId: parentId,
            ...changes
        }, () => {
            modal.classList.add('hidden');
            renderDashboard();
        });
    }
}

function handleBookmarkDelete() {
    const itemId = document.getElementById('editing-item-id').value;
    const modal = document.getElementById('bookmark-modal');
    if(confirm("آیا مطمئنید؟")) {
          chrome.bookmarks.removeTree(itemId, () => {
              modal.classList.add('hidden');
              renderDashboard();
            });
    }
}

// 🛑🚨 تابع قدیمی loadAndSetBackground با نام applySavedBackground ترکیب شد
// بنابراین این تابع حذف شد:
// async function loadAndSetBackground() { ... }
