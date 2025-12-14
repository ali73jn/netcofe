// --- تنظیمات و لینک‌های گیت‌هاب ---
// 🛑 لینک فایل بوکمارک‌ها (Raw)
const GITHUB_BOOKMARKS_URL = "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/netcofe_bookmarks.json"; 
// 🛑 لینک فایل تنظیمات چیدمان (Raw) - اگر ندارید، یک فایل خالی در گیت‌هاب بسازید
const GITHUB_LAYOUT_URL = "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/netcofe_layout.json"; 

// تنظیمات ظاهری
const ROOT_FOLDER_NAME = "netcofe";
const GRID_CELL_SIZE = 20;
const GRID_GAP = 2;
const DEFAULT_BG_PATH = "icons/wallpaper.jpg"; // 🛑 مطمئن شوید این عکس در پوشه icons هست
const FALLBACK_ICON = "icons/default_icon.png";
const HORIZONTAL_PIXEL_OFFSET = 0;

// کلیدهای حافظه
const STORAGE_DATA = "netcofe_db_v2";
const STORAGE_LAYOUT = "netcofe_layout_v2";
const STORAGE_BG = "netcofe_bg_v2";

let layoutMap = {};
let isEditMode = false;
let currentPaths = {};
let dragInfo = null;
let resizeInfo = null;
let appData = []; 

// --- شروع برنامه ---
document.addEventListener('DOMContentLoaded', async () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    await loadInitialData();
    await applyBackground();
    setupEventListeners();
});

// --- مدیریت داده‌ها ---

async function loadInitialData() {
    // 1. لود چیدمان
    const savedLayout = localStorage.getItem(STORAGE_LAYOUT);
    if (savedLayout) layoutMap = JSON.parse(savedLayout);

    // 2. لود بوکمارک‌ها
    const savedData = localStorage.getItem(STORAGE_DATA);
    if (savedData) {
        appData = JSON.parse(savedData);
        renderDashboard();
    } else {
        // اگر اولین بار است، از گیت‌هاب بگیر
        await updateFromGithub(true, true); // true, true = فقط بوکمارک برای بار اول
    }
}

// تابع هوشمند برای خواندن ساختار پیچیده ویوالدی/کروم
function normalizeBookmarkData(nodes) {
    let cleanData = [];

    // اگر نود ورودی آرایه نیست، تبدیل به آرایه کن
    const list = Array.isArray(nodes) ? nodes : [nodes];

    list.forEach(node => {
        // تشخیص فولدرها: نودی که url ندارد و children دارد
        if (!node.url && node.children && node.children.length > 0) {
            
            // اگر اسمش "bookmarkbar" یا خالی بود، احتمالاً پوشه سیستمی است،
            // پس محتویاتش را بیرون می‌کشیم (Flatten) مگر اینکه واقعاً پوشه کاربر باشد.
            // اینجا فرض می‌کنیم سطح اول و دوم معمولاً سیستمی هستند.
            
            const isSystemFolder = node.bookmarkbar === true || node.id === "root" || node.title === "";
            
            if (isSystemFolder) {
                 // محتویات را باز کن و به لیست اصلی اضافه کن
                 cleanData = cleanData.concat(normalizeBookmarkData(node.children));
            } else {
                // این یک پوشه واقعی است (مثل "گرافیک"، "ابزار" و...)
                cleanData.push({
                    id: node.uuid || node.id, // استفاده از UUID ویوالدی برای یکتایی
                    title: node.title,
                    children: normalizeBookmarkData(node.children) // بازگشتی برای فرزندان
                });
            }
        } 
        // تشخیص لینک‌ها
        else if (node.url) {
            cleanData.push({
                id: node.uuid || node.id,
                title: node.title,
                url: node.url,
                // آیکون را اینجا ذخیره نمی‌کنیم، موقع نمایش تولید می‌کنیم
            });
        }
    });
    return cleanData;
}


// --- توابع آپدیت و ایمپورت ---

