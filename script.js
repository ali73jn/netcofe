class Dashboard {
    constructor() {
        this.dashboard = document.getElementById('dashboard');
        this.editMode = false;
        this.data = { cards: [] };
        this.dataVersion = 0;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderDashboard();
        this.updateEditModeUI();
    }

    setupEventListeners() {
        // دکمه حالت ویرایش
        document.getElementById('editModeBtn').addEventListener('click', () => {
            this.toggleEditMode();
        });

        // دکمه مدیریت داده
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
            this.importData(e);
        });

        document.getElementById('addCardBtn').addEventListener('click', () => {
            this.addNewCard();
        });

        document.getElementById('saveDataBtn').addEventListener('click', () => {
            this.saveDataFromModal();
        });

        document.getElementById('closeDataBtn').addEventListener('click', () => {
            this.hideModal('dataModal');
        });

        // جستجو
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchItems(e.target.value);
        });
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        this.updateEditModeUI();
        this.renderDashboard();
    }

    updateEditModeUI() {
        const editBtn = document.getElementById('editModeBtn');
        
        if (this.editMode) {
            editBtn.classList.add('active');
            editBtn.innerHTML = '<i class="fas fa-check"></i><span>اتمام ویرایش</span>';
            document.body.classList.add('edit-mode');
        } else {
            editBtn.classList.remove('active');
            editBtn.innerHTML = '<i class="fas fa-edit"></i><span>ویرایش</span>';
            document.body.classList.remove('edit-mode');
        }
    }

    async loadData() {
        try {
            // سعی می‌کند از فایل data.json بارگذاری کند
            const response = await fetch('data.json?version=' + Date.now());
            if (response.ok) {
                const fileData = await response.json();
                const localData = localStorage.getItem('dashboardData');
                
                if (localData) {
                    const parsedLocal = JSON.parse(localData);
                    // اگر نسخه فایل جدیدتر است، از آن استفاده کن
                    if (fileData.version > parsedLocal.version) {
                        this.data = fileData;
                    } else {
                        this.data = parsedLocal;
                    }
                } else {
                    this.data = fileData;
                }
            } else {
                throw new Error('فایل داده یافت نشد');
            }
        } catch (error) {
            console.log('استفاده از داده‌های لوکال:', error);
            // استفاده از داده‌های localStorage
            const localData = localStorage.getItem('dashboardData');
            if (localData) {
                this.data = JSON.parse(localData);
            } else {
                // داده‌های پیش‌فرض
                this.data = { cards: [], version: 1 };
            }
        }
        
        // افزایش نسخه
        this.data.version = (this.data.version || 0) + 1;
        this.saveToLocalStorage();
    }

    saveToLocalStorage() {
        localStorage.setItem('dashboardData', JSON.stringify(this.data));
    }

    async saveToFile() {
        // در محیط واقعی، اینجا فایل روی سرور ذخیره می‌شود
        // برای نمونه، فقط در localStorage ذخیره می‌کنیم
        this.saveToLocalStorage();
        console.log('داده‌ها ذخیره شدند (در محیط واقعی در فایل data.json ذخیره می‌شوند)');
    }

    renderDashboard() {
        this.dashboard.innerHTML = '';
        this.data.cards.forEach(card => this.renderCard(card));
    }

    renderCard(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.innerHTML = `
            <div class="card-header">
                <div class="card-title">${this.escapeHtml(card.title)}</div>
                <div class="card-actions">
                    ${this.editMode ? `
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
        `;

        this.dashboard.appendChild(cardElement);
    }

    renderItems(items) {
        return items.map(item => `
            <div class="item ${item.type}" 
                 onclick="dashboard.handleItemClick(event, '${item.id}', '${item.type}', '${this.escapeHtml(item.url)}')">
                <div class="item-icon">
                    <i class="${item.icon || (item.type === 'folder' ? 'fas fa-folder' : 'fas fa-link')}"></i>
                </div>
                <div class="item-name">${this.escapeHtml(item.name)}</div>
            </div>
        `).join('');
    }

    handleItemClick(event, itemId, type, url) {
        if (this.editMode) {
            event.preventDefault();
            // در حالت ویرایش، آیتم قابل ویرایش شود
            this.editItem(itemId);
            return;
        }

        if (type === 'link' && url) {
            window.open(url, '_blank');
        } else if (type === 'folder') {
            // باز کردن پوشه
            this.openFolder(itemId);
        }
    }

    editItem(itemId) {
        // پیدا کردن آیتم
        for (let card of this.data.cards) {
            const item = card.items.find(i => i.id === itemId);
            if (item) {
                const newName = prompt('نام جدید:', item.name);
                if (newName) {
                    item.name = newName;
                    this.saveToFile();
                    this.renderDashboard();
                }
                break;
            }
        }
    }

    openFolder(itemId) {
        // پیاده‌سازی باز کردن پوشه
        alert('قابلیت پوشه به زودی اضافه خواهد شد');
    }

    showDataModal() {
        this.populateDataModal();
        this.showModal('dataModal');
    }

    populateDataModal() {
        // پر کردن لیست کارت‌ها
        const cardsList = document.getElementById('cardsList');
        cardsList.innerHTML = this.data.cards.map(card => `
            <div class="card-item">
                <div class="card-item-info">
                    <div class="card-item-title">${this.escapeHtml(card.title)}</div>
                    <div class="card-item-stats">
                        ${card.items.length} آیتم - 
                        ${card.items.filter(item => item.type === 'folder').length} پوشه
                    </div>
                </div>
                <div class="card-item-actions">
                    <button class="btn-edit" onclick="dashboard.editCard('${card.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-add-item" onclick="dashboard.addItemToCard('${card.id}')">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn-delete" onclick="dashboard.deleteCardFromModal('${card.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // پر کردن textarea با JSON
        document.getElementById('dataTextarea').value = JSON.stringify(this.data, null, 2);
    }

    addNewCard() {
        const title = prompt('عنوان کارت جدید:');
        if (title && title.trim()) {
            const newCard = {
                id: Date.now().toString(),
                title: title.trim(),
                items: []
            };
            this.data.cards.push(newCard);
            this.saveToFile();
            this.populateDataModal();
            this.renderDashboard();
        }
    }

    addItemToCard(cardId) {
        const card = this.data.cards.find(c => c.id === cardId);
        if (!card) return;

        const name = prompt('نام آیتم:');
        if (!name) return;

        const type = confirm('آیا این آیتم یک پوشه است؟') ? 'folder' : 'link';
        let url = '';
        
        if (type === 'link') {
            url = prompt('آدرس سایت:', 'https://');
            if (!url) return;
        }

        const icon = prompt('آیکون (اختیاری - مانند: fas fa-home):', 
                           type === 'folder' ? 'fas fa-folder' : 'fas fa-link');

        const newItem = {
            id: Date.now().toString(),
            name: name.trim(),
            type: type,
            url: url,
            icon: icon || (type === 'folder' ? 'fas fa-folder' : 'fas fa-link')
        };

        card.items.push(newItem);
        this.saveToFile();
        this.populateDataModal();
        this.renderDashboard();
    }

    editCard(cardId) {
        const card = this.data.cards.find(c => c.id === cardId);
        if (!card) return;

        const newTitle = prompt('عنوان جدید کارت:', card.title);
        if (newTitle && newTitle.trim()) {
            card.title = newTitle.trim();
            this.saveToFile();
            this.populateDataModal();
            this.renderDashboard();
        }
    }

    deleteCard(cardId) {
        if (confirm('آیا از حذف این کارت مطمئنید؟')) {
            this.data.cards = this.data.cards.filter(card => card.id !== cardId);
            this.saveToFile();
            this.renderDashboard();
        }
    }

    deleteCardFromModal(cardId) {
        this.deleteCard(cardId);
        this.populateDataModal();
    }

    saveDataFromModal() {
        try {
            const newData = JSON.parse(document.getElementById('dataTextarea').value);
            
            // اعتبارسنجی داده‌ها
            if (!newData.cards || !Array.isArray(newData.cards)) {
                throw new Error('فرمت داده‌ها نامعتبر است');
            }

            this.data = newData;
            this.data.version = (this.data.version || 0) + 1;
            this.saveToFile();
            this.renderDashboard();
            this.hideModal('dataModal');
            alert('داده‌ها با موفقیت ذخیره شدند!');
        } catch (error) {
            alert('خطا در فرمت JSON! لطفاً ساختار داده را بررسی کنید.\n' + error.message);
        }
    }

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dashboard-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const newData = JSON.parse(e.target.result);
                
                // اعتبارسنجی
                if (!newData.cards || !Array.isArray(newData.cards)) {
                    throw new Error('فرمت فایل نامعتبر است');
                }

                this.data = newData;
                this.data.version = (this.data.version || 0) + 1;
                this.saveToFile();
                this.renderDashboard();
                this.populateDataModal();
                alert('داده‌ها با موفقیت وارد شدند!');
                
                // ریست فایل input
                event.target.value = '';
            } catch (error) {
                alert('خطا در خواندن فایل! لطفاً فرمت JSON را بررسی کنید.\n' + error.message);
            }
        };
        reader.readAsText(file);
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
    
    // چک کردن تغییرات در فایل data.json هر 30 ثانیه
    setInterval(() => {
        dashboard.loadData().then(() => {
            dashboard.renderDashboard();
        });
    }, 30000);
});