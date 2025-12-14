// --- تنظیمات ---
const ROOT_FOLDER_NAME = "netcofe";
const GRID_CELL_SIZE = 20;
const GRID_GAP = 2;
const FALLBACK_ICON_PATH = "icons/default_icon.png";
const DEFAULT_ICON_PATH = "icons/default_icon.png";
const DEFAULT_BG_IMAGE_PATH = "icons/default_bg.jpg";
const TILE_HEIGHT_PX = '30px';
const TILE_WIDTH_PX = '170px';
const ICON_SIZE_PX = '28px';
const HORIZONTAL_PIXEL_OFFSET = 0;

// 🛑🛑🛑 لینک فایل JSON روی گیت‌هاب خودت را اینجا بگذار 🛑🛑🛑
// فرمت فایل باید دقیقاً خروجی جیسون بوکمارک‌ها باشد
const GITHUB_DB_URL = "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/netcofe_bookmarks.json"; 

// کلیدهای ذخیره‌سازی در مرورگر
const STORAGE_KEY_DATA = "netcofe_data_v1"; // بوکمارک‌ها
const STORAGE_KEY_LAYOUT = "netcofe_layout_v1"; // چیدمان
const STORAGE_KEY_BG = "netcofe_bg_v1"; // پس‌زمینه

let layoutMap = {};
let isEditMode = false;
let currentPaths = {};
let dragInfo = null;
let resizeInfo = null;
let appData = []; // این متغیر جایگزین بوکمارک‌های کروم می‌شود

// --- شروع برنامه ---
document.addEventListener('DOMContentLoaded', async () => {
    // ثبت سرویس ورکر (برای حالت PWA و آفلاین)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(console.error);
    }

    await initData(); // لود کردن داده‌ها
    await applySavedBackground();
    setupEventListeners();
});

// --- مدیریت داده‌ها (جایگزین Chrome API) ---

// 1. لود اولیه داده‌ها
async function initData() {
    // تلاش برای خواندن از لوکال استوریج
    const localData = localStorage.getItem(STORAGE_KEY_DATA);
    const localLayout = localStorage.getItem(STORAGE_KEY_LAYOUT);

    if (localLayout) {
        layoutMap = JSON.parse(localLayout);
    }

    if (localData) {
        appData = JSON.parse(localData);
        renderDashboard();
    } else {
        // اگر لوکال خالی بود (اولین بازدید)، از گیت‌هاب بگیر
        await fetchFromGithubAndSave(true);
    }
}

// 2. تابع دریافت از گیت‌هاب (برای اولین بار یا آپدیت دستی)
async function fetchFromGithubAndSave(isFirstRun = false) {
    try {
        const response = await fetch(GITHUB_DB_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const jsonData = await response.json();
        
        // فرض می‌کنیم فایل جیسون آرایه‌ای از نودهاست
        // اگر فایل جیسون مستقیماً آرایه فرزندان است:
        appData = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        saveDataToLocal();
        
        if (!isFirstRun) {
            alert("✅ اطلاعات بوکمارک‌ها با موفقیت از سرور به‌روز شد. چیدمان شخصی شما تغییر نکرد.");
        }
        renderDashboard();
    } catch (error) {
        console.error("خطا در دریافت از گیت‌هاب:", error);
        if (isFirstRun) {
            // ساخت دیتای پیش‌فرض اگر اینترنت نبود
            appData = [{
                id: "root_default",
                title: "عمومی",
                children: [
                    { id: "g1", title: "گوگل", url: "https://google.com" }
                ]
            }];
            saveDataToLocal();
            renderDashboard();
        } else {
            alert("خطا در ارتباط با سرور. لطفاً اینترنت را چک کنید.");
        }
    }
}

// 3. ذخیره در مرورگر
function saveDataToLocal() {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(appData));
}
function saveLayoutToLocal() {
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(layoutMap));
}

// 4. توابع کمکی برای کار با درخت داده (چون دیگر API کروم نداریم)
function findNode(nodes, id) {
    for (const node of nodes) {
        if (node.id == id) return node;
        if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
        }
    }
    return null;
}

function findParentNode(nodes, childId) {
    for (const node of nodes) {
        if (node.children && node.children.some(ch => ch.id == childId)) {
            return node;
        }
        if (node.children) {
            const found = findParentNode(node.children, childId);
            if (found) return found;
        }
    }
    return null;
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// --- رندرینگ ---

function renderDashboard() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    document.body.classList.toggle('editing-mode', isEditMode);

    // رندر کارت‌ها (نودهای سطح اول)
    appData.forEach(node => {
        // فقط پوشه‌ها را به عنوان کارت نشان بده
        if (!node.url) {
            createCardDOM(node, container);
        }
    });
}