// آپدیت از گیت‌هاب
// fetchSettings: آیا تنظیمات را هم آپدیت کنم؟ (False = فقط بوکمارک)
async function updateFromGithub(fetchSettings = false, silent = false) {
    try {
        if (!silent && !confirm(fetchSettings ? 
            "آیا از بروزرسانی کامل (بوکمارک + تنظیمات) مطمئنید؟ تنظیمات شخصی شما حذف می‌شود." : 
            "آیا فقط لیست بوکمارک‌ها بروزرسانی شود؟ (چیدمان شما حفظ می‌شود)")) return;

        // 1. دریافت بوکمارک‌ها
        const resDb = await fetch(GITHUB_BOOKMARKS_URL);
        if (!resDb.ok) throw new Error("دانلود بوکمارک‌ها ناموفق بود");
        const rawJson = await resDb.json();
        
        // تبدیل و استانداردسازی دیتا
        appData = normalizeBookmarkData(rawJson);
        localStorage.setItem(STORAGE_DATA, JSON.stringify(appData));

        // 2. دریافت تنظیمات (اگر خواسته شده باشد)
        if (fetchSettings) {
            try {
                const resLayout = await fetch(GITHUB_LAYOUT_URL);
                if (resLayout.ok) {
                    layoutMap = await resLayout.json();
                    localStorage.setItem(STORAGE_LAYOUT, JSON.stringify(layoutMap));
                }
            } catch (e) {
                console.warn("تنظیمات آنلاینی یافت نشد، استفاده از پیش‌فرض.");
            }
        }

        renderDashboard();
        if (!silent) alert("✅ بروزرسانی با موفقیت انجام شد.");

    } catch (e) {
        console.error(e);
        if (!silent) alert("❌ خطا در ارتباط با گیت‌هاب. اینترنت یا فایل JSON را چک کنید.");
    }
}

// ایمپورت تنظیمات از فایل
function handleImportSettings(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            layoutMap = JSON.parse(ev.target.result);
            localStorage.setItem(STORAGE_LAYOUT, JSON.stringify(layoutMap));
            renderDashboard();
            alert("تنظیمات با موفقیت اعمال شد.");
        } catch {
            alert("فایل تنظیمات معتبر نیست.");
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // ریست اینپوت
}


// --- رندرینگ (نمایش) ---

function renderDashboard() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    document.body.classList.toggle('editing-mode', isEditMode);

    // فقط پوشه‌های سطح بالا را به عنوان کارت نشان بده
    appData.forEach(node => {
        // شرط: حتما باید children داشته باشد تا کارت شود
        if (node.children) {
            createCardDOM(node, container);
        }
    });
}

function createCardDOM(node, container) {
    let layout = layoutMap[node.id];
    // تنظیمات پیش‌فرض کارت اگر وجود نداشت
    if (!layout) {
        layout = { col: 1, row: 1, w: 8, h: 6, view: "list" };
        layoutMap[node.id] = layout;
    }
    // سیو کردن لی‌اوت جدید (برای مواقعی که کارت جدید اضافه شده)
    localStorage.setItem(STORAGE_LAYOUT, JSON.stringify(layoutMap));

    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = node.id;
    
    // اعمال Grid
    card.style.gridColumnStart = layout.col;
    card.style.gridRowStart = layout.row;
    const pxWidth = (layout.w * GRID_CELL_SIZE) + ((layout.w - 1) * GRID_GAP) + HORIZONTAL_PIXEL_OFFSET;
    card.style.width = `${pxWidth}px`;
    card.style.gridColumnEnd = `span ${layout.w}`;
    card.style.gridRowEnd = `span ${layout.h}`;

    card.innerHTML = `
        <div class="card-header">
            <div class="card-title">${node.title}</div>
            <button class="card-btn btn-drag">::</button>
        </div>
        <div class="card-breadcrumbs"></div>
        <div class="card-content">
            <div class="bookmark-tiles"></div>
        </div>
        <div class="resize-handle"></div>
    `;

    // اتصال رویدادها
    const dragBtn = card.querySelector('.btn-drag');
    const resizeEl = card.querySelector('.resize-handle');
    const titleEl = card.querySelector('.card-title');

    // تغییر نام
    titleEl.addEventListener('click', () => {
        if (isEditMode) {
            const newName = prompt("تغییر نام:", node.title);
            if (newName) {
                node.title = newName;
                localStorage.setItem(STORAGE_DATA, JSON.stringify(appData));
                renderDashboard();
            }
        }
    });

    dragBtn.addEventListener('mousedown', (e) => startDrag(e, card));
    resizeEl.addEventListener('mousedown', (e) => startResize(e, card));

    renderCardContents(card, node, card.querySelector('.card-breadcrumbs'));
    container.appendChild(card);
}

