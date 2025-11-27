// متغیرهای سراسری
let currentCardId = null;
let currentHoverTimeout = null;

// زمانی که DOM لود شد
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// مقداردهی اولیه برنامه
function initializeApp() {
    loadDatabase();
    renderCards();
}

// تنظیم event listeners
function setupEventListeners() {
    // مدیریت حالت ویرایش
    document.getElementById('editModeToggle').addEventListener('change', function(e) {
        document.body.classList.toggle('edit-mode', e.target.checked);
    });
    
    // افزودن کارت
    document.getElementById('addCardBtn').addEventListener('click', () => {
        showModal('addCardModal');
    });
    
    // فرم افزودن کارت
    document.getElementById('addCardForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('cardName').value;
        if (addCard(name)) {
            renderCards();
            hideModal('addCardModal');
            this.reset();
        }
    });
    
    // فرم افزودن بوکمارک
    document.getElementById('addBookmarkForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('bookmarkName').value;
        const url = document.getElementById('bookmarkUrl').value;
        const description = document.getElementById('bookmarkDescription').value;
        
        if (addBookmarkToCard(currentCardId, { name, url, description })) {
            renderCards();
            hideModal('addBookmarkModal');
            this.reset();
        }
    });
    
    // فرم افزودن پوشه
    document.getElementById('addFolderForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('folderName').value;
        
        if (addFolderToCard(currentCardId, name)) {
            renderCards();
            hideModal('addFolderModal');
            this.reset();
        }
    });
    
    // مدیریت دیتابیس
    document.getElementById('databaseBtn').addEventListener('click', () => {
        showModal('databaseModal');
    });
    
    document.getElementById('downloadBtn').addEventListener('click', downloadDatabase);
    
    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
            this.value = '';
        }
    });
    
    // جستجو
    document.querySelector('.search-input').addEventListener('input', function(e) {
        performSearch(e.target.value);
    });
    
    // دکمه‌های انتخاب نوع
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            hideModal('selectTypeModal');
            
            if (type === 'bookmark') {
                showModal('addBookmarkModal');
            } else if (type === 'folder') {
                showModal('addFolderModal');
            }
        });
    });
    
    // بستن مودال‌ها
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // بستن مودال با کلیک خارج
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

// رندر کارت‌ها
function renderCards() {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '';

    database.cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.innerHTML = createCardHTML(card);
        container.appendChild(cardElement);
    });
}

// ایجاد HTML کارت
function createCardHTML(card) {
    return `
        <div class="card-header">
            <div class="card-title">${card.name}</div>
            <div class="card-controls">
                <button class="icon-btn" onclick="renameCardPrompt('${card.id}')">✏️</button>
                <button class="icon-btn" onclick="showAddItemModal('${card.id}')">➕</button>
                <button class="icon-btn" onclick="deleteCard('${card.id}')">🗑️</button>
            </div>
        </div>
        <div class="card-content">
            ${card.items.map(item => createItemHTML(item, card.id)).join('')}
        </div>
    `;
}

// ایجاد HTML آیتم
function createItemHTML(item, cardId) {
    if (item.type === 'bookmark') {
        return `
            <div class="bookmark-item" 
                 onmouseenter="startHoverTimer(event, '${item.description}')" 
                 onmouseleave="clearHoverTimer()"
                 onclick="openBookmark('${item.url}')">
                <div class="item-header">
                    <div class="item-name">${item.name}</div>
                    <div class="item-controls">
                        <button class="icon-btn" onclick="event.stopPropagation(); editBookmark('${cardId}', '${item.id}')">✏️</button>
                        <button class="icon-btn" onclick="event.stopPropagation(); deleteItem('${cardId}', '${item.id}')">🗑️</button>
                    </div>
                </div>
                <div class="item-url">${item.url}</div>
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            </div>
        `;
    } else if (item.type === 'folder') {
        return `
            <div class="folder-item" onclick="openFolder('${cardId}', '${item.id}')">
                <div class="item-header">
                    <div class="item-name">${item.icon} ${item.name}</div>
                    <div class="item-controls">
                        <button class="icon-btn" onclick="event.stopPropagation(); renameFolder('${cardId}', '${item.id}')">✏️</button>
                        <button class="icon-btn" onclick="event.stopPropagation(); deleteItem('${cardId}', '${item.id}')">🗑️</button>
                    </div>
                </div>
                <div class="item-description">${item.items.length} آیتم</div>
            </div>
        `;
    }
    return '';
}