function createCardDOM(node, container) {
    let layout = layoutMap[node.id];
    if (!layout) {
        layout = { col: 1, row: 1, w: 8, h: 6, view: "list" };
        layoutMap[node.id] = layout;
        saveLayoutToLocal();
    }
    if (!layout.view) layout.view = "list";

    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = node.id;

    // استایل گرید
    card.style.gridColumnStart = layout.col;
    card.style.gridRowStart = layout.row;
    const actualWidthInPixels = (layout.w * GRID_CELL_SIZE) + ((layout.w - 1) * GRID_GAP) + HORIZONTAL_PIXEL_OFFSET;
    card.style.width = `${actualWidthInPixels}px`;
    card.style.gridColumnEnd = `span ${layout.w}`;
    card.style.gridRowEnd = `span ${layout.h}`;

    card.innerHTML = `
        <div class="card-header">
            <div class="card-title">${node.title}</div>
            <button class="card-btn btn-drag visible-on-edit">::</button>
        </div>
        <div class="card-breadcrumbs"></div>
        <div class="card-content">
            <div class="bookmark-tiles"></div>
        </div>
        <div class="resize-handle visible-on-edit"></div>
    `;

    // ایونت‌ها
    const dragBtn = card.querySelector('.btn-drag');
    const resizeEl = card.querySelector('.resize-handle');
    const titleEl = card.querySelector('.card-title');

    titleEl.addEventListener('click', () => {
        if (isEditMode) {
            const newName = prompt("نام جدید:", node.title);
            if (newName && newName !== node.title) {
                node.title = newName;
                saveDataToLocal();
                renderDashboard();
            }
        }
    });

    dragBtn.addEventListener('mousedown', (e) => startDrag(e, card));
    resizeEl.addEventListener('mousedown', (e) => startResize(e, card));

    renderCardContents(card, node.id, card.querySelector('.card-breadcrumbs'));
    container.appendChild(card);
}

function renderCardContents(cardEl, rootFolderId, pathContainer) {
    const layout = layoutMap[rootFolderId];
    const viewMode = layout.view || "list";
    const tilesContainer = cardEl.querySelector('.bookmark-tiles');
    
    tilesContainer.innerHTML = "";
    tilesContainer.classList.toggle("view-grid", viewMode === "grid");
    tilesContainer.classList.toggle("view-list", viewMode === "list");

    let currentPath = currentPaths[rootFolderId] || [];
    pathContainer.innerHTML = '';

    // دکمه خانه
    const homeSpan = document.createElement('span');
    homeSpan.className = 'crumb';
    homeSpan.textContent = 'خانه';
    homeSpan.addEventListener('click', () => {
        currentPaths[rootFolderId] = [];
        renderDashboard();
    });
    pathContainer.appendChild(homeSpan);

    // محاسبه مسیر فعلی
    let targetNode = findNode(appData, rootFolderId);
    
    // رندر بردکرامب
    currentPath.forEach((folderId, index) => {
        const folder = findNode(targetNode.children, folderId);
        if (folder) {
            pathContainer.appendChild(document.createTextNode(' / '));
            const crumbSpan = document.createElement('span');
            crumbSpan.className = 'crumb';
            crumbSpan.textContent = folder.title;
            crumbSpan.addEventListener('click', () => {
                currentPaths[rootFolderId] = currentPath.slice(0, index + 1);
                renderDashboard();
            });
            pathContainer.appendChild(crumbSpan);
            targetNode = folder;
        }
    });

    // دکمه‌های کنترلی (فقط در حالت ویرایش)
    if (isEditMode) {
        if (targetNode.id === rootFolderId) {
            // دکمه حذف کارت
            const delBtn = document.createElement('button');
            delBtn.className = "card-control-btn btn-del-crumb";
            delBtn.textContent = "❌";
            delBtn.addEventListener("click", () => {
                if (confirm("آیا این کارت حذف شود؟")) {
                    appData = appData.filter(n => n.id !== rootFolderId);
                    delete layoutMap[rootFolderId];
                    saveDataToLocal();
                    saveLayoutToLocal();
                    renderDashboard();
                }
            });
            pathContainer.appendChild(delBtn);
        }

        // دکمه افزودن
        const addBtn = document.createElement('button');
        addBtn.className = "card-control-btn btn-add-crumb";
        addBtn.textContent = "➕";
        addBtn.addEventListener('click', () => openModal(targetNode.id, null));
        pathContainer.appendChild(addBtn);

        // دکمه تغییر نما
        const viewBtn = document.createElement('button');
        viewBtn.className = "card-control-btn btn-view-crumb";
        viewBtn.textContent = "♾️";
        viewBtn.addEventListener("click", () => {
            layoutMap[rootFolderId].view = layoutMap[rootFolderId].view === "grid" ? "list" : "grid";
            saveLayoutToLocal();
            renderDashboard();
        });
        pathContainer.appendChild(viewBtn);
    }

    // نمایش آیتم‌ها
    if (targetNode && targetNode.children) {
        targetNode.children.forEach(item => {
            const isFolder = !item.url;
            const tile = document.createElement("a");
            tile.className = "tile";
            tile.dataset.id = item.id;
            if (isFolder) tile.classList.add("tile-folder");
            tile.classList.toggle("tile-grid-mode", viewMode === "grid");

            if (item.url) {
                tile.href = item.url;
                tile.target = "_blank"; // باز شدن در تب جدید
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

            // آیکون
            const img = document.createElement("img");
            img.className = "tile-icon";
            // اینجا اگر فیلد icon در جیسون بود استفاده میکنه وگرنه پیش فرض
            // برای سادگی فعلا از متد ساده استفاده میکنیم
            img.src = item.icon || (isFolder ? "icons/folder.png" : getFaviconUrl(item.url));

            const nameDiv = document.createElement("div");
            nameDiv.className = "tile-name";
            nameDiv.textContent = item.title;

            const editBtn = document.createElement("div");
            editBtn.className = "tile-edit-btn";
            editBtn.textContent = "✏️";
            editBtn.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                openModal(targetNode.id, item);
            });

            tile.appendChild(img);
            tile.appendChild(nameDiv);
            tile.appendChild(editBtn);
            tile.title = item.title;

            tilesContainer.appendChild(tile);
        });
    }
}

