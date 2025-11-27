class Dashboard {
    constructor() {
        this.dashboard = document.getElementById('dashboard');
        this.editMode = false;
        this.data = { cards: [], version: 1, lastModified: new Date().toISOString() };
        this.draggedCard = null;
        this.dragOffset = { x: 0, y: 0 };
        this.resizingCard = null;
        this.resizingDirection = null;
        this.pendingImportData = null;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderDashboard();
        this.updateEditModeUI();
        this.setupGridSystem();
    }

    setupEventListeners() {
        // دکمه حالت ویرایش
        document.getElementById('editModeBtn').addEventListener('click', () => {
            this.toggleEditMode();
        });

        // دکمه‌های مدیریت داده (فقط در حالت ویرایش)
        document.getElementById('addCardBtn').addEventListener('click', () => {
            this.addNewCard();
        });

        document.getElementById('dataManagerBtn').addEventListener('click', () => {
            this.showDataModal();
        });

        // مدیریت داده
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileImport(e);
        });

        document.getElementById('resetDataBtn').addEventListener('click', () => {
            this.resetData();
        });

        document.getElementById('saveDataBtn').addEventListener('click', () => {
            this.saveDataFromModal();
        });

        document.getElementById('closeDataBtn').addEventListener('click', () => {
            this.hideDataModal();
        });

        // جستجو
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchItems(e.target.value);
        });

        // رویدادهای کلیک و درگ برای گرید
        document.addEventListener('mousedown', this.handleGlobalMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleGlobalMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleGlobalMouseUp.bind(this));
    }

    setupGridSystem() {
        // محاسبه موقعیت‌های موجود در گرید
        this.gridPositions = new Set();
        this.updateGridOccupancy();
    }

    updateGridOccupancy() {
        this.gridPositions.clear();
        this.data.cards.forEach(card => {
            for (let x = card.x; x < card.x + card.width; x++) {
                for (let y = card.y; y < card.y + card.height; y++) {
                    this.gridPositions.add(`${x},${y}`);
                }
            }
        });
    }

    isPositionAvailable(x, y, width, height, ignoreCardId = null) {
        for (let i = x; i < x + width; i++) {
            for (let j = y; j < y + height; j++) {
                if (this.gridPositions.has(`${i},${j}`)) {
                    // اگر کارت در حال ویرایش باشد، موقعیت‌های خودش را نادیده بگیر
                    if (ignoreCardId) {
                        const card = this.data.cards.find(c => c.id === ignoreCardId);
                        if (card && i >= card.x && i < card.x + card.width && 
                            j >= card.y && j < card.y + card.height) {
                            continue;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    findAvailablePosition(width, height) {
        const maxX = 10; // حداکثر عرض گرید
        const maxY = 10; // حداکثر ارتفاع گرید
        
        for (let y = 0; y <= maxY - height; y++) {
            for (let x = 0; x <= maxX - width; x++) {
                if (this.isPositionAvailable(x, y, width, height)) {
                    return { x, y };
                }
            }
        }
        return { x: 0, y: 0 }; // موقعیت پیش‌فرض
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        this.updateEditModeUI();
        this.renderDashboard();
    }

    updateEditModeUI() {
        const editBtn = document.getElementById('editModeBtn');
        const editOnlyButtons = document.getElementById('editOnlyButtons');
        
        if (this.editMode) {
            editBtn.classList.add('active');
            editBtn.innerHTML = '<i class="fas fa-check"></i><span>اتمام ویرایش</span>';
            editOnlyButtons.style.display = 'flex';
            document.body.classList.add('edit-mode');
        } else {
            editBtn.classList.remove('active');
            editBtn.innerHTML = '<i class="fas fa-edit"></i><span>ویرایش</span>';
            editOnlyButtons.style.display = 'none';
            document.body.classList.remove('edit-mode');
        }
    }

    async loadData() {
        try {
            // اول سعی می‌کند از localStorage بارگذاری کند
            const localData = localStorage.getItem('dashboardData');
            if (localData) {
                const parsedData = JSON.parse(localData);
                
                // مهاجرت داده‌های قدیمی
                this.data = this.migrateData(parsedData);
                console.log('داده‌ها از localStorage بارگذاری شدند');
                return;
            }
            
            // اگر localStorage خالی است، از فایل data.json بارگذاری کن
            const response = await fetch('./data.json');
            if (response.ok) {
                const fileData = await response.json();
                this.data = this.migrateData(fileData);
                this.saveToLocalStorage();
                console.log('داده‌ها از فایل بارگذاری شدند');
            } else {
                throw new Error('فایل داده یافت نشد');
            }
        } catch (error) {
            console.log('استفاده از داده‌های پیش‌فرض:', error);
            this.data = { 
                cards: [], 
                version: 1, 
                lastModified: new Date().toISOString() 
            };
        }
        
        this.updateGridOccupancy();
    }

    migrateData(data) {
        // مهاجرت داده‌های نسخه‌های قدیمی
        if (!data.version) {
            data.version = 1;
        }
        
        if (!data.lastModified) {
            data.lastModified = new Date().toISOString();
        }
        
        // اطمینان از وجود مختصات و ابعاد برای کارت‌ها
        data.cards.forEach((card, index) => {
            if (card.x === undefined || card.y === undefined) {
                const position = this.findAvailablePosition(
                    card.width || 2, 
                    card.height || 2
                );
                card.x = position.x;
                card.y = position.y;
            }
            
            card.width = card.width || 2;
            card.height = card.height || 2;
            
            // اطمینان از وجود favicon برای آیتم‌ها
            card.items.forEach(item => {
                if (item.type === 'link' && !item.favicon) {
                    item.favicon = '';
                }
            });
        });
        
        return data;
    }

    saveToLocalStorage() {
        this.data.lastModified = new Date().toISOString();
        localStorage.setItem('dashboardData', JSON.stringify(this.data));
    }

    renderDashboard() {
        this.dashboard.innerHTML = '';
        this.data.cards.forEach(card => this.renderCard(card));
    }

    renderCard(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = card.id;
        
        // محاسبه موقعیت و سایز بر اساس گرید
        const left = card.x * (100 + 15); // cell-size + gap
        const top = card.y * (100 + 15);
        const width = card.width * 100 + (card.width - 1) * 15;
        const height = card.height * 100 + (card.height - 1) * 15;
        
        cardElement.style.left = left + 'px';
        cardElement.style.top = top + 'px';
        cardElement.style.width = width + 'px';
        cardElement.style.height = height + 'px';
        
        cardElement.innerHTML = `
            <div class="card-header">
                <div class="card-title">${this.escapeHtml(card.title)}</div>
                <div class="card-actions">
                    ${this.editMode ? `
                        <button onclick="dashboard.addItemToCard('${card.id}')" title="افزودن آیتم">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button onclick="dashboard.editCard('${card.id}')" title="ویرایش کارت">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="dashboard.deleteCard('${card.id}')" title="حذف کارت">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="items-grid">
                ${this.renderItems(card.items)}
            </div>
            ${this.editMode ? `
                <div class="resize-handle right"></div>
                <div class="resize-handle bottom"></div>
                <div class="resize-handle corner bottom-right"></div>
            ` : ''}
        `;

        this.dashboard.appendChild(cardElement);
    }

    renderItems(items) {
        return items.map(item => `
            <div class="item ${item.type}" 
                 onclick="dashboard.handleItemClick(event, '${item.id}')">
                <div class="item-icon">
                    ${item.favicon ? 
                        `<img src="${item.favicon}" alt="${this.escapeHtml(item.name)}" onerror="this.style.display='none'">` : 
                        `<i class="${item.icon || (item.type === 'folder' ? 'fas fa-folder' : 'fas fa-link')}"></i>`
                    }
                </div>
                <div class="item-name">${this.escapeHtml(item.name)}</div>
            </div>
        `).join('');
    }

    handleItemClick(event, itemId) {
        if (this.editMode) {
            event.preventDefault();
            this.editItem(itemId);
            return;
        }

        // پیدا کردن آیتم و باز کردن لینک یا پوشه
        for (let card of this.data.cards) {
            const item = card.items.find(i => i.id === itemId);
            if (item) {
                if (item.type === 'link' && item.url) {
                    window.open(item.url, '_blank');
                } else if (item.type === 'folder') {
                    this.openFolder(item);
                }
                break;
            }
        }
    }

    openFolder(folder) {
        // ایجاد یک کارت جدید برای محتوای پوشه
        const folderCard = {
            id: 'folder-' + Date.now(),
            title: folder.name,
            x: 0,
            y: 0,
            width: 3,
            height: 3,
            items: folder.items || []
        };
        
        this.data.cards.push(folderCard);
        this.saveToLocalStorage();
        this.renderDashboard();
    }

    // مدیریت درگ و ریزایز
    handleGlobalMouseDown(e) {
        if (!this.editMode) return;

        const cardElement = e.target.closest('.card');
        if (!cardElement) return;

        const cardId = cardElement.dataset.cardId;
        const card = this.data.cards.find(c => c.id === cardId);
        if (!card) return;

        // تشخیص نوع عملیات (درگ یا ریزایز)
        if (e.target.classList.contains('resize-handle')) {
            this.startResizing(card, e.target, e);
        } else if (e.target.closest('.card-header')) {
            this.startDragging(card, e);
        }
    }

    startDragging(card, e) {
        this.draggedCard = card;
        this.dragOffset.x = e.clientX - (card.x * (100 + 15));
        this.dragOffset.y = e.clientY - (card.y * (100 + 15));
    }

    startResizing(card, handle, e) {
        this.resizingCard = card;
        this.resizingDirection = handle.classList[1]; // right, bottom, bottom-right
        this.resizingStart = { x: e.clientX, y: e.clientY };
        this.resizingStartSize = { width: card.width, height: card.height };
        
        const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
        cardElement.classList.add('resizing');
    }

    handleGlobalMouseMove(e) {
        if (this.draggedCard) {
            this.handleDragging(e);
        } else if (this.resizingCard) {
            this.handleResizing(e);
        }
    }

    handleDragging(e) {
        const gridX = Math.round((e.clientX - this.dragOffset.x) / (100 + 15));
        const gridY = Math.round((e.clientY - this.dragOffset.y) / (100 + 15));
        
        // بررسی امکان جابجایی به موقعیت جدید
        if (this.isPositionAvailable(gridX, gridY, this.draggedCard.width, this.draggedCard.height, this.draggedCard.id)) {
            this.draggedCard.x = Math.max(0, gridX);
            this.draggedCard.y = Math.max(0, gridY);
            this.renderDashboard();
        }
    }

    handleResizing(e) {
        const deltaX = e.clientX - this.resizingStart.x;
        const deltaY = e.clientY - this.resizingStart.y;
        
        let newWidth = this.resizingStartSize.width;
        let newHeight = this.resizingStartSize.height;
        
        if (this.resizingDirection === 'right' || this.resizingDirection === 'bottom-right') {
            newWidth = Math.max(2, this.resizingStartSize.width + Math.round(deltaX / (100 + 15)));
        }
        
        if (this.resizingDirection === 'bottom' || this.resizingDirection === 'bottom-right') {
            newHeight = Math.max(2, this.resizingStartSize.height + Math.round(deltaY / (100 + 15)));
        }
        
        // بررسی امکان تغییر سایز
        if (this.isPositionAvailable(this.resizingCard.x, this.resizingCard.y, newWidth, newHeight, this.resizingCard.id)) {
            this.resizingCard.width = newWidth;
            this.resizingCard.height = newHeight;
            this.renderDashboard();
        }
    }

    handleGlobalMouseUp() {
        if (this.draggedCard || this.resizingCard) {
            this.saveToLocalStorage();
            this.updateGridOccupancy();
            
            if (this.resizingCard) {
                const cardElement = document.querySelector(`[data-card-id="${this.resizingCard.id}"]`);
                if (cardElement) {
                    cardElement.classList.remove('resizing');
                }
            }
        }
        
        this.draggedCard = null;
        this.resizingCard = null;
        this.resizingDirection = null;
    }

    // مدیریت کارت‌ها و آیتم‌ها
    addNewCard() {
        const title = prompt('عنوان کارت جدید:');
        if (title && title.trim()) {
            const position = this.findAvailablePosition(2, 2);
            const newCard = {
                id: Date.now().toString(),
                title: title.trim(),
                x: position.x,
                y: position.y,
                width: 2,
                height: 2,
                items: []
            };
            this.data.cards.push(newCard);
            this.saveToLocalStorage();
            this.updateGridOccupancy();
            this.renderDashboard();
        }
    }

    addItemToCard(cardId) {
        const card = this.data.cards.find(c => c.id === cardId);
        if (!card) return;

        const name = prompt('نام آیتم:');
        if (!name) return;

        const type = confirm('آیا این آیتم یک پوشه است؟\nOK = پوشه\nCancel = لینک') ? 'folder' : 'link';
        
        let url = '';
        if (type === 'link') {
            url = prompt('آدرس سایت:', 'https://');
            if (!url) return;
        }

        const newItem = {
            id: Date.now().toString(),
            name: name.trim(),
            type: type,
            url: url,
            icon: type === 'folder' ? 'fas fa-folder' : 'fas fa-link',
            favicon: ''
        };

        // برای لینک‌ها، favicon را دانلود کن
        if (type === 'link' && url) {
            this.downloadFavicon(url).then(faviconUrl => {
                newItem.favicon = faviconUrl;
                this.saveToLocalStorage();
                this.renderDashboard();
            });
        }

        card.items.push(newItem);
        this.saveToLocalStorage();
        this.renderDashboard();
    }

    async downloadFavicon(url) {
        try {
            // ساخت آدرس favicon
            const domain = new URL(url).hostname;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            
            // دانلود و ذخیره در localStorage
            const response = await fetch(faviconUrl);
            const blob = await response.blob();
            
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result;
                    resolve(base64data);
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('خطا در دانلود favicon:', error);
            return '';
        }
    }

    editCard(cardId) {
        const card = this.data.cards.find(c => c.id === cardId);
        if (!card) return;

        const newTitle = prompt('عنوان جدید کارت:', card.title);
        if (newTitle && newTitle.trim()) {
            card.title = newTitle.trim();
            this.saveToLocalStorage();
            this.renderDashboard();
        }
    }

    editItem(itemId) {
        for (let card of this.data.cards) {
            const item = card.items.find(i => i.id === itemId);
            if (item) {
                const newName = prompt('نام جدید:', item.name);
                if (newName) {
                    item.name = newName;
                    this.saveToLocalStorage();
                    this.renderDashboard();
                }
                break;
            }
        }
    }

    deleteCard(cardId) {
        if (confirm('آیا از حذف این کارت مطمئنید؟')) {
            this.data.cards = this.data.cards.filter(card => card.id !== cardId);
            this.saveToLocalStorage();
            this.updateGridOccupancy();
            this.renderDashboard();
        }
    }

    // مدیریت داده‌ها
    showDataModal() {
        this.showModal('dataModal');
        this.updateSaveButtonState();
    }

    hideDataModal() {
        this.hideModal('dataModal');
        this.pendingImportData = null;
        this.updateSaveButtonState();
    }

    updateSaveButtonState() {
        const saveBtn = document.getElementById('saveDataBtn');
        saveBtn.disabled = !this.pendingImportData;
    }

    exportData() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `dashboard-data-${timestamp}.json`;
        
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const newData = JSON.parse(e.target.result);
                
                // اعتبارسنجی داده‌ها
                if (!newData.cards || !Array.isArray(newData.cards)) {
                    throw new Error('فرمت فایل نامعتبر است');
                }

                this.pendingImportData = newData;
                this.showImportNotice();
                this.updateSaveButtonState();
                
            } catch (error) {
                alert('خطا در خواندن فایل! لطفاً فرمت JSON را بررسی کنید.\n' + error.message);
            }
        };
        reader.readAsText(file);
    }

    showImportNotice() {
        const notice = document.getElementById('importNotice');
        notice.style.display = 'flex';
    }

    saveDataFromModal() {
        if (!this.pendingImportData) return;

        try {
            this.data = this.migrateData(this.pendingImportData);
            this.saveToLocalStorage();
            this.updateGridOccupancy();
            this.renderDashboard();
            
            this.pendingImportData = null;
            this.hideDataModal();
            
            alert('✅ داده‌ها با موفقیت ذخیره شدند!');
        } catch (error) {
            alert('❌ خطا در ذخیره داده‌ها: ' + error.message);
        }
    }

    resetData() {
        if (confirm('⚠️ آیا از بازنشانی همه داده‌ها مطمئنید؟ این عمل غیرقابل بازگشت است!')) {
            this.data = { 
                cards: [], 
                version: 1, 
                lastModified: new Date().toISOString() 
            };
            this.saveToLocalStorage();
            this.updateGridOccupancy();
            this.renderDashboard();
            this.hideDataModal();
            alert('✅ داده‌ها با موفقیت بازنشانی شدند!');
        }
    }

    searchItems(query) {
        const cards = this.dashboard.querySelectorAll('.card');
        
        cards.forEach(card => {
            const items = card.querySelectorAll('.item');
            let hasVisibleItems = false;

            items.forEach(item => {
                const itemName = item.querySelector('.item-name').textContent.toLowerCase();
                const isVisible = itemName.includes(query.toLowerCase());
                item.style.display = isVisible ? 'flex' : 'none';
                if (isVisible) hasVisibleItems = true;
            });

            card.style.display = hasVisibleItems || !query ? 'block' : 'none';
        });
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// راه اندازی دشبورد
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});