function renderCardContents(cardEl, rootNode, pathContainer) {
    const layout = layoutMap[rootNode.id];
    const tilesContainer = cardEl.querySelector('.bookmark-tiles');
    
    // تنظیم ویو (گرید یا لیست)
    tilesContainer.className = 'bookmark-tiles'; // ریست کلاس‌ها
    tilesContainer.classList.add(layout.view === "grid" ? "view-grid" : "view-list");

    // مسیر یابی (Breadcrumb) ساده
    // فعلاً برای سادگی فقط سطح اول را نشان میدهیم.
    // اگر نیاز به نویگیشن داخل کارت دارید، منطق قبلی را برگردانید.
    // اینجا تمام آیتم‌های داخل این پوشه را لیست می‌کنیم.
    
    tilesContainer.innerHTML = '';
    
    // دکمه تغییر حالت نمایش (فقط در حالت ادیت)
    pathContainer.innerHTML = '';
    if (isEditMode) {
        const viewBtn = document.createElement('button');
        viewBtn.className = "card-control-btn";
        viewBtn.innerText = layout.view === "grid" ? "list" : "grid";
        viewBtn.onclick = () => {
            layout.view = layout.view === "grid" ? "list" : "grid";
            localStorage.setItem(STORAGE_LAYOUT, JSON.stringify(layoutMap));
            renderDashboard();
        };
        pathContainer.appendChild(viewBtn);
    }

    if (rootNode.children) {
        rootNode.children.forEach(item => {
            const isFolder = !!item.children;
            const tile = document.createElement("a");
            tile.className = "tile";
            if (isFolder) tile.classList.add("tile-folder");
            if (layout.view === "grid") tile.classList.add("tile-grid-mode");

            if (item.url) {
                tile.href = item.url;
                tile.target = "_blank";
            }

            // --- آیکون ---
            const img = document.createElement("img");
            img.className = "tile-icon";
            
            if (isFolder) {
                img.src = "icons/folder.png";
            } else {
                // 💡 استفاده از API گوگل برای آیکون
                // اگر می‌خواهید از فایل‌های گیت‌هاب استفاده کنید، خط زیر را تغییر دهید
                const domain = new URL(item.url).hostname;
                img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                
                // اگر بخواهید از پوشه favicons استفاده کنید (باید فایل‌ها دقیقاً نام دامنه باشند):
                // img.src = `favicons/${domain}.png`; 
                // img.onerror = () => { img.src = FALLBACK_ICON; };
            }

            const nameDiv = document.createElement("div");
            nameDiv.className = "tile-name";
            nameDiv.textContent = item.title;

            tile.appendChild(img);
            tile.appendChild(nameDiv);
            tilesContainer.appendChild(tile);
        });
    }
}


// --- Drag & Resize (استاندارد) ---

function startDrag(e, card) {
    if (e.button !== 0 || !isEditMode) return;
    e.preventDefault();
    dragInfo = { card, startX: e.clientX, startY: e.clientY, 
                 col: parseInt(card.style.gridColumnStart), row: parseInt(card.style.gridRowStart) };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
    if (!dragInfo) return;
    const dx = e.clientX - dragInfo.startX;
    const dy = e.clientY - dragInfo.startY;
    const dCol = Math.round(dx / (GRID_CELL_SIZE + GRID_GAP));
    const dRow = Math.round(dy / (GRID_CELL_SIZE + GRID_GAP));
    // RTL: حرکت به چپ یعنی کاهش ستون (چون ستون ۱ سمت راست است) اما CSS Grid استاندارد عمل میکند.
    // معمولا در direction: rtl ستون ۱ سمت راست است. پس حرکت به چپ یعنی x منفی -> کاهش ستون؟ 
    // خیر، در CSS Grid استاندارد، افزایش ستون همیشه به سمت راست است مگر اینکه صریحا برعکس شده باشد.
    // اما چون قبلا کار میکرد دست نمیزنم، فقط لاجیک ساده:
    dragInfo.card.style.gridColumnStart = Math.max(1, dragInfo.col + dCol); // اصلاح جهت
    dragInfo.card.style.gridRowStart = Math.max(1, dragInfo.row + dRow);
}