// --- Favicon Helper ---
function getFaviconUrl(url) {
    if (!url) return FALLBACK_ICON_PATH;
    try {
        const domain = new URL(url).hostname;
        return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch {
        return FALLBACK_ICON_PATH;
    }
}

// --- Drag & Drop (بدون تغییر لاجیک، فقط ذخیره سازی) ---
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
        saveLayoutToLocal();
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
    const dW = Math.round(dx / (GRID_CELL_SIZE + GRID_GAP));
    const dH = Math.round(dy / (GRID_CELL_SIZE + GRID_GAP));
    const newW = Math.max(6, resizeInfo.startW - dW);
    const newH = Math.max(6, resizeInfo.startH + dH);
    resizeInfo.card.style.gridColumnEnd = `span ${newW}`;
    resizeInfo.card.style.gridRowEnd = `span ${newH}`;
    const actualWidthInPixels = (newW * GRID_CELL_SIZE) + ((newW - 1) * GRID_GAP) + HORIZONTAL_PIXEL_OFFSET;
    resizeInfo.card.style.width = `${actualWidthInPixels}px`;
}

function stopResize() {
    if (resizeInfo) {
        const id = resizeInfo.card.dataset.id;
        layoutMap[id].w = parseInt(resizeInfo.card.style.gridColumnEnd.split(' ')[1]);
        layoutMap[id].h = parseInt(resizeInfo.card.style.gridRowEnd.split(' ')[1]);
        saveLayoutToLocal();
    }
    resizeInfo = null;
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', stopResize);
}

// --- مدیریت Modal و فرم‌ها ---

