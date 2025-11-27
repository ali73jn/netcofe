// دیتابیس نمونه
let database = {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    settings: {
        background: "default",
        gridSize: 20
    },
    cards: [
        {
            id: "card_1",
            name: "موتورهای جستجو",
            position: { x: 0, y: 0 },
            size: { width: 300, height: 250 },
            items: [
                {
                    type: "bookmark",
                    id: "bm_1",
                    name: "گوگل",
                    url: "https://google.com",
                    description: "قدرتمندترین موتور جستجوی جهان",
                    favicon: "",
                    createdAt: new Date().toISOString()
                },
                {
                    type: "bookmark",
                    id: "bm_2",
                    name: "بینگ",
                    url: "https://bing.com",
                    description: "موتور جستجوی مایکروسافت",
                    favicon: "",
                    createdAt: new Date().toISOString()
                }
            ]
        },
        {
            id: "card_2",
            name: "شبکه‌های اجتماعی",
            position: { x: 0, y: 0 },
            size: { width: 300, height: 250 },
            items: [
                {
                    type: "folder",
                    id: "folder_1",
                    name: "پوشه نمونه",
                    icon: "📁",
                    items: [
                        {
                            type: "bookmark",
                            id: "bm_3",
                            name: "توییتر",
                            url: "https://twitter.com",
                            description: "شبکه اجتماعی توییتر",
                            favicon: "",
                            createdAt: new Date().toISOString()
                        }
                    ],
                    createdAt: new Date().toISOString()
                }
            ]
        }
    ]
};

// ذخیره در localStorage
function saveDatabase() {
    database.lastUpdated = new Date().toISOString();
    localStorage.setItem('bookmarkManagerDB', JSON.stringify(database));
    return true;
}

// بارگذاری از localStorage
function loadDatabase() {
    const saved = localStorage.getItem('bookmarkManagerDB');
    if (saved) {
        try {
            database = JSON.parse(saved);
            return true;
        } catch (error) {
            console.error('خطا در بارگذاری دیتابیس:', error);
            return false;
        }
    }
    return true;
}

// تولید ID منحصر به فرد
function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// پیدا کردن کارت بر اساس ID
function findCardById(cardId) {
    return database.cards.find(card => card.id === cardId);
}

// پیدا کردن آیتم در کارت
function findItemInCard(cardId, itemId) {
    const card = findCardById(cardId);
    if (!card) return null;

    // جستجو در آیتم‌های مستقیم
    let item = card.items.find(item => item.id === itemId);
    if (item) return { item, card };

    // جستجو در پوشه‌ها
    for (let folder of card.items.filter(item => item.type === 'folder')) {
        const folderItem = folder.items.find(subItem => subItem.id === itemId);
        if (folderItem) return { item: folderItem, card, parentFolder: folder };
    }

    return null;
}

// افزودن کارت جدید
function addCard(name) {
    const newCard = {
        id: generateId('card'),
        name: name,
        position: { x: 0, y: 0 },
        size: { width: 300, height: 250 },
        items: []
    };
    database.cards.push(newCard);
    return saveDatabase();
}

// حذف کارت
function deleteCard(cardId) {
    database.cards = database.cards.filter(card => card.id !== cardId);
    return saveDatabase();
}

// تغییر نام کارت
function renameCard(cardId, newName) {
    const card = findCardById(cardId);
    if (card) {
        card.name = newName;
        return saveDatabase();
    }
    return false;
}

// افزودن بوکمارک به کارت
function addBookmarkToCard(cardId, bookmarkData) {
    const card = findCardById(cardId);
    if (!card) return false;

    const bookmark = {
        type: "bookmark",
        id: generateId('bm'),
        name: bookmarkData.name,
        url: bookmarkData.url,
        description: bookmarkData.description,
        favicon: "",
        createdAt: new Date().toISOString()
    };

    card.items.push(bookmark);
    return saveDatabase();
}

// افزودن پوشه به کارت
function addFolderToCard(cardId, folderName) {
    const card = findCardById(cardId);
    if (!card) return false;

    const folder = {
        type: "folder",
        id: generateId('folder'),
        name: folderName,
        icon: "📁",
        items: [],
        createdAt: new Date().toISOString()
    };

    card.items.push(folder);
    return saveDatabase();
}

// حذف آیتم از کارت
function deleteItemFromCard(cardId, itemId) {
    const card = findCardById(cardId);
    if (!card) return false;

    // حذف از آیتم‌های مستقیم
    const initialLength = card.items.length;
    card.items = card.items.filter(item => item.id !== itemId);

    // اگر آیتم مستقیم نبود، در پوشه‌ها جستجو کن
    if (card.items.length === initialLength) {
        for (let folder of card.items.filter(item => item.type === 'folder')) {
            folder.items = folder.items.filter(subItem => subItem.id !== itemId);
        }
    }

    return saveDatabase();
}

// جستجو در بوکمارک‌ها
function searchBookmarks(query) {
    if (!query.trim()) return [];

    const results = [];
    const lowerQuery = query.toLowerCase();

    database.cards.forEach(card => {
        card.items.forEach(item => {
            // بررسی بوکمارک‌ها
            if (item.type === 'bookmark') {
                if (item.name.toLowerCase().includes(lowerQuery) || 
                    (item.description && item.description.toLowerCase().includes(lowerQuery))) {
                    results.push({
                        ...item,
                        cardName: card.name,
                        cardId: card.id
                    });
                }
            }
            // بررسی پوشه‌ها
            else if (item.type === 'folder') {
                item.items.forEach(subItem => {
                    if (subItem.name.toLowerCase().includes(lowerQuery) || 
                        (subItem.description && subItem.description.toLowerCase().includes(lowerQuery))) {
                        results.push({
                            ...subItem,
                            cardName: card.name,
                            cardId: card.id,
                            folderName: item.name
                        });
                    }
                });
            }
        });
    });

    return results;
}

// دانلود دیتابیس
function downloadDatabase() {
    const dataStr = JSON.stringify(database, null, 2);
    const date = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookmark-database-${date}-${time}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// آپلود دیتابیس
function uploadDatabase(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const newDatabase = JSON.parse(e.target.result);
                
                // اعتبارسنجی ساختار دیتابیس
                if (!newDatabase.cards || !Array.isArray(newDatabase.cards)) {
                    throw new Error('ساختار فایل نامعتبر است');
                }
                
                database = newDatabase;
                database.lastUpdated = new Date().toISOString();
                saveDatabase();
                resolve(true);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
        reader.readAsText(file);
    });
}