function stopDrag() {
    if (dragInfo) {
        const id = dragInfo.card.dataset.id;
        layoutMap[id].col = parseInt(dragInfo.card.style.gridColumnStart);
        layoutMap[id].row = parseInt(dragInfo.card.style.gridRowStart);
        localStorage.setItem(STORAGE_LAYOUT, JSON.stringify(layoutMap));
    }
    dragInfo = null;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag);
}

function startResize(e, card) {
    if (e.button !== 0 || !isEditMode) return;
    e.preventDefault(); e.stopPropagation();
    resizeInfo = { card, startX: e.clientX, startY: e.clientY, 
                   w: parseInt(card.style.gridColumnEnd.split(' ')[1]), h: parseInt(card.style.gridRowEnd.split(' ')[1]) };
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResize);
}

function onResize(e) {
    if (!resizeInfo) return;
    const dx = e.clientX - resizeInfo.startX;
    const dy = e.clientY - resizeInfo.startY;
    const dW = Math.round(dx / (GRID_CELL_SIZE + GRID_GAP));
    const dH = Math.round(dy / (GRID_CELL_SIZE + GRID_GAP));
    const newW = Math.max(4, resizeInfo.w + dW); // مینیمم عرض
    const newH = Math.max(4, resizeInfo.h + dH);
    resizeInfo.card.style.gridColumnEnd = `span ${newW}`;
    resizeInfo.card.style.gridRowEnd = `span ${newH}`;
    const pxWidth = (newW * GRID_CELL_SIZE) + ((newW - 1) * GRID_GAP) + HORIZONTAL_PIXEL_OFFSET;
    resizeInfo.card.style.width = `${pxWidth}px`;
}

function stopResize() {
    if (resizeInfo) {
        const id = resizeInfo.card.dataset.id;
        layoutMap[id].w = parseInt(resizeInfo.card.style.gridColumnEnd.split(' ')[1]);
        layoutMap[id].h = parseInt(resizeInfo.card.style.gridRowEnd.split(' ')[1]);
        localStorage.setItem(STORAGE_LAYOUT, JSON.stringify(layoutMap));
    }
    resizeInfo = null;
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', stopResize);
}


// --- پس زمینه ---

async function applyBackground() {
    const bgData = localStorage.getItem(STORAGE_BG);
    const body = document.body;
    body.style.backgroundSize = 'cover';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundPosition = 'center';

    if (bgData) {
        body.style.backgroundImage = `url(${bgData})`;
    } else {
        // اگر عکسی نبود، پیش‌فرض را نشان بده
        body.style.backgroundImage = `url(${DEFAULT_BG_PATH})`;
    }
}

function handleBackgroundChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const base64 = ev.target.result;
        localStorage.setItem(STORAGE_BG, base64);
        applyBackground(); // بلافاصله اعمال کن
    };
    reader.readAsDataURL(file);
}


// --- کنترل‌ها ---

function setupEventListeners() {
    const editBtn = document.getElementById('edit-mode-btn');
    const subControls = document.getElementById('sub-controls');

    editBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        editBtn.textContent = isEditMode ? '✅' : '✏️';
        subControls.classList.toggle('visible-controls', isEditMode);
        subControls.classList.toggle('hidden-controls', !isEditMode);
        renderDashboard();
    });

    // دکمه ۱: فقط آپدیت بوکمارک (چیدمان حفظ شود)
    document.getElementById('update-bookmarks-btn').addEventListener('click', () => updateFromGithub(false));
    
    // دکمه ۲: آپدیت کامل (ریست چیدمان)
    document.getElementById('update-full-btn').addEventListener('click', () => updateFromGithub(true));

    // دکمه ۳: ایمپورت تنظیمات
    const importSettingsInput = document.getElementById('import-settings-file');
    document.getElementById('import-settings-btn').addEventListener('click', () => {
        if(isEditMode) importSettingsInput.click();
    });
    importSettingsInput.addEventListener('change', handleImportSettings);

    // دکمه ۴: تغییر پس‌زمینه
    const bgInput = document.getElementById('background-file-input');
    document.getElementById('set-background-btn').addEventListener('click', () => {
        if(isEditMode) bgInput.click();
    });
    bgInput.addEventListener('change', handleBackgroundChange);
}