function setupEventListeners() {
    // دکمه‌های اصلی
    const editBtn = document.getElementById('edit-mode-btn');
    const subControls = document.getElementById('sub-controls');
    
    editBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        editBtn.textContent = isEditMode ? '✅' : '✏️';
        subControls.classList.toggle('visible-controls', isEditMode);
        subControls.classList.toggle('hidden-controls', !isEditMode);
        renderDashboard();
    });

    // دکمه آپدیت از سرور (دکمه "کره زمین" در HTML)
    const combinedOnlineImportBtn = document.getElementById('combined-online-import-btn');
    combinedOnlineImportBtn.addEventListener('click', () => fetchFromGithubAndSave(false));

    // دکمه افزودن کارت جدید
    document.getElementById('add-card-btn').addEventListener('click', () => {
        if (!isEditMode) return;
        const name = prompt("نام کارت جدید:");
        if (name) {
            const newNode = {
                id: generateId(),
                title: name,
                children: []
            };
            appData.push(newNode);
            saveDataToLocal();
            renderDashboard();
        }
    });
    
    // دکمه‌های ایمپورت/اکسپورت (فقط برای فایل JSON)
    document.getElementById('export-bookmarks-btn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(appData, null, 2)], {type : 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'netcofe_bookmarks.json';
        a.click();
    });
    
    // پس زمینه
    const setBgBtn = document.getElementById('set-background-btn');
    const bgFileInput = document.getElementById('background-file-input');
    
    setBgBtn.addEventListener('click', () => isEditMode && bgFileInput.click());
    bgFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            localStorage.setItem(STORAGE_KEY_BG, ev.target.result);
            applySavedBackground();
        };
        reader.readAsDataURL(file);
    });

    // Modal Events
    const modal = document.getElementById('bookmark-modal');
    document.getElementById('cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('bookmark-form').addEventListener('submit', handleModalSubmit);
    document.getElementById('delete-btn').addEventListener('click', handleModalDelete);
    document.getElementById('bookmark-type').addEventListener('change', () => {
        const type = document.getElementById('bookmark-type').value;
        document.getElementById('url-field-group').style.display = type === 'bookmark' ? 'block' : 'none';
    });
    
    // دکمه مدیریت بوکمارک (در وب معنی ندارد، مخفی یا غیرفعال شود بهتر است، اما اینجا لینک خالی میگذاریم)
    document.getElementById('goto-bookmarks-btn').style.display = 'none'; 
}

// --- مدیریت Modal ---
function openModal(parentId, item) {
    const modal = document.getElementById('bookmark-modal');
    document.getElementById('current-card-id').value = parentId;
    document.getElementById('editing-item-id').value = item ? item.id : '';
    document.getElementById('bookmark-name').value = item ? item.title : '';
    document.getElementById('bookmark-url').value = item && item.url ? item.url : '';
    document.getElementById('bookmark-type').value = (item && !item.url) ? 'folder' : 'bookmark';
    
    document.getElementById('url-field-group').style.display = (item && !item.url) ? 'none' : 'block';
    document.getElementById('delete-btn').classList.toggle('hidden', !item);
    
    modal.classList.remove('hidden');
}

function handleModalSubmit(e) {
    e.preventDefault();
    const parentId = document.getElementById('current-card-id').value;
    const itemId = document.getElementById('editing-item-id').value;
    const type = document.getElementById('bookmark-type').value;
    const name = document.getElementById('bookmark-name').value;
    const url = document.getElementById('bookmark-url').value;
    
    // پیدا کردن والد برای ویرایش یا افزودن
    const parentNode = findNode(appData, parentId);
    if (!parentNode) return;

    if (itemId) {
        // ویرایش
        const item = findNode(parentNode.children, itemId);
        if (item) {
            item.title = name;
            if (type === 'bookmark') item.url = url;
            else delete item.url;
        }
    } else {
        // جدید
        const newItem = {
            id: generateId(),
            title: name
        };
        if (type === 'bookmark') newItem.url = url;
        else newItem.children = [];
        
        parentNode.children = parentNode.children || [];
        parentNode.children.push(newItem);
    }
    
    saveDataToLocal();
    document.getElementById('bookmark-modal').classList.add('hidden');
    renderDashboard();
}

function handleModalDelete() {
    const parentId = document.getElementById('current-card-id').value;
    const itemId = document.getElementById('editing-item-id').value;
    
    if (confirm("آیا مطمئن هستید؟")) {
        const parentNode = findNode(appData, parentId);
        if (parentNode && parentNode.children) {
            parentNode.children = parentNode.children.filter(c => c.id !== itemId);
            saveDataToLocal();
            document.getElementById('bookmark-modal').classList.add('hidden');
            renderDashboard();
        }
    }
}

// --- پس زمینه ---
async function applySavedBackground() {
    const bgData = localStorage.getItem(STORAGE_KEY_BG);
    const body = document.body;
    body.style.backgroundRepeat = 'no-repeat';
    body.style.backgroundPosition = 'center center';
    body.style.backgroundSize = 'cover';
    body.style.backgroundAttachment = 'fixed';
    
    if (bgData) {
        body.style.backgroundImage = `url(${bgData})`;
    } else {
        body.style.backgroundImage = `url(${DEFAULT_BG_IMAGE_PATH})`;
    }
}