// نمایش مودال
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// نمایش مودال انتخاب نوع
function showAddItemModal(cardId) {
    currentCardId = cardId;
    showModal('selectTypeModal');
}

// مدیریت hover برای تولتیپ
function startHoverTimer(event, description) {
    if (!description) return;
    
    clearHoverTimer();
    
    currentHoverTimeout = setTimeout(() => {
        showTooltip(event, description);
    }, 1000);
}

function clearHoverTimer() {
    if (currentHoverTimeout) {
        clearTimeout(currentHoverTimeout);
        currentHoverTimeout = null;
    }
    hideTooltip();
}

function showTooltip(event, description) {
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = description;
    tooltip.style.display = 'block';
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = (rect.left + window.scrollX) + 'px';
    tooltip.style.top = (rect.top + window.scrollY - tooltip.offsetHeight - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

// باز کردن بوکمارک
function openBookmark(url) {
    if (!document.body.classList.contains('edit-mode')) {
        window.open(url, '_blank');
    }
}

// مدیریت کارت‌ها
function deleteCard(cardId) {
    if (confirm('آیا از حذف این کارت اطمینان دارید؟')) {
        if (deleteCard(cardId)) {
            renderCards();
        }
    }
}

function renameCardPrompt(cardId) {
    const card = findCardById(cardId);
    if (card) {
        const newName = prompt('نام جدید کارت:', card.name);
        if (newName && newName.trim() && renameCard(cardId, newName.trim())) {
            renderCards();
        }
    }
}

// مدیریت آیتم‌ها
function deleteItem(cardId, itemId) {
    if (confirm('آیا از حذف این آیتم اطمینان دارید؟')) {
        if (deleteItemFromCard(cardId, itemId)) {
            renderCards();
        }
    }
}

function editBookmark(cardId, itemId) {
    const result = findItemInCard(cardId, itemId);
    if (result && result.item.type === 'bookmark') {
        const bookmark = result.item;
        const newName = prompt('نام جدید:', bookmark.name);
        const newUrl = prompt('آدرس جدید:', bookmark.url);
        const newDesc = prompt('توضیحات جدید:', bookmark.description);
        
        if (newName && newUrl) {
            bookmark.name = newName;
            bookmark.url = newUrl;
            bookmark.description = newDesc;
            if (saveDatabase()) {
                renderCards();
            }
        }
    }
}

function renameFolder(cardId, itemId) {
    const result = findItemInCard(cardId, itemId);
    if (result && result.item.type === 'folder') {
        const folder = result.item;
        const newName = prompt('نام جدید پوشه:', folder.name);
        if (newName && newName.trim()) {
            folder.name = newName.trim();
            if (saveDatabase()) {
                renderCards();
            }
        }
    }
}

// جستجو
function performSearch(query) {
    if (query.trim()) {
        const results = searchBookmarks(query);
        displaySearchResults(results);
    } else {
        renderCards();
    }
}

function displaySearchResults(results) {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<div style="color: white; text-align: center; grid-column: 1/-1;">نتیجه‌ای یافت نشد</div>';
        return;
    }
    
    const resultsHTML = results.map(result => `
        <div class="bookmark-item" onclick="openBookmark('${result.url}')">
            <div class="item-header">
                <div class="item-name">${result.name}</div>
            </div>
            <div class="item-url">${result.url}</div>
            <div class="item-description">${result.description || ''}</div>
            <div style="font-size: 11px; opacity: 0.6; margin-top: 5px;">
                📁 ${result.cardName} ${result.folderName ? `→ ${result.folderName}` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `<div class="card" style="grid-column: 1/-1;">
        <div class="card-header">
            <div class="card-title">نتایج جستجو</div>
        </div>
        <div class="card-content">
            ${resultsHTML}
        </div>
    </div>`;
}

// آپلود فایل
async function handleFileUpload(file) {
    try {
        if (confirm('آیا از آپلود دیتابیس جدید اطمینان دارید؟ داده‌های فعلی جایگزین خواهند شد.')) {
            await uploadDatabase(file);
            renderCards();
            alert('دیتابیس با موفقیت آپلود شد!');
        }
    } catch (error) {
        alert('خطا در آپلود فایل: ' + error.message);
    }
}

// توابعی که بعداً پیاده‌سازی می‌شوند
function openFolder(cardId, folderId) {
    // برای نسخه‌های بعدی
    alert('امکان بازکردن پوشه در این نسخه وجود ندارد');
}