class Dashboard {
    constructor() {
        this.dashboard = document.getElementById('dashboard');
        this.currentCard = null;
        this.editMode = false;
        this.draggedCard = null;
        this.dragOffset = { x: 0, y: 0 };
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderCards();
        this.updateEditModeUI();
    }

    setupEventListeners() {
        // دکمه حالت ویرایش
        document.getElementById('editModeBtn').addEventListener('click', () => {
            this.toggleEditMode();
        });

        // دکمه افزودن کارت
        document.getElementById('addCardBtn').addEventListener('click', () => {
            this.showModal('cardModal');
        });

        // دکمه‌های مودال کارت
        document.getElementById('createCardBtn').addEventListener('click', () => {
            this.createCard();
        });

        document.getElementById('cancelCardBtn').addEventListener('click', () => {
            this.hideModal('cardModal');
        });

        // دکمه‌های مودال آیتم
        document.getElementById('createItemBtn').addEventListener('click', () => {
            this.createItem();
        });

        document.getElementById('cancelItemBtn').addEventListener('click', () => {
            this.hideModal('itemModal');
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

        document.getElementById('saveDataBtn').addEventListener('click', () => {
            this.saveDataFromTextarea();
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
        this.renderCards();
    }

    updateEditModeUI() {
        const editBtn = document.getElementById('editModeBtn');
        const body = document.body;
        
        if (this.editMode) {
            editBtn.classList.add('active');
            editBtn.innerHTML = '<i class="fas fa-check"></i><span>اتمام ویرایش</span>';
            body.classList.add('edit-mode');
        } else {
            editBtn.classList.remove('active');
            editBtn.innerHTML = '<i class="fas fa-edit"></i><span>ویرایش</span>';
            body.classList.remove('edit-mode');
        }
    }

    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('فایل داده یافت نشد');
            
            const data = await response.json();
            this.data = data;
            
            // ذخیره در localStorage به عنوان پشتیبان
            localStorage.setItem('dashboardData', JSON.stringify(data));
        } catch (error) {
            console.error('خطا در بارگذاری داده:', error);
            // استفاده از داده‌های پیش‌فرض
            this.data = {
                cards: [],
                settings: { editMode: false }
            };
        }
    }

    async saveData() {
        // هم در فایل localStorage و هم در data.json ذخیره می‌شود
        localStorage.setItem('dashboardData', JSON.stringify(this.data));
        
        // در محیط واقعی، اینجا باید به سرور آپلود شود
        // برای نمونه، نمایش داده می‌شود
        this.showDataInModal();
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        this.clearModalInputs();
    }

    clearModalInputs() {
        document.getElementById('cardTitle').value = '';
        document.getElementById('cardWidth').value = '300';
        document.getElementById('cardHeight').value = '200';
        document.getElementById('itemName').value = '';
        document.getElementById('itemUrl').value = '';
        document.getElementById('itemIcon').value = '';
    }

    createCard() {
        const title = document.getElementById('cardTitle').value.trim();
        const width = parseInt(document.getElementById('cardWidth').value) || 300;
        const height = parseInt(document.getElementById('cardHeight').value) || 200;

        if (!title) return;

        const card = {
            id: Date.now().toString(),
            title: title,
            x: this.getRandomPosition(50, 300),
            y: this.getRandomPosition(50, 200),
            width: width,
            height: height,
            items: []
        };

        this.data.cards.push(card);
        this.saveData();
        this.renderCards();
        this.hideModal('cardModal');
    }

    getRandomPosition(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    showAddItemModal(cardId) {
        if (!this.editMode) return;
        
        this.currentCard = cardId;
        this.showModal('itemModal');
    }

    createItem() {
        if (!this.currentCard) return;

        const name = document.getElementById('itemName').value.trim();
        const url = document.getElementById('itemUrl').value.trim();
        const type = document.getElementById('itemType').value;
        const icon = document.getElementById('itemIcon').value.trim() || 
                    (type === 'folder' ? 'fas fa-folder' : 'fas fa-link');

        if (!name) return;

        const item = {
            id: Date.now().toString(),
            name: name,
            type: type,
            url: type === 'link' ? url : '',
            icon: icon,
            items: type === 'folder' ? [] : undefined
        };

        const card = this.data.cards.find(c => c.id === this.currentCard);
        if (card) {
            card.items.push(item);
            this.saveData();
            this.renderCards();
        }

        this.hideModal('itemModal');
    }

    renderCards() {
        this.dashboard.innerHTML = '';
        this.data.cards.forEach(card => this.renderCard(card));
    }

    renderCard(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.style.left = card.x + 'px';
        cardElement.style.top = card.y + 'px';
        cardElement.style.width = card.width + 'px';
        cardElement.style.height = card.height + 'px';
        
        cardElement.innerHTML = `
            <div class="card-header">
                <div class="card-title">${this.escapeHtml(card.title)}</div>
                <div class="card-actions">
                    ${this.editMode ? `
                        <button onclick="dashboard.showAddItemModal('${card.id}')" title="افزودن آیتم">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button onclick="dashboard.showDataModal()" title="مدیریت داده">
                            <i class="fas fa-database"></i>
                        </button>
                        <button onclick="dashboard.deleteCard('${card.id}')" title="حذف کارت">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="items-grid" id="items-${card.id}">
                ${this.renderItems(card.items)}
            </div>
        `;

        if (this.editMode) {
            this.makeCardDraggable(cardElement, card);
            this.makeCardResizable(cardElement, card);
        }

        this.dashboard.appendChild(cardElement);
    }

    makeCardDraggable(cardElement, card) {
        const header = cardElement.querySelector('.card-header');
        
        header.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.draggedCard = card;
            this.dragOffset.x = e.clientX - cardElement.offsetLeft;
            this.dragOffset.y = e.clientY - cardElement.offsetTop;

            const mouseMoveHandler = (e) => {
                if (this.draggedCard) {
                    card.x = e.clientX - this.dragOffset.x;
                    card.y = e.clientY - this.dragOffset.y;
                    cardElement.style.left = card.x + 'px';
                    cardElement.style.top = card.y + 'px';
                }
            };

            const mouseUpHandler = () => {
                this.draggedCard = null;
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                this.saveData();
            };

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    makeCardResizable(cardElement, card) {
        // برای سادگی، از قابلیت resize داخلی CSS استفاده می‌کنیم
        // و موقعیت را ذخیره می‌کنیم
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                card.width = entry.contentRect.width;
                card.height = entry.contentRect.height;
                this.saveData();
            }
        });

        observer.observe(cardElement);
    }

    renderItems(items) {
        return items.map(item => `
            <div class="item ${item.type}" 
                 onclick="dashboard.handleItemClick('${item.id}', '${item.type}', '${item.url}')">
                <div class="item-icon">
                    <i class="${item.icon}"></i>
                </div>
                <div class="item-name">${this.escapeHtml(item.name)}</div>
            </div>
        `).join('');
    }

    handleItemClick(itemId, type, url) {
        if (this.editMode) {
            // در حالت ویرایش، آیتم قابل ویرایش شود
            return;
        }

        if (type === 'link' && url) {
            window.open(url, '_blank');
        } else if (type === 'folder') {
            // باز کردن پوشه
            alert(`پوشه "${this.getItemName(itemId)}" باز شد`);
        }
    }

    getItemName(itemId) {
        for (let card of this.data.cards) {
            const item = card.items.find(i => i.id === itemId);
            if (item) return item.name;
        }
        return '';
    }

    deleteCard(cardId) {
        if (confirm('آیا از حذف این کارت مطمئنید؟')) {
            this.data.cards = this.data.cards.filter(card => card.id !== cardId);
            this.saveData();
            this.renderCards();
        }
    }

    showDataModal() {
        this.showDataInModal();
        this.showModal('dataModal');
    }

    showDataInModal() {
        const textarea = document.getElementById('dataTextarea');
        textarea.value = JSON.stringify(this.data, null, 2);
    }

    saveDataFromTextarea() {
        try {
            const newData = JSON.parse(document.getElementById('dataTextarea').value);
            this.data = newData;
            this.saveData();
            this.renderCards();
            this.hideModal('dataModal');
            alert('داده‌ها با موفقیت به‌روزرسانی شدند!');
        } catch (error) {
            alert('خطا در فرمت JSON! لطفاً بررسی کنید.');
        }
    }

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dashboard-data.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const newData = JSON.parse(e.target.result);
                this.data = newData;
                this.saveData();
                this.renderCards();
                alert('داده‌ها با موفقیت وارد شدند!');
            } catch (error) {
                alert('خطا در خواندن فایل! لطفاً فرمت JSON را بررسی کنید.');
            }
        };
        reader.readAsText(file);
    }

    searchItems(query) {
        const cards = this.data.cards;
        
        cards.forEach(card => {
            const cardElement = document.querySelector(`[style*="left: ${card.x}px"][style*="top: ${card.y}px"]`);
            if (cardElement) {
                const items = cardElement.querySelectorAll('.item');
                let hasVisibleItems = false;

                items.forEach(item => {
                    const itemName = item.querySelector('.item-name').textContent;
                    const isVisible = itemName.includes(query);
                    item.style.display = isVisible ? 'flex' : 'none';
                    if (isVisible) hasVisibleItems = true;
                });

                // نمایش/مخفی کردن کارت بر اساس نتیجه جستجو
                cardElement.style.display = hasVisibleItems || !query ? 'block' : 'none';
            }
        });
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

// راه اندازی دشبورد وقتی صفحه لود شد
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});