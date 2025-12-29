// ==================== تنظیمات اصلی ====================
const CONFIG = {
    // لینک‌های پیش‌فرض
    BOOKMARKS_JSON_URL: "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/data/bookmarks.json",
    DEFAULT_BOOKMARKS_URL: "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/data/bookmarks.json",
	ICONS_JSON_URL: "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/data/icons.json",
    SETTINGS_JSON_URL: "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/data/settings.json",
    // مسیرهای لوکال
    FALLBACK_ICON_PATH: "icons/default_icon.png",
    FOLDER_ICON_PATH: "icons/folder.png",
    DEFAULT_BG_IMAGE_PATH: "icons/default_bg.jpg",
    
    // تنظیمات گرید
    GRID_CELL_SIZE: 20,
    GRID_GAP: 0,
    HORIZONTAL_PIXEL_OFFSET: 0,
    
	
    // کلیدهای localStorage
    STORAGE_KEYS: {
        LAYOUT: 'netcofe_layout',
        BACKGROUND: 'netcofe_background',
        SETTINGS: 'netcofe_settings',
        THEME: 'netcofe_theme',
        USER_BOOKMARKS: 'netcofe_user_bookmarks',
        CUSTOM_URLS: 'netcofe_custom_urls',
        FAVICON_CACHE: 'netcofe_favicon_cache_v3',
        CURRENT_PATHS: 'netcofe_current_paths'
    }
};

// ==================== تبدیل تاریخ میلادی به شمسی ====================
function gregorianToJalali(gy, gm, gd) {
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days = (365 * gy) + (parseInt((gy2 + 3) / 4)) - (parseInt((gy2 + 99) / 100)) + 
               (parseInt((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * (parseInt(days / 12053));
    days %= 12053;
    jy += 4 * (parseInt(days / 1461));
    days %= 1461;
    jy += parseInt((days - 1) / 365);
    if (days > 365) days = (days - 1) % 365;
    var jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
    var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
}


function getPersianDateTime() {
    const now = new Date();
    const jalali = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    // روزهای هفته به فارسی
    const persianDays = [
        'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه',
        'پنجشنبه', 'جمعه', 'شنبه'
    ];
    
    const dayOfWeek = now.getDay(); // 0-6 (یکشنبه=0)
    
    // زمان 24 ساعته
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    
    // تبدیل اعداد به فارسی
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const toPersianDigits = (num) => {
        return num.toString().replace(/\d/g, d => persianDigits[d]);
    };
    
    // تاریخ شمسی به صورت عددی: سال/ماه/روز
    const persianDateNumeric = `${toPersianDigits(jalali[0])}/${toPersianDigits(jalali[1])}/${toPersianDigits(jalali[2])}`;
    
    return {
        date: persianDateNumeric, // فرمت: ۱۴۰۴/۱۰/۸
        day: persianDays[dayOfWeek],
        time24: `${toPersianDigits(hours.toString().padStart(2, '0'))}:${toPersianDigits(minutes.toString().padStart(2, '0'))}:${toPersianDigits(seconds.toString().padStart(2, '0'))}`,
        hours: toPersianDigits(hours.toString().padStart(2, '0')),
        minutes: toPersianDigits(minutes.toString().padStart(2, '0')),
        seconds: toPersianDigits(seconds.toString().padStart(2, '0'))
    };
}



// ==================== وضعیت برنامه ====================
let state = {
    isEditMode: false,
    isDarkMode: false,
    isCompactMode: false,
    currentPaths: {}, // ذخیره مسیر فعلی برای هر دسته‌بندی
    dragInfo: null,
    resizeInfo: null,
    layoutMap: {},
    bookmarks: [],
    userBookmarks: [],
    searchTerm: '',
    currentModal: null,
	customIcons: {}
};

// برای دیباگ - نمایش لاگ‌ها در کنسول
console.log('state.currentPaths:', state.currentPaths);

// ==================== مدیریت ذخیره‌سازی ====================
class StorageManager {
    static get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('خطا در خواندن از localStorage:', error);
            return null;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('خطا در ذخیره در localStorage:', error);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('خطا در حذف از localStorage:', error);
            return false;
        }
    }

    static clearAll() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('خطا در پاک کردن localStorage:', error);
            return false;
        }
    }
}

// ==================== مدیریت بوکمارک‌ها ====================
class BookmarkManager {
    static async loadBookmarks() {
        try {
            // اولویت‌ها: 1. بوکمارک‌های کاربر 2. بوکمارک‌های مرکزی
            const userBookmarks = StorageManager.get(CONFIG.STORAGE_KEYS.USER_BOOKMARKS) || [];
            state.userBookmarks = userBookmarks;
            
            // بارگذاری currentPaths از ذخیره‌سازی
            state.currentPaths = StorageManager.get(CONFIG.STORAGE_KEYS.CURRENT_PATHS) || {};
            
            // بارگذاری بوکمارک‌های مرکزی
            const customUrls = StorageManager.get(CONFIG.STORAGE_KEYS.CUSTOM_URLS) || {};
            const bookmarksUrl = customUrls.bookmarks || CONFIG.BOOKMARKS_JSON_URL;
            
            console.log('در حال بارگذاری بوکمارک‌ها از:', bookmarksUrl);
            
            const response = await fetch(bookmarksUrl);
            if (!response.ok) throw new Error(`خطا در دریافت بوکمارک‌ها: ${response.status}`);
            
            const centralBookmarks = await response.json();
            const centralList = centralBookmarks.bookmarks || centralBookmarks;
            
            console.log('بوکمارک‌های مرکزی دریافت شد:', centralList.length);
			
			try {
                const iconsRes = await fetch(CONFIG.ICONS_JSON_URL);
                state.customIcons = iconsRes.ok ? await iconsRes.json() : {};
            } catch (e) { 
                console.warn('خطا در دریافت فایل آیکون‌ها:', e); 
                state.customIcons = {};
            }
            
            state.bookmarks = this.mergeBookmarks(centralList, userBookmarks);
            
            console.log('بوکمارک‌های نهایی:', state.bookmarks.length);
            
            return state.bookmarks;
        } catch (error) {
            console.error('خطا در بارگذاری بوکمارک‌ها:', error);
            // استفاده از بوکمارک‌های کاربر یا نمونه پیش‌فرض
            state.bookmarks = state.userBookmarks.length > 0 ? state.userBookmarks : await this.getDefaultBookmarks();
            return state.bookmarks;
        }
    }

    static mergeBookmarks(central, user) {
        const merged = [...central];
        const userMap = new Map(user.map(b => [b.id, b]));
        
        // جایگزینی یا افزودن بوکمارک‌های کاربر
        userMap.forEach((userBm, id) => {
            const index = merged.findIndex(cb => cb.id === id);
            if (index > -1) {
                merged[index] = { ...merged[index], ...userBm, source: 'user' };
            } else {
                merged.push({ ...userBm, source: 'user' });
            }
        });
        
        return merged;
    }

    static async getDefaultBookmarks() {
        return [
            {
                id: 'google',
                title: 'گوگل',
                url: 'https://google.com',
                category: 'موتور جستجو',
                description: 'موتور جستجوی گوگل',
                tags: ['جستجو', 'اینترنت']
            },
            {
                id: 'github',
                title: 'GitHub',
                url: 'https://github.com',
                category: 'توسعه',
                description: 'پلتفرم توسعه نرم‌افزار',
                tags: ['کد', 'برنامه‌نویسی']
            }
        ];
    }

    static addUserBookmark(bookmark) {
        const newBookmark = {
            ...bookmark,
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            source: 'user',
            dateAdded: new Date().toISOString()
        };
        
        // اگر parentPath وجود دارد، در پوشه مربوطه اضافه کن
        if (bookmark.parentPath && bookmark.parentPath.length > 0) {
            this.addBookmarkToPath(newBookmark, bookmark.parentPath, bookmark.category);
        } else {
            state.userBookmarks.push(newBookmark);
        }
        
        StorageManager.set(CONFIG.STORAGE_KEYS.USER_BOOKMARKS, state.userBookmarks);
        
        // بازسازی لیست ترکیبی
        state.bookmarks = this.mergeBookmarks(
            state.bookmarks.filter(b => b.source !== 'user'),
            state.userBookmarks
        );
        
        return newBookmark;
    }

    static addBookmarkToPath(bookmark, path, category) {
        let currentItems = state.userBookmarks.filter(b => b.category === category);
        
        if (currentItems.length === 0) {
            // اگر هنوز برای این دسته‌بندی آیتمی نداریم، اضافه کن
            state.userBookmarks.push(bookmark);
            return;
        }
        
        // پیدا کردن آیتم‌های این دسته‌بندی
        let targetItems = currentItems;
        
        // دنبال پوشه مورد نظر در مسیر بگرد
        for (let i = 0; i < path.length; i++) {
            const folderId = path[i];
            const folder = targetItems.find(item => item.id === folderId && item.type === 'folder');
            
            if (!folder) {
                // پوشه پیدا نشد، در ریشه اضافه کن
                state.userBookmarks.push(bookmark);
                return;
            }
            
            // اگر آخرین پوشه در مسیر است
            if (i === path.length - 1) {
                // به پوشه اضافه کن
                if (!folder.children) folder.children = [];
                folder.children.push(bookmark);
                break;
            } else {
                // به پوشه بعدی برو
                if (!folder.children) folder.children = [];
                targetItems = folder.children;
            }
        }
    }

    static updateUserBookmark(id, updates) {
        const index = state.userBookmarks.findIndex(b => b.id === id);
        if (index > -1) {
            state.userBookmarks[index] = { ...state.userBookmarks[index], ...updates };
            StorageManager.set(CONFIG.STORAGE_KEYS.USER_BOOKMARKS, state.userBookmarks);
            
            // به‌روزرسانی در bookmarks اصلی
            const mainIndex = state.bookmarks.findIndex(b => b.id === id);
            if (mainIndex > -1) {
                state.bookmarks[mainIndex] = { ...state.bookmarks[mainIndex], ...updates };
            }
            
            return state.userBookmarks[index];
        }
        return null;
    }

    static deleteUserBookmark(id) {
        state.userBookmarks = state.userBookmarks.filter(b => b.id !== id);
        state.bookmarks = state.bookmarks.filter(b => b.id !== id);
        StorageManager.set(CONFIG.STORAGE_KEYS.USER_BOOKMARKS, state.userBookmarks);
        return true;
    }

    static async refreshCentralBookmarks() {
        try {
            const customUrls = StorageManager.get(CONFIG.STORAGE_KEYS.CUSTOM_URLS) || {};
            const bookmarksUrl = customUrls.bookmarks || CONFIG.BOOKMARKS_JSON_URL;
            
            const response = await fetch(bookmarksUrl + '?t=' + Date.now());
            if (!response.ok) throw new Error('خطا در دریافت بوکمارک‌ها');
            
            const centralBookmarks = await response.json();
            const centralList = centralBookmarks.bookmarks || centralBookmarks;
            
            // فقط بوکمارک‌های مرکزی را جایگزین می‌کنیم، بوکمارک‌های کاربر باقی می‌مانند
            state.bookmarks = this.mergeBookmarks(centralList, state.userBookmarks);
            
            return true;
        } catch (error) {
            console.error('خطا در به‌روزرسانی بوکمارک‌ها:', error);
            return false;
        }
    }
}

// ==================== سیستم Favicon ====================
class FaviconManager {
    static async resolveFavicon(url) {
        if (!url || !url.startsWith('http')) {
            return CONFIG.FALLBACK_ICON_PATH;
        }
        
        try {
            // بررسی کش
            const cache = StorageManager.get(CONFIG.STORAGE_KEYS.FAVICON_CACHE) || {};
            const cached = cache[url];
            
            if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
                return cached.data;
            }
            
            // تلاش برای دریافت favicon جدید
            const faviconUrl = this.getFaviconUrl(url);
            const base64 = await this.fetchIconAsBase64(faviconUrl);
            
            if (base64) {
                // ذخیره در کش
                cache[url] = {
                    data: base64,
                    timestamp: Date.now()
                };
                StorageManager.set(CONFIG.STORAGE_KEYS.FAVICON_CACHE, cache);
                return base64;
            }
            
            return CONFIG.FALLBACK_ICON_PATH;
        } catch (error) {
            console.error('خطا در دریافت favicon:', error);
            return CONFIG.FALLBACK_ICON_PATH;
        }
    }

    static getFaviconUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
        } catch {
            return CONFIG.FALLBACK_ICON_PATH;
        }
    }

    static async fetchIconAsBase64(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            
            const blob = await response.blob();
            return await this.blobToBase64(blob);
        } catch {
            return null;
        }
    }

    static blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    static clearCache() {
        StorageManager.set(CONFIG.STORAGE_KEYS.FAVICON_CACHE, {});
    }
}


// ==================== سیستم آب و هوا ====================

class WeatherManager {
    static userCoordinates = null;
    
    static async getWeather() {
        try {
            // استفاده از مختصات کاربر یا مختصات ذخیره شده
            const coordinates = this.userCoordinates || await this.getUserLocation();
            
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current_weather=true&timezone=auto`
            );
            
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات آب و هوا');
            
            const data = await response.json();
            return this.formatWeatherData(data);
            
        } catch (error) {
            console.error('خطا در دریافت آب و هوا:', error);
            return this.getFallbackWeather();
        }
    }

    static getUserLocation() {
        return new Promise((resolve, reject) => {
            // اول بررسی کن که آیا شهر از قبل انتخاب شده
            const savedCity = StorageManager.get('netcofe_selected_city');
            if (savedCity) {
                const [lat, lon] = savedCity.coordinates.split(',').map(Number);
                this.userCoordinates = { latitude: lat, longitude: lon };
                resolve(this.userCoordinates);
                return;
            }
            
            // اگر نه، از geolocation استفاده کن
            if (!navigator.geolocation) {
                // موقعیت پیش‌فرض (تهران)
                const defaultCoords = { latitude: 35.6892, longitude: 51.3890 };
                this.userCoordinates = defaultCoords;
                resolve(defaultCoords);
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    this.userCoordinates = coords;
                    resolve(coords);
                },
                (error) => {
                    console.warn('خطا در دریافت موقعیت:', error);
                    // موقعیت پیش‌فرض (تهران)
                    const defaultCoords = { latitude: 35.6892, longitude: 51.3890 };
                    this.userCoordinates = defaultCoords;
                    resolve(defaultCoords);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        });
    }


    static formatWeatherData(data) {
        const current = data.current_weather;
        
        // تبدیل کد وضعیت هوا به متن فارسی
        const weatherCodes = {
            0: 'آفتابی',
            1: 'آفتابی',
            2: 'نیمه ابری',
            3: 'ابری',
            45: 'مه',
            48: 'مه',
            51: 'نمنم باران',
            53: 'باران ملایم',
            55: 'باران شدید',
            61: 'باران ملایم',
            63: 'باران',
            65: 'باران شدید',
            71: 'بارش برف ملایم',
            73: 'بارش برف',
            75: 'بارش برف شدید',
            80: 'رگبار باران',
            81: 'رگبار شدید',
            82: 'رگبار سیل‌آسا',
            95: 'رعد و برق',
            96: 'رعد و برق با باران',
            99: 'رعد و برق شدید'
        };

        return {
            temperature: Math.round(current.temperature),
            weatherCode: current.weathercode,
            condition: weatherCodes[current.weathercode] || 'نامشخص',
            windSpeed: Math.round(current.windspeed),
            windDirection: current.winddirection,
            time: new Date(current.time),
            isDay: current.is_day === 1
        };
    }

    static getFallbackWeather() {
        return {
            temperature: 22,
            condition: 'آفتابی',
            windSpeed: 5,
            isDay: true,
            isFallback: true
        };
    }

    static getWeatherIcon(condition) {
        const icons = {
            'آفتابی': '☀️',
            'نیمه ابری': '⛅',
            'ابری': '☁️',
            'مه': '🌫️',
            'باران': '🌧️',
            'باران ملایم': '🌦️',
            'باران شدید': '⛈️',
            'برف': '❄️',
            'رعد و برق': '⚡',
            'نامشخص': '🌈'
        };
        
        return icons[condition] || '🌈';
    }
}

// ==================== مدیریت تم و ظاهر ====================
class ThemeManager {
    static init() {
        const settings = StorageManager.get(CONFIG.STORAGE_KEYS.SETTINGS) || {};
        const savedTheme = StorageManager.get(CONFIG.STORAGE_KEYS.THEME);
        
        // تعیین تم اولیه
        if (savedTheme) {
            state.isDarkMode = savedTheme === 'dark';
        } else if (settings.autoDarkMode && window.matchMedia) {
            state.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        
        this.applyTheme();
        this.setupThemeListeners();
    }

    static applyTheme() {
        document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');
        StorageManager.set(CONFIG.STORAGE_KEYS.THEME, state.isDarkMode ? 'dark' : 'light');
    }

    static setupThemeListeners() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                const settings = StorageManager.get(CONFIG.STORAGE_KEYS.SETTINGS) || {};
                if (settings.autoDarkMode) {
                    state.isDarkMode = e.matches;
                    this.applyTheme();
                }
            });
        }
    }

    static toggleTheme() {
        state.isDarkMode = !state.isDarkMode;
        this.applyTheme();
        return state.isDarkMode;
    }
}

// ==================== مدیریت پس‌زمینه ====================
class BackgroundManager {
    static applySavedBackground() {
        try {
            const bgData = StorageManager.get(CONFIG.STORAGE_KEYS.BACKGROUND);
            const body = document.body;
            
            body.style.backgroundRepeat = 'no-repeat';
            body.style.backgroundPosition = 'center center';
            body.style.backgroundSize = 'cover';
            body.style.backgroundAttachment = 'fixed';
            
            if (bgData) {
                body.style.backgroundImage = `url(${bgData})`;
            } else {
                body.style.backgroundImage = `url(${CONFIG.DEFAULT_BG_IMAGE_PATH})`;
            }
        } catch (error) {
            console.error('خطا در اعمال پس‌زمینه:', error);
        }
    }

    static setBackground(imageData) {
        StorageManager.set(CONFIG.STORAGE_KEYS.BACKGROUND, imageData);
        document.body.style.backgroundImage = `url(${imageData})`;
    }

    static resetBackground() {
        StorageManager.remove(CONFIG.STORAGE_KEYS.BACKGROUND);
        document.body.style.backgroundImage = `url(${CONFIG.DEFAULT_BG_IMAGE_PATH})`;
    }
}

// ==================== Drag & Resize System ====================
class DragResizeManager {
    static startDrag(e, card) {
        if (e.button !== 0 || !state.isEditMode) return;
        e.preventDefault();
        
        state.dragInfo = {
            card: card,
            startX: e.clientX,
            startY: e.clientY,
            startCol: parseInt(card.style.gridColumnStart) || 1,
            startRow: parseInt(card.style.gridRowStart) || 1
        };
        
        card.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
        
        const onDrag = this.onDrag.bind(this);
        const stopDrag = this.stopDrag.bind(this);
        
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
        
        // ذخیره توابع برای حذف listener
        state.dragInfo.onDrag = onDrag;
        state.dragInfo.stopDrag = stopDrag;
    }

    static onDrag(e) {
        if (!state.dragInfo) return;
        
        const dx = e.clientX - state.dragInfo.startX;
        const dy = e.clientY - state.dragInfo.startY;
        
        const dCol = Math.round(dx / (CONFIG.GRID_CELL_SIZE + CONFIG.GRID_GAP));
        const dRow = Math.round(dy / (CONFIG.GRID_CELL_SIZE + CONFIG.GRID_GAP));
        
        const newCol = Math.max(1, state.dragInfo.startCol - dCol);
        const newRow = Math.max(1, state.dragInfo.startRow + dRow);
        
        state.dragInfo.card.style.gridColumnStart = newCol;
        state.dragInfo.card.style.gridRowStart = newRow;
    }

    static stopDrag() {
        if (state.dragInfo) {
            state.dragInfo.card.classList.remove('dragging');
            const category = state.dragInfo.card.dataset.category;
            
            if (state.layoutMap[category]) {
                state.layoutMap[category].col = parseInt(state.dragInfo.card.style.gridColumnStart) || 1;
                state.layoutMap[category].row = parseInt(state.dragInfo.card.style.gridRowStart) || 1;
                StorageManager.set(CONFIG.STORAGE_KEYS.LAYOUT, state.layoutMap);
            }
            
            // حذف event listeners
            if (state.dragInfo.onDrag && state.dragInfo.stopDrag) {
                window.removeEventListener('mousemove', state.dragInfo.onDrag);
                window.removeEventListener('mouseup', state.dragInfo.stopDrag);
            }
        }
        
        state.dragInfo = null;
        document.body.style.cursor = 'default';
    }

    static startResize(e, card) {
        if (e.button !== 0 || !state.isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        
        const colEnd = card.style.gridColumnEnd;
        const rowEnd = card.style.gridRowEnd;
        
        state.resizeInfo = {
            card: card,
            startX: e.clientX,
            startY: e.clientY,
            startW: colEnd ? parseInt(colEnd.split(' ')[1]) : 8,
            startH: rowEnd ? parseInt(rowEnd.split(' ')[1]) : 6
        };
        
        const onResize = this.onResize.bind(this);
        const stopResize = this.stopResize.bind(this);
        
        window.addEventListener('mousemove', onResize);
        window.addEventListener('mouseup', stopResize);
        
        state.resizeInfo.onResize = onResize;
        state.resizeInfo.stopResize = stopResize;
    }

    static onResize(e) {
        if (!state.resizeInfo) return;
        
        const dx = e.clientX - state.resizeInfo.startX;
        const dy = e.clientY - state.resizeInfo.startY;
        
        const dW = Math.round(dx / (CONFIG.GRID_CELL_SIZE + CONFIG.GRID_GAP));
        const dH = Math.round(dy / (CONFIG.GRID_CELL_SIZE + CONFIG.GRID_GAP));
        
        const newW = Math.max(4, state.resizeInfo.startW - dW);
        const newH = Math.max(4, state.resizeInfo.startH + dH);
        
        state.resizeInfo.card.style.gridColumnEnd = `span ${newW}`;
        state.resizeInfo.card.style.gridRowEnd = `span ${newH}`;
        
        const actualWidthInPixels = (newW * CONFIG.GRID_CELL_SIZE) + 
                                   ((newW - 1) * CONFIG.GRID_GAP) + 
                                   CONFIG.HORIZONTAL_PIXEL_OFFSET;
        state.resizeInfo.card.style.width = `${actualWidthInPixels}px`;
    }

    static stopResize() {
        if (state.resizeInfo) {
            const category = state.resizeInfo.card.dataset.category;
            
            if (state.layoutMap[category]) {
                const colEnd = state.resizeInfo.card.style.gridColumnEnd;
                const rowEnd = state.resizeInfo.card.style.gridRowEnd;
                
                state.layoutMap[category].w = colEnd ? parseInt(colEnd.split(' ')[1]) : 8;
                state.layoutMap[category].h = rowEnd ? parseInt(rowEnd.split(' ')[1]) : 6;
                StorageManager.set(CONFIG.STORAGE_KEYS.LAYOUT, state.layoutMap);
            }
            
            if (state.resizeInfo.onResize && state.resizeInfo.stopResize) {
                window.removeEventListener('mousemove', state.resizeInfo.onResize);
                window.removeEventListener('mouseup', state.resizeInfo.stopResize);
            }
        }
        
        state.resizeInfo = null;
    }
}

// ==================== Import/Export System ====================
class ImportExportManager {
    static exportBookmarks() {
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            bookmarks: state.userBookmarks
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        this.downloadFile(dataStr, 'bookmarks_export.json', 'application/json');
    }

    static importBookmarks(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    
                    // اعتبارسنجی ساختار
                    if (!Array.isArray(importedData.bookmarks) && !Array.isArray(importedData)) {
                        throw new Error('فرمت فایل نامعتبر است');
                    }
                    
                    const bookmarksToImport = importedData.bookmarks || importedData;
                    
                    // ایمپورت بوکمارک‌های کاربر
                    state.userBookmarks = bookmarksToImport.map(bm => ({
                        ...bm,
                        source: 'user',
                        dateAdded: bm.dateAdded || new Date().toISOString()
                    }));
                    
                    StorageManager.set(CONFIG.STORAGE_KEYS.USER_BOOKMARKS, state.userBookmarks);
                    
                    // بارگذاری مجدد
                    await BookmarkManager.loadBookmarks();
                    await Renderer.renderDashboard();
                    
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    static exportSettings() {
        const settings = {
            layout: state.layoutMap,
            theme: state.isDarkMode ? 'dark' : 'light',
            background: StorageManager.get(CONFIG.STORAGE_KEYS.BACKGROUND),
            customUrls: StorageManager.get(CONFIG.STORAGE_KEYS.CUSTOM_URLS),
            settings: StorageManager.get(CONFIG.STORAGE_KEYS.SETTINGS),
            currentPaths: state.currentPaths
        };
        
        const dataStr = JSON.stringify(settings, null, 2);
        this.downloadFile(dataStr, 'settings_export.json', 'application/json');
    }

    static importSettings(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedSettings = JSON.parse(event.target.result);
                    
                    // اعمال تنظیمات
                    if (importedSettings.layout) {
                        state.layoutMap = importedSettings.layout;
                        StorageManager.set(CONFIG.STORAGE_KEYS.LAYOUT, state.layoutMap);
                    }
                    
                    if (importedSettings.theme) {
                        state.isDarkMode = importedSettings.theme === 'dark';
                        ThemeManager.applyTheme();
                    }
                    
                    if (importedSettings.background) {
                        BackgroundManager.setBackground(importedSettings.background);
                    }
                    
                    if (importedSettings.customUrls) {
                        StorageManager.set(CONFIG.STORAGE_KEYS.CUSTOM_URLS, importedSettings.customUrls);
                    }
                    
                    if (importedSettings.settings) {
                        StorageManager.set(CONFIG.STORAGE_KEYS.SETTINGS, importedSettings.settings);
                        state.isCompactMode = importedSettings.settings.compactView || false;
                    }
                    
                    if (importedSettings.currentPaths) {
                        state.currentPaths = importedSettings.currentPaths;
                        StorageManager.set(CONFIG.STORAGE_KEYS.CURRENT_PATHS, state.currentPaths);
                    }
                    
                    // رندر مجدد
                    await Renderer.renderDashboard();
                    
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    static downloadFile(data, filename, type) {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// ==================== رندرینگ و DOM ====================
class Renderer {
static async renderDashboard() {
    const container = document.getElementById('grid-container');
    if (!container) return;
    
    container.innerHTML = '';
    document.body.classList.toggle('editing-mode', state.isEditMode);
    document.body.classList.toggle('compact-mode', state.isCompactMode);
    
    console.log('رندر کردن داشبورد با', state.bookmarks.length, 'بوکمارک');
    
    // اگر بوکمارکی نداریم، پیام نشان می‌دهیم
    if (state.bookmarks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>📚 بوکمارکی یافت نشد</h3>
                <p>برای شروع، دکمه ویرایش را فشار داده و بوکمارک جدید اضافه کنید.</p>
                <button id="add-first-bookmark" class="btn-success">افزودن اولین بوکمارک</button>
            </div>
        `;
        
        const addBtn = document.getElementById('add-first-bookmark');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('edit-mode-btn').click(); // وارد حالت ویرایش شو
            });
        }
        
        return;
    }
    
    // ساختاردهی بوکمارک‌ها بر اساس دسته‌بندی
    const categorizedBookmarks = this.categorizeBookmarks(state.bookmarks);
    console.log('دسته‌بندی‌ها:', Object.keys(categorizedBookmarks));
    
    // فقط یک کارت ترکیبی در سمت راست
    this.createDateTimeCard(container); // این حالا کارت ترکیبی است
    
    // ایجاد کارت برای هر دسته‌بندی
    Object.entries(categorizedBookmarks).forEach(([category, items], index) => {
        const layout = state.layoutMap[category] || { 
            col: (index % 3) * 8 + 1, 
            row: Math.floor(index / 3) * 6 + 2, // ردیف 2 به بعد
            w: 8, 
            h: 6,
            view: "list"
        };
        
        state.layoutMap[category] = layout;
        this.createCard(category, items, layout, container);
    });
    
    // ذخیره layout جدید
    StorageManager.set(CONFIG.STORAGE_KEYS.LAYOUT, state.layoutMap);
    
    // اعمال فیلتر جستجو
    if (state.searchTerm) {
        this.applySearchFilter(state.searchTerm);
    }
}


static createDateTimeCard(container) {
    const category = 'زمان و آب و هوا';
    const totalGridColumns = 12;
    const defaultWidth = 4;
    const defaultHeight = 3;
    
    const layout = state.layoutMap[category] || { 
        col: totalGridColumns - defaultWidth + 1,
        row: 1,
        w: defaultWidth, 
        h: defaultHeight,
        view: "list"
    };
    
    state.layoutMap[category] = layout;
    
    const card = document.createElement('div');
    card.className = 'bookmark-card datetime-weather-card';
    card.dataset.category = category;
    
    // تنظیم موقعیت و ابعاد
    card.style.gridColumnStart = layout.col;
    card.style.gridRowStart = layout.row;
    
    const actualWidthInPixels =
        (layout.w * CONFIG.GRID_CELL_SIZE) +
        ((layout.w - 1) * CONFIG.GRID_GAP) +
        CONFIG.HORIZONTAL_PIXEL_OFFSET;
    
    card.style.width = `${actualWidthInPixels}px`;
    card.style.gridColumnEnd = `span ${layout.w}`;
    card.style.gridRowEnd = `span ${layout.h}`;
    
    // HTML کارت ترکیبی جدید
// در تابع createDateTimeCard، بخش انتخاب شهر رو اینطور تغییر بده:
// در تابع createDateTimeCard، این قسمت رو تغییر میدم:
card.innerHTML = `
    <div class="card-header">
        <div class="card-title">${category}</div>
        <button class="card-btn btn-drag visible-on-edit">::</button>
    </div>
    <div class="card-content datetime-weather-content">
        <!-- ساختار: آب و هوا سمت چپ، ساعت سمت راست -->
        <div class="combined-layout">
            <!-- ستون چپ: آب و هوا (حالا با اسم weather-column) -->
            <div class="weather-column">
                <div class="weather-section">
                    <div class="weather-row">
                        <div class="weather-label">دما:</div>
                        <div class="weather-value">
                            <span class="weather-unit">°C</span>
							<span id="weather-temp">--</span>
                            
                        </div>
                    </div>
                    
                    <div class="weather-row">
                        <div class="weather-label">وضعیت:</div>
                        <div class="weather-value">
                            <span id="weather-icon">🌤️</span>
                            <span id="weather-desc">---</span>
                        </div>
                    </div>
                    
                    <div class="weather-row">
                        <div class="weather-label">باد:</div>
                        <div class="weather-value" id="weather-wind">-- ک.م/ساعت</div>
                    </div>
                    
                    <div class="weather-row">
                        <div class="weather-label">شهر:</div>
                        <div class="weather-value">
                            <span id="weather-location">تهران</span>
                            <button class="city-change-btn visible-on-edit" id="city-change-btn" title="تغییر شهر">🔄</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ستون راست: ساعت و تاریخ (حالا با اسم time-column) -->
            <div class="time-column">
                <div class="time-section">
                    <div class="digital-time" id="digital-time">۰۰:۰۰</div>
                    <div class="digital-date" id="digital-date">یکشنبه ۱ فروردین</div>
                </div>
            </div>
        </div>
        
        <!-- انتخاب شهر -->
        <div class="city-selector hidden" id="city-selector">
            <div class="city-input-container">
                <input type="text" 
                       id="city-search-input" 
                       class="city-search-input" 
                       placeholder="نام شهر را وارد کنید (مثال: تهران، مشهد، اصفهان...)"
                       autocomplete="off">
                <div class="city-suggestions" id="city-suggestions"></div>
            </div>
            <div class="city-selector-buttons">
                <button id="confirm-city-btn">تأیید</button>
                <button id="cancel-city-btn">انصراف</button>
            </div>
        </div>
    </div>
    <div class="resize-handle visible-on-edit"></div>
`;
    
    // افزودن رویدادهای درگ و ریسایز
    const dragBtn = card.querySelector('.btn-drag');
    const resizeEl = card.querySelector('.resize-handle');
    
    if (dragBtn) {
        dragBtn.addEventListener('mousedown', (e) => DragResizeManager.startDrag(e, card));
    }
    
    if (resizeEl) {
        resizeEl.addEventListener('mousedown', (e) => DragResizeManager.startResize(e, card));
    }
    
    container.appendChild(card);
	this.createCitySelectorModal();
    
    // بارگذاری استایل‌های ترکیبی
    this.loadCombinedStyles();
    
    // اجرای اسکریپت‌ها
    setTimeout(() => {
        this.initDigitalClock();
        this.initCombinedWeather();
        this.setupCitySelection();
    }, 100);
}
static createCitySelectorModal() {
    // اگر از قبل وجود داره، حذفش کن
    const existingModal = document.getElementById('global-city-selector');
    if (existingModal) {
        existingModal.remove();
    }
    
    // ایجاد modal جدید
    const modal = document.createElement('div');
    modal.id = 'global-city-selector';
    modal.className = 'city-selector-modal hidden';
    modal.innerHTML = `
        <div class="city-selector-overlay"></div>
        <div class="city-selector-content">
            <div class="city-selector-header">
                <h3>انتخاب شهر</h3>
                <button class="close-city-selector" id="close-global-city-selector">×</button>
            </div>
            <div class="city-input-container">
                <input type="text" 
                       id="global-city-search-input" 
                       class="city-search-input" 
                       placeholder="نام شهر را وارد کنید (مثال: تهران، مشهد، اصفهان...)"
                       autocomplete="off">
                <div class="city-suggestions" id="global-city-suggestions"></div>
            </div>
            <div class="city-selector-buttons">
                <button id="global-confirm-city-btn">تأیید</button>
                <button id="global-cancel-city-btn">انصراف</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}



static setupCitySelection() {
    const cityChangeBtn = document.getElementById('city-change-btn');
    const globalModal = document.getElementById('global-city-selector');
    const citySearchInput = document.getElementById('global-city-search-input');
    const citySuggestions = document.getElementById('global-city-suggestions');
    const confirmBtn = document.getElementById('global-confirm-city-btn');
    const cancelBtn = document.getElementById('global-cancel-city-btn');
    const closeBtn = document.getElementById('close-global-city-selector');
    
    if (!cityChangeBtn || !globalModal) {
        console.error('عناصر شهر پیدا نشدند!');
        return;
    }
    
    let selectedCity = null;
    
    // بارگذاری شهر انتخاب شده از localStorage
    const savedCity = StorageManager.get('netcofe_selected_city');
    if (savedCity) {
        selectedCity = savedCity;
        document.getElementById('weather-location').textContent = savedCity.name;
    }
    
    // دکمه تغییر شهر
    cityChangeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        globalModal.classList.remove('hidden');
        if (citySearchInput) {
            citySearchInput.focus();
            citySearchInput.value = selectedCity ? selectedCity.name : '';
        }
    });
    
    // بستن modal
    const closeModal = () => {
        globalModal.classList.add('hidden');
        if (citySearchInput) citySearchInput.value = '';
        if (citySuggestions) {
            citySuggestions.innerHTML = '';
            citySuggestions.style.display = 'none';
        }
        selectedCity = null;
    };
    
    // دکمه بستن
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // دکمه انصراف
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // کلیک روی overlay
    const overlay = globalModal.querySelector('.city-selector-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }
    
    // جستجوی شهر
    let searchTimeout;
    if (citySearchInput) {
        citySearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                citySuggestions.innerHTML = '';
                citySuggestions.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                await this.searchCities(query, citySuggestions);
            }, 500);
        });
    }
    
    // انتخاب از لیست پیشنهادات
    if (citySuggestions) {
        citySuggestions.addEventListener('click', (e) => {
            const suggestion = e.target.closest('.city-suggestion');
            if (suggestion && suggestion.dataset.city) {
                try {
                    const cityData = JSON.parse(suggestion.dataset.city);
                    
                    selectedCity = {
                        name: cityData.display_name.split(',')[0],
                        coordinates: `${cityData.lat},${cityData.lon}`,
                        fullName: cityData.display_name
                    };
                    
                    if (citySearchInput) {
                        citySearchInput.value = selectedCity.name;
                    }
                    
                    citySuggestions.innerHTML = '';
                    citySuggestions.style.display = 'none';
                } catch (error) {
                    console.error('خطا در پردازش شهر:', error);
                }
            }
        });
    }
    
    // تأیید انتخاب شهر
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const cityName = citySearchInput ? citySearchInput.value.trim() : '';
            
            if (!cityName) {
                alert('لطفاً نام شهر را وارد کنید');
                return;
            }
            
            try {
                let cityToSave = selectedCity;
                
                // اگر از لیست انتخاب نشده، جستجو کن
                if (!cityToSave) {
                    const cities = await this.searchCitiesAPI(cityName);
                    if (cities && cities.length > 0) {
                        cityToSave = {
                            name: cities[0].name,
                            coordinates: `${cities[0].lat},${cities[0].lon}`,
                            fullName: cities[0].display_name
                        };
                    } else {
                        alert('شهر "' + cityName + '" پیدا نشد.');
                        return;
                    }
                }
                
                // ذخیره شهر
                StorageManager.set('netcofe_selected_city', cityToSave);
                
                // به‌روزرسانی مختصات
                const [lat, lon] = cityToSave.coordinates.split(',').map(Number);
                WeatherManager.userCoordinates = { latitude: lat, longitude: lon };
                
                // به‌روزرسانی نمایش
                document.getElementById('weather-location').textContent = cityToSave.name;
                
                // بستن modal
                closeModal();
                
                // دریافت اطلاعات آب و هوای جدید
                await this.refreshWeather();
                
            } catch (error) {
                console.error('خطا در ذخیره شهر:', error);
                alert('خطا در ذخیره شهر: ' + error.message);
            }
        });
    }
}



static async searchCities(query, suggestionsContainer) {
    try {
        const cities = await this.searchCitiesAPI(query);
        
        suggestionsContainer.innerHTML = '';
        
        if (cities.length === 0) {
            suggestionsContainer.innerHTML = '<div class="city-suggestion">شهری یافت نشد</div>';
            suggestionsContainer.style.display = 'block';
            return;
        }
        
        cities.forEach(city => {
            const div = document.createElement('div');
            div.className = 'city-suggestion';
            // فقط ۲ قسمت اول نشون بدیم تا خوانا باشه
            const displayParts = city.display_name.split(',').slice(0, 2).join(', ');
            div.textContent = displayParts;
            div.dataset.city = JSON.stringify({
                display_name: city.display_name,
                lat: city.lat,
                lon: city.lon
            });
            
            // وقتی روی پیشنهاد کلیک شد، مستقیماً اعمال کن
            div.addEventListener('click', async () => {
                const selectedCity = {
                    name: city.display_name.split(',')[0],
                    coordinates: `${city.lat},${city.lon}`,
                    fullName: city.display_name
                };
                
                // ذخیره در localStorage
                StorageManager.set('netcofe_selected_city', selectedCity);
                
                // به‌روزرسانی مختصات
                const [lat, lon] = selectedCity.coordinates.split(',').map(Number);
                WeatherManager.userCoordinates = { latitude: lat, longitude: lon };
                
                // به‌روزرسانی نمایش
                document.getElementById('weather-location').textContent = selectedCity.name;
                
                // بستن modal
                document.getElementById('city-selector').classList.add('hidden');
                document.getElementById('city-search-input').value = '';
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                
                // دریافت اطلاعات آب و هوای جدید
                await this.refreshWeather();
            });
            
            suggestionsContainer.appendChild(div);
        });
        
        suggestionsContainer.style.display = 'block';
        
    } catch (error) {
        console.error('خطا در جستجوی شهرها:', error);
        suggestionsContainer.innerHTML = '<div class="city-suggestion">خطا در جستجو</div>';
        suggestionsContainer.style.display = 'block';
    }
}


static async searchCitiesAPI(query) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ir&limit=5&accept-language=fa`
        );
        
        if (!response.ok) throw new Error('خطا در جستجوی شهر');
        
        const cities = await response.json();
        return cities.map(city => ({
            name: city.display_name.split(',')[0],
            lat: city.lat,
            lon: city.lon,
            display_name: city.display_name
        }));
        
    } catch (error) {
        console.error('خطا در جستجوی شهر:', error);
        return [];
    }
}


static async initCombinedWeather() {
    try {
        // بارگذاری شهر انتخاب شده
        const savedCity = StorageManager.get('netcofe_selected_city');
        if (savedCity) {
            document.getElementById('weather-location').textContent = savedCity.name;
        }
        
        // دریافت اطلاعات آب و هوا
        const weatherData = await WeatherManager.getWeather();
        
        // به‌روزرسانی اطلاعات آب و هوا
        document.getElementById('weather-temp').textContent = weatherData.temperature;
        document.getElementById('weather-icon').textContent = WeatherManager.getWeatherIcon(weatherData.condition);
        document.getElementById('weather-desc').textContent = weatherData.condition;
        document.getElementById('weather-wind').textContent = `${weatherData.windSpeed} ک.م/ساعت`;
        
        // به‌روزرسانی هر 10 دقیقه
        setTimeout(() => this.initCombinedWeather(), 10 * 60 * 1000);
        
    } catch (error) {
        console.error('خطا در دریافت آب و هوا:', error);
        
        // نمایش داده‌های پیش‌فرض
        const fallback = WeatherManager.getFallbackWeather();
        document.getElementById('weather-temp').textContent = fallback.temperature;
        document.getElementById('weather-icon').textContent = WeatherManager.getWeatherIcon(fallback.condition);
        document.getElementById('weather-desc').textContent = fallback.condition;
        document.getElementById('weather-wind').textContent = `${fallback.windSpeed} ک.م/ساعت`;
        document.getElementById('weather-location').textContent = 'تهران';
    }
}


static async getCityName() {
    try {
        // استفاده از OpenStreetMap Nominatim API (رایگان)
        const position = await WeatherManager.getUserLocation();
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.latitude}&lon=${position.longitude}&accept-language=fa`
        );
        
        if (!response.ok) {
            throw new Error('خطا در دریافت نام شهر');
        }
        
        const data = await response.json();
        
        // استخراج نام شهر از پاسخ
        return data.address.city || 
               data.address.town || 
               data.address.village || 
               data.address.county || 
               'موقعیت شما';
        
    } catch (error) {
        console.warn('خطا در دریافت نام شهر:', error);
        throw error;
    }
}


static loadCombinedStyles() {
    if (document.getElementById('combined-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'combined-styles';
    style.textContent = `
        /* استایل‌های کارت ترکیبی - ساعت چپ، آب و هوا راست */
        .datetime-weather-content {
            height: 100%;
            padding: 15px;
            box-sizing: border-box;
        }
        
        /* ساختار دو ستونه - جهت اصلی LTR */
        .combined-layout {
            display: flex;
            height: 100%;
			gap: 35px;
        justify-content: space-between; /* این معجزه می‌کنه */
            direction: ltr;
        }
        
        /* ستون ساعت (چپ) */
        .left-column {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: flex-start; /* محتوای ساعت چپ‌چین */
            justify-content: flex-start;
            direction: ltr; /* جهت متن برای ساعت LTR */
        }
        
        /* ستون آب و هوا (راست) */
        .right-column {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: flex-end; /* محتوای آب و هوا راست‌چین */
            justify-content: flex-start;
            direction: rtl; /* جهت متن برای آب و هوا RTL */
        }
        
        /* بخش ساعت */
        .time-section {
            display: flex;
            flex-direction: column;
            align-items: flex-end; /* ساعت چپ‌چین */
            text-align: left;
            width: 100%;
        }
        
        .digital-time {
            font-size: 2.8rem;
            font-weight: 700;
            color: #3b82f6;
            line-height: 1;
            margin-bottom: 5px;
            letter-spacing: 1px;
            direction: ltr;
            text-align: left;
            font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif; /* فونت فارسی برای اعداد فارسی */
            unicode-bidi: plaintext;
        }
        
        .digital-date {
            font-size: 1.3rem;
            font-weight: 500;
            color: #6b7280;
            font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif;
            direction: rtl;
            text-align: right;
            width: 100%;
        }
        
        /* بخش آب و هوا */
        .weather-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
            text-align: right;
        }
        
        .weather-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #f1f1f1;
            direction: rtl;
        }
        
        .weather-row:last-child {
            border-bottom: none;
        }
        
        .weather-label {
            font-size: 0.9rem;
            color: #6b7280;
            font-weight: 500;
            min-width: 60px;
            text-align: right;
        }
        
        .weather-value {
            font-size: 1rem;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 5px;
            text-align: right;
        }
        
        .weather-unit {
            font-size: 0.9rem;
            color: #374151;
        }
        
        .city-change-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 0.8rem;
            color: #6b7280;
            padding: 2px 6px;
            border-radius: 3px;
            transition: all 0.2s;
        }
        
        .city-change-btn:hover {
            background-color: #f3f4f6;
            color: #3b82f6;
        }
        
        /* حالت تاریک */
        [data-theme="dark"] .digital-time {
            color: #60a5fa;
        }
        
        [data-theme="dark"] .weather-row {
            border-bottom-color: #4b5563;
        }
        
        [data-theme="dark"] .weather-label {
            color: #d1d5db;
        }
        
        [data-theme="dark"] .weather-value {
            color: #f3f4f6;
        }
        
        /* انتخاب شهر (بدون تغییر) */
        .city-selector {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-width: 300px;
            direction: rtl;
        }
        
        .city-input-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .city-search-input {
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #d1d5db;
            font-family: 'Vazirmatn', sans-serif;
            font-size: 1rem;
            width: 100%;
            box-sizing: border-box;
            direction: rtl;
        }
        
        .city-suggestions {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #e5e7eb;
            border-radius: 5px;
            display: none;
            direction: rtl;
        }
        
        .city-suggestion {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #f3f4f6;
            font-family: 'Vazirmatn', sans-serif;
            text-align: right;
        }
        
        .city-suggestion:hover {
            background-color: #f3f4f6;
        }
        
        .city-selector-buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-start; /* دکمه‌ها سمت راست */
        }
        
        .city-selector button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: 'Vazirmatn', sans-serif;
        }
        
        #confirm-city-btn {
            background-color: #3b82f6;
            color: white;
        }
        
        #cancel-city-btn {
            background-color: #ef4444;
            color: white;
        }
        
        .hidden {
            display: none !important;
        }
		
    `;
    document.head.appendChild(style);
}


static setupCitySelection() {
    const cityChangeBtn = document.getElementById('city-change-btn');
    const citySelector = document.getElementById('city-selector');
    const citySearchInput = document.getElementById('city-search-input');
    const citySuggestions = document.getElementById('city-suggestions');
    const confirmBtn = document.getElementById('confirm-city-btn');
    const cancelBtn = document.getElementById('cancel-city-btn');
    
    if (!cityChangeBtn || !citySelector) {
        console.error('عناصر شهر پیدا نشدند!');
        return;
    }
    
    console.log('تنظیم انتخاب شهر...');
    
    let selectedCity = null;
    
    // بارگذاری شهر انتخاب شده از localStorage
    const savedCity = StorageManager.get('netcofe_selected_city');
    if (savedCity) {
        selectedCity = savedCity;
        console.log('شهر ذخیره شده:', savedCity);
        document.getElementById('weather-location').textContent = savedCity.name;
    }
    
    // دکمه تغییر شهر
    cityChangeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('کلیک روی تغییر شهر');
        citySelector.classList.remove('hidden');
        if (citySearchInput) {
            citySearchInput.focus();
            citySearchInput.value = selectedCity ? selectedCity.name : '';
        }
    });
    
    // جستجوی شهر در حین تایپ
    let searchTimeout;
    if (citySearchInput) {
        citySearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                citySuggestions.innerHTML = '';
                citySuggestions.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                console.log('جستجوی شهر:', query);
                await this.searchCities(query, citySuggestions);
            }, 500);
        });
    }
    
    // انتخاب از لیست پیشنهادات
    if (citySuggestions) {
        citySuggestions.addEventListener('click', (e) => {
            const suggestion = e.target.closest('.city-suggestion');
            if (suggestion && suggestion.dataset.city) {
                try {
                    const cityData = JSON.parse(suggestion.dataset.city);
                    console.log('شهر انتخاب شده:', cityData);
                    
                    selectedCity = {
                        name: cityData.display_name.split(',')[0],
                        coordinates: `${cityData.lat},${cityData.lon}`,
                        fullName: cityData.display_name
                    };
                    
                    if (citySearchInput) {
                        citySearchInput.value = selectedCity.name;
                    }
                    
                    citySuggestions.innerHTML = '';
                    citySuggestions.style.display = 'none';
                } catch (error) {
                    console.error('خطا در پردازش شهر:', error);
                }
            }
        });
    }
    
    // تأیید انتخاب شهر - **این قسمت رو کامل تغییر دادم**
// تأیید انتخاب شهر - ساده‌شده
if (confirmBtn) {
    confirmBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('کلیک روی تأیید شهر');
        
        const cityName = citySearchInput ? citySearchInput.value.trim() : '';
        
        if (!cityName) {
            alert('لطفاً نام شهر را وارد کنید');
            return;
        }
        
        try {
            const cities = await this.searchCitiesAPI(cityName);
            if (cities && cities.length > 0) {
                const city = cities[0];
                const selectedCity = {
                    name: city.name,
                    coordinates: `${city.lat},${city.lon}`,
                    fullName: city.display_name
                };
                
                // ذخیره در localStorage
                StorageManager.set('netcofe_selected_city', selectedCity);
                console.log('شهر ذخیره شد:', selectedCity);
                
                // به‌روزرسانی مختصات
                const [lat, lon] = selectedCity.coordinates.split(',').map(Number);
                WeatherManager.userCoordinates = { latitude: lat, longitude: lon };
                
                // به‌روزرسانی نمایش
                document.getElementById('weather-location').textContent = selectedCity.name;
                citySelector.classList.add('hidden');
                citySearchInput.value = '';
                
                // دریافت اطلاعات آب و هوای جدید
                await this.refreshWeather();
                
            } else {
                alert('شهر "' + cityName + '" پیدا نشد. لطفاً نام کامل‌تری وارد کنید.');
            }
        } catch (error) {
            console.error('خطا در جستجوی شهر:', error);
            alert('خطا در جستجوی شهر: ' + error.message);
        }
    });
}

    
    // انصراف
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            citySelector.classList.add('hidden');
            citySearchInput.value = '';
            selectedCity = null;
            if (citySuggestions) {
                citySuggestions.innerHTML = '';
                citySuggestions.style.display = 'none';
            }
        });
    }
    
    // بستن modal با کلیک خارج
    document.addEventListener('click', (e) => {
        if (!citySelector.classList.contains('hidden') && 
            !citySelector.contains(e.target) && 
            e.target !== cityChangeBtn) {
            citySelector.classList.add('hidden');
        }
    });
}

// تابع ساده شده برای جستجوی شهر
static async searchCitiesAPI(query) {
    console.log('در حال جستجوی API برای:', query);
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}+Iran&limit=5&accept-language=fa`
        );
        
        console.log('پاسخ API:', response.status);
        
        if (!response.ok) {
            throw new Error(`خطای HTTP: ${response.status}`);
        }
        
        const cities = await response.json();
        console.log('شهرهای پیدا شده:', cities.length);
        
        return cities.map(city => ({
            name: city.display_name.split(',')[0],
            lat: city.lat,
            lon: city.lon,
            display_name: city.display_name
        }));
        
    } catch (error) {
        console.error('خطا در جستجوی شهر:', error);
        return [];
    }
}



static async refreshWeather() {
    try {
        const weatherData = await WeatherManager.getWeather();
        
        // به‌روزرسانی اطلاعات آب و هوا
        document.getElementById('weather-temp').textContent = weatherData.temperature;
        document.getElementById('weather-icon').textContent = WeatherManager.getWeatherIcon(weatherData.condition);
        document.getElementById('weather-desc').textContent = weatherData.condition;
        document.getElementById('weather-wind').textContent = `${weatherData.windSpeed} ک.م/ساعت`;
        
    } catch (error) {
        console.error('خطا در دریافت آب و هوا:', error);
        
        // نمایش داده‌های پیش‌فرض
        const fallback = WeatherManager.getFallbackWeather();
        document.getElementById('weather-temp').textContent = fallback.temperature;
        document.getElementById('weather-icon').textContent = WeatherManager.getWeatherIcon(fallback.condition);
        document.getElementById('weather-desc').textContent = fallback.condition;
        document.getElementById('weather-wind').textContent = `${fallback.windSpeed} ک.م/ساعت`;
    }
}



static loadDigitalClockStyles() {
    // اگر قبلاً اضافه شده، دوباره اضافه نکن
    if (document.getElementById('digital-clock-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'digital-clock-styles';
    style.textContent = `
        /* استایل‌های ساعت دیجیتال - راست‌چین و بالا */
        .digital-clock-container {
            display: flex;
            flex-direction: column;
            align-items: flex-end; /* راست‌چین */
            justify-content: flex-start; /* از بالا شروع کن */
            height: 100%;
            padding: 15px 20px 0 0; /* بالا ۱۵، راست ۲۰، بقیه ۰ */
            text-align: right;
            direction: rtl;
            box-sizing: border-box;
        }
        
        .digital-time {
            font-size: 3.5rem;
            font-weight: 700;
            font-family: 'Vazirmatn', 'Segoe UI', Tahoma, Geneva, sans-serif;
            color: #3b82f6;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            margin-bottom: 5px;
            letter-spacing: 2px;
            line-height: 1;
        }
        
        .digital-date {
            font-size: 1.5rem;
            font-weight: 500;
            font-family: 'Vazirmatn', 'Segoe UI', Tahoma, Geneva, sans-serif;
            color: #6b7280;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
            line-height: 1.2;
        }
        
        /* حالت تاریک */
        [data-theme="dark"] .digital-time {
            color: #60a5fa;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        [data-theme="dark"] .digital-date {
            color: #d1d5db;
        }
        
        /* ریسپانسیو */
        @media screen and (max-width: 768px) {
            .digital-time {
                font-size: 2.5rem;
            }
            
            .digital-date {
                font-size: 1.2rem;
            }
            
            .digital-clock-container {
                padding: 10px 15px 0 0;
            }
        }
        
        @media screen and (max-width: 480px) {
            .digital-time {
                font-size: 2rem;
            }
            
            .digital-date {
                font-size: 1rem;
            }
        }
        
        /* برای کارت ساعت */
        .datetime-card .card-content {
            padding: 0 !important;
            height: calc(100% - 40px); /* ارتفاع کارت منهای هدر */
            display: flex;
            align-items: flex-start; /* محتوا از بالا شروع بشه */
            justify-content: flex-start; /* محتوا از چپ شروع بشه */
        }
    `;
    document.head.appendChild(style);
}


static initDigitalClock() {
    // نام‌های ماه‌های شمسی
    const persianMonths = [
        'فروردین', 'اردیبهشت', 'خرداد', 
        'تیر', 'مرداد', 'شهریور', 
        'مهر', 'آبان', 'آذر', 
        'دی', 'بهمن', 'اسفند'
    ];
    
    // نام‌های روزهای هفته به فارسی
    const persianDays = [
        'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه',
        'پنجشنبه', 'جمعه', 'شنبه'
    ];
    
    // تابع تبدیل اعداد به فارسی
    const toPersianDigits = (num) => {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, d => persianDigits[d]);
    };
    
    // تابع به‌روزرسانی زمان و تاریخ
    const updateDigitalClock = () => {
        const now = new Date();
        const jalali = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
        
        // زمان - با اعداد فارسی
        let hours = now.getHours();
        let minutes = now.getMinutes();
        
        // فرمت زمان: ۲۳:۲۵ (با اعداد فارسی)
        const timeStr = `${toPersianDigits(hours.toString().padStart(2, '0'))}:${toPersianDigits(minutes.toString().padStart(2, '0'))}`;
        
        // تاریخ: دوشنبه ۱۲ آذر
        const dayOfWeek = now.getDay(); // 0-6 (یکشنبه=0)
        const dayName = persianDays[dayOfWeek];
        const monthName = persianMonths[jalali[1] - 1];
        const dateStr = `${dayName} ${toPersianDigits(jalali[2])} ${monthName}`;
        
        // به‌روزرسانی DOM
        const timeElement = document.getElementById('digital-time');
        const dateElement = document.getElementById('digital-date');
        
        if (timeElement) timeElement.textContent = timeStr;
        if (dateElement) dateElement.textContent = dateStr;
    };
    
    // به‌روزرسانی اولیه
    updateDigitalClock();
    
    // به‌روزرسانی هر دقیقه
    setInterval(updateDigitalClock, 60000);
    
    // به‌روزرسانی زمانی که دقیقه تغییر می‌کند
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    
    setTimeout(() => {
        updateDigitalClock();
        setInterval(updateDigitalClock, 60000);
    }, msUntilNextMinute);
}



static loadWeatherStyles() {
    if (document.getElementById('weather-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'weather-styles';
    style.textContent = `
        /* استایل‌های آب و هوا - چپ‌چین و بالا */
        .weather-container {
            display: flex;
            flex-direction: column;
            align-items: flex-start; /* چپ‌چین */
            justify-content: flex-start; /* از بالا شروع کن */
            height: 100%;
            padding: 15px 0 0 20px; /* بالا ۱۵، چپ ۲۰، بقیه ۰ */
            text-align: left;
            direction: rtl;
            box-sizing: border-box;
        }
        
        .weather-loading {
            font-size: 1rem;
            color: #6b7280;
            padding: 10px;
        }
        
        .weather-data {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
        }
        
        .weather-temperature {
            font-size: 3rem;
            font-weight: 700;
            color: #3b82f6;
            display: flex;
            align-items: flex-start;
            line-height: 1;
            margin-bottom: 5px;
        }
        
        .weather-unit {
            font-size: 1.5rem;
            margin-top: 0.5rem;
            margin-right: 2px;
        }
        
        .weather-condition {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 15px;
        }
        
        .weather-condition #weather-icon {
            font-size: 1.8rem;
        }
        
        .weather-condition #weather-desc {
            font-size: 1.2rem;
            font-weight: 500;
            color: #6b7280;
        }
        
        .weather-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 0.9rem;
            color: #9ca3af;
        }
        
        .weather-wind, .weather-location {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .hidden {
            display: none !important;
        }
        
        /* حالت تاریک */
        [data-theme="dark"] .weather-temperature {
            color: #60a5fa;
        }
        
        [data-theme="dark"] .weather-condition #weather-desc {
            color: #d1d5db;
        }
        
        [data-theme="dark"] .weather-details {
            color: #9ca3af;
        }
        
        /* ریسپانسیو */
        @media screen and (max-width: 768px) {
            .weather-temperature {
                font-size: 2.5rem;
            }
            
            .weather-condition #weather-icon {
                font-size: 1.5rem;
            }
            
            .weather-condition #weather-desc {
                font-size: 1rem;
            }
            
            .weather-container {
                padding: 10px 0 0 15px;
            }
        }
        
        @media screen and (max-width: 480px) {
            .weather-temperature {
                font-size: 2rem;
            }
            
            .weather-condition #weather-icon {
                font-size: 1.2rem;
            }
            
            .weather-condition #weather-desc {
                font-size: 0.9rem;
            }
        }
    `;
    document.head.appendChild(style);
}

static async initWeather() {
    try {
        const weatherData = await WeatherManager.getWeather();
        
        const loadingEl = document.getElementById('weather-loading');
        const dataEl = document.getElementById('weather-data');
        
        if (loadingEl) loadingEl.classList.add('hidden');
        if (dataEl) {
            document.getElementById('weather-temp').textContent = weatherData.temperature;
            document.getElementById('weather-icon').textContent = WeatherManager.getWeatherIcon(weatherData.condition);
            document.getElementById('weather-desc').textContent = weatherData.condition;
            document.getElementById('weather-wind').textContent = `${weatherData.windSpeed} کیلومتر/ساعت`;
            
            if (weatherData.isFallback) {
                document.getElementById('weather-location').textContent = 'تهران (نمونه)';
            } else {
                document.getElementById('weather-location').textContent = 'موقعیت شما';
            }
            
            dataEl.classList.remove('hidden');
        }
        
        // به‌روزرسانی هر 10 دقیقه
        setTimeout(() => this.initWeather(), 10 * 60 * 1000);
        
    } catch (error) {
        console.error('خطا در دریافت آب و هوا:', error);
        
        // نمایش داده‌های پیش‌فرض
        const loadingEl = document.getElementById('weather-loading');
        const dataEl = document.getElementById('weather-data');
        
        if (loadingEl) loadingEl.classList.add('hidden');
        if (dataEl) {
            const fallback = WeatherManager.getFallbackWeather();
            document.getElementById('weather-temp').textContent = fallback.temperature;
            document.getElementById('weather-icon').textContent = WeatherManager.getWeatherIcon(fallback.condition);
            document.getElementById('weather-desc').textContent = fallback.condition;
            document.getElementById('weather-wind').textContent = `${fallback.windSpeed} کیلومتر/ساعت`;
            document.getElementById('weather-location').textContent = 'تهران (پیش‌فرض)';
            
            dataEl.classList.remove('hidden');
        }
    }
}

	
// در کلاس Renderer این تابع رو عوض کن:
static categorizeBookmarks(bookmarks) {
    console.log('🔍 شروع دسته‌بندی بوکمارک‌ها:', bookmarks);
    
    const categories = {};
    
    // اگر bookmarks آرایه نیست، تبدیلش کن
    if (!Array.isArray(bookmarks)) {
        console.warn('⚠️ bookmarks آرایه نیست، تلاش برای تبدیل...');
        if (bookmarks.bookmarks && Array.isArray(bookmarks.bookmarks)) {
            bookmarks = bookmarks.bookmarks;
        } else if (typeof bookmarks === 'object') {
            bookmarks = Object.values(bookmarks);
        } else {
            console.error('❌ فرمت bookmarks نامعتبر است');
            return { 'سایر': [] };
        }
    }
    
    console.log(`📊 تعداد بوکمارک‌ها برای دسته‌بندی: ${bookmarks.length}`);
    
    // هر پوشه ریشه به عنوان یک دسته‌بندی
    bookmarks.forEach(folder => {
        if (!folder || !folder.title) return;
        
        // فقط پوشه‌ها رو به عنوان دسته‌بندی در نظر بگیر
        if (folder.type === 'folder' || folder.children) {
            const categoryName = folder.title;
            console.log(`➕ ایجاد دسته‌بندی: "${categoryName}"`);
            
            // فقط children پوشه رو ذخیره کن، نه خود پوشه رو
            categories[categoryName] = folder.children || [];
            
            // ذخیره اطلاعات پوشه اصلی برای استفاده در Breadcrumb
            if (folder.children) {
                folder.children.forEach(child => {
                    child._parentCategory = categoryName;
                    child._parentId = folder.id;
                });
            }
        } else {
            // اگر پوشه نیست، به دسته‌بندی "سایر" اضافه کن
            const category = folder.category || 'سایر';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(folder);
        }
    });
    
    console.log('✅ دسته‌بندی‌های ایجاد شده:', Object.keys(categories));
    
    // اگر هیچ دسته‌بندی ایجاد نشد
    if (Object.keys(categories).length === 0) {
        console.warn('⚠️ هیچ دسته‌بندی ایجاد نشد، ایجاد دسته‌بندی پیش‌فرض');
        categories['سایر'] = [];
    }
    
    return categories;
}

    static createCard(category, items, layout, container) {
        const card = document.createElement('div');
        card.className = 'bookmark-card';
        card.dataset.category = category;
        
        // تنظیم موقعیت و ابعاد
        card.style.gridColumnStart = layout.col;
        card.style.gridRowStart = layout.row;
        
        const actualWidthInPixels =
            (layout.w * CONFIG.GRID_CELL_SIZE) +
            ((layout.w - 1) * CONFIG.GRID_GAP) +
            CONFIG.HORIZONTAL_PIXEL_OFFSET;
        
        card.style.width = `${actualWidthInPixels}px`;
        card.style.gridColumnEnd = `span ${layout.w}`;
        card.style.gridRowEnd = `span ${layout.h}`;
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${category}</div>
                <button class="card-btn btn-drag visible-on-edit">::</button>
            </div>
            <div class="card-breadcrumbs">
                <span class="crumb">خانه</span>
            </div>
            <div class="card-content">
                <div class="bookmark-tiles"></div>
            </div>
            <div class="resize-handle visible-on-edit"></div>
        `;
        
        // افزودن رویدادها
        const dragBtn = card.querySelector('.btn-drag');
        const titleEl = card.querySelector('.card-title');
        const resizeEl = card.querySelector('.resize-handle');
        
        // ویرایش نام دسته‌بندی
        if (titleEl) {
            titleEl.addEventListener('click', () => {
                if (state.isEditMode) {
                    const newName = prompt("نام جدید دسته‌بندی:", category);
                    if (newName && newName !== category) {
                        // به‌روزرسانی layoutMap با نام جدید
                        delete state.layoutMap[category];
                        state.layoutMap[newName] = layout;
                        
                        // به‌روزرسانی بوکمارک‌ها
                        state.bookmarks.forEach(bm => {
                            if (bm.category === category) {
                                bm.category = newName;
                            }
                        });
                        
                        this.renderDashboard();
                    }
                }
            });
        }
        
        if (dragBtn) {
            dragBtn.addEventListener('mousedown', (e) => DragResizeManager.startDrag(e, card));
        }
        
        if (resizeEl) {
            resizeEl.addEventListener('mousedown', (e) => DragResizeManager.startResize(e, card));
        }
        
        // رندر محتوا
        this.renderCardContent(card, items, layout.view || "list");
        container.appendChild(card);
    }


static async renderCardContent(cardEl, items, viewMode) {
    const tilesContainer = cardEl.querySelector('.bookmark-tiles');
    const breadcrumbs = cardEl.querySelector('.card-breadcrumbs');
    
    if (!tilesContainer) return;
    
    tilesContainer.innerHTML = '';
    tilesContainer.classList.toggle("view-grid", viewMode === "grid");
    tilesContainer.classList.toggle("view-list", viewMode === "list");
    
    const category = cardEl.dataset.category;
    const currentPath = state.currentPaths[category] || [];
    
    console.log('🎨 رندر کارت:', {
        category: category,
        path: currentPath,
        totalItems: items.length
    });
    
    // رندر Breadcrumb (نام دسته‌بندی به عنوان خانه)
    this.renderBreadcrumbs(breadcrumbs, category, currentPath, items);
    
    // دکمه‌های کنترل
    if (state.isEditMode && breadcrumbs) {
        this.addControlButtons(breadcrumbs, category, currentPath);
    }
    
    // دریافت آیتم‌های سطح فعلی
    try {
        const currentLevelItems = this.getCurrentLevelItems(category, items, currentPath);
        console.log(`📝 ${currentLevelItems?.length || 0} آیتم برای نمایش`);
        
        if (!currentLevelItems || currentLevelItems.length === 0) {
            tilesContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <p>📂 این پوشه خالی است</p>
                    ${state.isEditMode ? '<button class="btn-success" onclick="Renderer.openAddModal(\'' + category + '\', ' + JSON.stringify(currentPath) + ')">افزودن آیتم جدید</button>' : ''}
                </div>
            `;
            return;
        }
        
        // رندر آیتم‌ها
        for (const item of currentLevelItems) {
            const tile = await this.createTile(item, viewMode, category, currentPath);
            if (tile) {
                tilesContainer.appendChild(tile);
            }
        }
    } catch (error) {
        console.error('❌ خطا در رندر کارت:', error);
        tilesContainer.innerHTML = `
            <div class="error-message">
                <p>خطا در بارگذاری محتوا</p>
                <button onclick="location.reload()">بارگذاری مجدد</button>
            </div>
        `;
    }
}

static getCurrentLevelItems(category, items, currentPath) {
    console.log('🔍 دریافت آیتم‌های سطح:', {
        category: category,
        currentPath: currentPath,
        itemsCount: items.length
    });
    
    // items در اینجا children پوشه اصلی هستند
    // اگر در ریشه هستیم، همه children های پوشه اصلی رو برگردون
    if (!currentPath || currentPath.length === 0) {
        console.log('📁 حالت ریشه - نمایش کودکان پوشه اصلی');
        return items;
    }
    
    console.log('📂 حالت داخل پوشه - مسیر:', currentPath);
    
    // حرکت در مسیر پوشه‌های تو در تو
    let currentLevel = items;
    
    for (let i = 0; i < currentPath.length; i++) {
        const folderId = currentPath[i];
        console.log(`   ↪️ سطح ${i + 1}: جستجوی پوشه ${folderId}`);
        
        const nextFolder = currentLevel.find(item => 
            item.id === folderId && (item.type === 'folder' || item.children)
        );
        
        if (!nextFolder) {
            console.error(`❌ پوشه ${folderId} پیدا نشد`);
            return [];
        }
        
        // اگر آخرین سطح مسیر هستیم
        if (i === currentPath.length - 1) {
            console.log('✅ آخرین سطح مسیر رسیدیم');
            return nextFolder.children || [];
        }
        
        // به سطح بعد برو
        currentLevel = nextFolder.children || [];
    }
    
    return currentLevel;
}


// ==================== تابع renderBreadcrumbs اصلاح شده ====================
static renderBreadcrumbs(breadcrumbsEl, category, currentPath, allItems) {
    console.log('🔄 شروع Breadcrumb...');
    
    if (!breadcrumbsEl) {
        console.warn('Breadcrumbs element پیدا نشد');
        return;
    }
    
    // پاک کردن
    breadcrumbsEl.innerHTML = '';
    
    // ذخیره context برای استفاده در event handlerها
    const context = {
        category: category,
        navigate: this.navigateToPath.bind(this)
    };
    
    // 1. خانه
    const homeBtn = this.createBreadcrumbButton('خانه', [], context);
    breadcrumbsEl.appendChild(homeBtn);
    
    // 2. مسیرها
    if (currentPath && currentPath.length > 0) {
        console.log('🗺️ ساختن مسیر Breadcrumb:', currentPath);
        
        let accumulatedPath = [];
        let currentItems = allItems;
        
        for (let i = 0; i < currentPath.length; i++) {
            const folderId = currentPath[i];
            
            // جداکننده
            const separator = document.createElement('span');
            separator.textContent = '›';
            separator.style.margin = '0 8px';
            separator.style.color = '#ff0000';
            breadcrumbsEl.appendChild(separator);
            
            // پیدا کردن نام پوشه
            let folderName = `پوشه ${i + 1}`;
            if (currentItems && Array.isArray(currentItems)) {
                const folder = currentItems.find(item => item && item.id === folderId);
                if (folder && folder.title) {
                    folderName = folder.title;
                }
            }
            
            // دکمه پوشه
            accumulatedPath = currentPath.slice(0, i + 1);
            const folderBtn = this.createBreadcrumbButton(folderName, accumulatedPath, context);
            breadcrumbsEl.appendChild(folderBtn);
            
            // بروزرسانی currentItems برای سطح بعدی
            if (currentItems && Array.isArray(currentItems)) {
                const folder = currentItems.find(item => item && item.id === folderId);
                if (folder && folder.children) {
                    currentItems = folder.children;
                }
            }
        }
    }
    
    console.log('✅ Breadcrumb ساخته شد');
}

// تابع کمکی برای ایجاد دکمه‌های Breadcrumb
static createBreadcrumbButton(text, path, context) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'crumb';
    
    // استایل پایه
    Object.assign(button.style, {
        background: 'none',
        border: 'none',
        color: '#3b82f6',
        cursor: 'pointer',
        padding: '2px 8px',
        margin: '0 2px',
        fontSize: '14px',
        fontFamily: '"Vazirmatn", Tahoma, sans-serif',
		fontWeight: '400',
        textDecoration: 'underline'
    });
    
    // Event handler
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`📍 کلیک Breadcrumb: "${text}" ->`, path);
        
        if (context.navigate) {
            context.navigate(context.category, path);
        } else {
            console.error('تابع navigate وجود ندارد');
        }
    });
    
    return button;
}

// ==================== تابع ساده برای پیدا کردن نام پوشه ====================
static findFolderName(allItems, category, folderId, pathSoFar) {
    try {
        // ابتدا آیتم‌های این دسته رو پیدا کن
        let items = allItems.filter(item => item.category === category);
        
        // در مسیر حرکت کن
        for (const id of pathSoFar) {
            const folder = items.find(item => item.id === id);
            if (folder && folder.children) {
                items = folder.children;
            }
        }
        
        // پوشه مورد نظر رو پیدا کن
        const folder = items.find(item => item.id === folderId);
        return folder ? folder.title : 'پوشه';
    } catch (error) {
        console.error('خطا در پیدا کردن نام پوشه:', error);
        return 'پوشه';
    }
}


// ==================== تابع navigateToPath با لاگ بیشتر ====================
static navigateToPath(category, newPath) {
    console.log('========== ناوبری ==========');
    console.log('دسته‌بندی:', category);
    console.log('مسیر جدید:', newPath);
    console.log('مسیر قبلی:', state.currentPaths[category]);
    
    state.currentPaths[category] = newPath;
    StorageManager.set(CONFIG.STORAGE_KEYS.CURRENT_PATHS, state.currentPaths);
    
    console.log('ذخیره شد:', StorageManager.get(CONFIG.STORAGE_KEYS.CURRENT_PATHS));
    
    // رندر مجدد
    this.renderDashboard();
}

// در تابع createTile - حذف دکمه ویرایش از tileها
static async createTile(item, viewMode, category, currentPath) {
    try {
        const isFolder = item.type === 'folder' || item.children;
        const tile = document.createElement(isFolder ? "div" : "a");
        tile.className = "tile";
        tile.dataset.id = item.id;
        tile.dataset.category = category;
        
        if (isFolder) {
            tile.classList.add("tile-folder");
            
            tile.addEventListener("click", (e) => {
                e.preventDefault();
                if (!state.isEditMode) {
                    const newPath = [...(currentPath || []), item.id];
                    console.log('ورود به پوشه:', item.title, 'مسیر:', newPath);
                    this.navigateToPath(category, newPath);
                }
            });
        } else if (item.url) {
            tile.href = item.url;
            tile.target = "_blank";
            tile.rel = "noopener noreferrer";
        }
        
        tile.classList.toggle("tile-grid-mode", viewMode === "grid");
        
        // آیکون
        const img = document.createElement("img");
        img.className = "tile-icon";
        
        if (isFolder) {
            img.src = CONFIG.FOLDER_ICON_PATH;
        } else if (item.url) {
            const customIcon = state.customIcons[item.url];
            if (customIcon) {
                img.src = customIcon;
            } else {
                img.src = CONFIG.FALLBACK_ICON_PATH;
                setTimeout(async () => {
                    try {
                        const icon = await FaviconManager.resolveFavicon(item.url);
                        if (img && !customIcon) img.src = icon;
                    } catch (error) { console.error(error); }
                }, 0);
            }
        } else {
            img.src = CONFIG.FALLBACK_ICON_PATH;
        }
        
        // نام
        const nameDiv = document.createElement("div");
        nameDiv.className = "tile-name";
        nameDiv.textContent = item.title;
        nameDiv.title = item.description || item.title;
        
        // ⚠️ حذف کامل بخش دکمه ویرایش از tile
        // const editBtn = document.createElement("div");
        // editBtn.className = "tile-edit-btn";
        // editBtn.textContent = "✏️";
        // editBtn.title = "ویرایش";
        // ... کدهای event listener حذف شد
        
        tile.appendChild(img);
        tile.appendChild(nameDiv);
        
        // ⚠️ حذف اضافه کردن دکمه ویرایش به tile
        // if (state.isEditMode) {
        //     tile.appendChild(editBtn);
        // }
        
        return tile;
    } catch (error) {
        console.error('خطا در ایجاد tile:', error, item);
        return null;
    }
}

// در تابع addControlButtons - فقط حذف دکمه‌های خاص
static addControlButtons(breadcrumbs, category, currentPath) {
    if (!breadcrumbs) return;
    
    console.log('اضافه کردن دکمه‌های کنترل برای:', category);
    
    // پاک کردن دکمه‌های قبلی
    breadcrumbs.querySelectorAll('.card-control-btn').forEach(btn => btn.remove());
    
    // فقط اگر در حالت ویرایش هستیم دکمه‌ها رو اضافه کن
    if (!state.isEditMode) return;
    
    // ⚠️ حذف دکمه حذف دسته‌بندی
    // ❌ کدهای مربوط به delBtn حذف شد
    
    // ⚠️ حذف دکمه افزودن آیتم
    // ➕ کدهای مربوط به addBtn حذف شد
    
    // 3. دکمه تغییر حالت نمایش - باقی می‌ماند
    const viewBtn = document.createElement('button');
    viewBtn.className = "card-control-btn btn-view-crumb";
    viewBtn.innerHTML = "👁️";
    viewBtn.title = "تغییر حالت نمایش";
    
    viewBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('کلیک روی تغییر حالت نمایش');
        
        const layout = state.layoutMap[category];
        if (layout) {
            layout.view = layout.view === "grid" ? "list" : "grid";
            StorageManager.set(CONFIG.STORAGE_KEYS.LAYOUT, state.layoutMap);
            this.renderDashboard();
        }
    });
    
    breadcrumbs.appendChild(viewBtn);
    
    // 4. دکمه برگشت (اگر در پوشه‌ای هستیم) - باقی می‌ماند
    if (currentPath && currentPath.length > 0) {
        const backBtn = document.createElement('button');
        backBtn.className = "card-control-btn btn-back-crumb";
        backBtn.innerHTML = "↩️";
        backBtn.title = "برگشت به سطح قبل";
        
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('کلیک روی برگشت');
            
            const newPath = currentPath.slice(0, -1);
            this.navigateToPath(category, newPath);
        });
        
        breadcrumbs.appendChild(backBtn);
    }
    
    console.log('تعداد دکمه‌های اضافه شده:', breadcrumbs.querySelectorAll('.card-control-btn').length);
}

// در کلاس EventManager - حذف event listenerهای مربوط به modal
static setup() {
    console.log('تنظیم رویدادها...');
    
    // دکمه حالت ویرایش - باقی می‌ماند
    const editModeBtn = document.getElementById('edit-mode-btn');
    if (editModeBtn) {
        editModeBtn.addEventListener('click', () => {
            state.isEditMode = !state.isEditMode;
            const subControls = document.getElementById('sub-controls');
            
            editModeBtn.textContent = state.isEditMode ? '✅' : '✏️';
            editModeBtn.title = state.isEditMode ? 'خروج از حالت ویرایش' : 'حالت ویرایش';
            
            if (subControls) {
                if (state.isEditMode) {
                    subControls.classList.remove('hidden-controls');
                    subControls.classList.add('visible-controls');
                } else {
                    subControls.classList.remove('visible-controls');
                    subControls.classList.add('hidden-controls');
                }
            }
            
            Renderer.renderDashboard();
        });
    }
    
    // ⚠️ حذف event listenerهای مربوط به modal مدیریت بوکمارک
    // const cancelBtn = document.getElementById('cancel-btn');
    // const bookmarkForm = document.getElementById('bookmark-form');
    // const deleteBtn = document.getElementById('delete-btn');
    // const bookmarkType = document.getElementById('bookmark-type');
    
    // بقیه event listenerها باقی می‌مانند...
    // ... کدهای مربوط به جستجو، تغییر تم، پس‌زمینه و غیره
}

// همچنین حذف توابع مربوط به modal از کلاس Renderer:
/*
static openAddModal() { ... } // حذف
static openEditModal() { ... } // حذف
static updateModalFields() { ... } // حذف
*/

    static applySearchFilter(searchTerm) {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            const title = tile.querySelector('.tile-name')?.textContent.toLowerCase() || '';
            const category = tile.dataset.category?.toLowerCase() || '';
            const tags = tile.dataset.tags?.toLowerCase() || '';
            
            const matches = title.includes(searchTerm) || 
                           category.includes(searchTerm) || 
                           tags.includes(searchTerm);
            
            tile.classList.toggle('filtered-out', !matches);
            tile.classList.toggle('highlighted', matches && searchTerm.length > 0);
        });
    }
}

// ==================== Event Handlers ====================
class EventManager {
    static setup() {
        console.log('تنظیم رویدادها...');
        
        // دکمه حالت ویرایش
        const editModeBtn = document.getElementById('edit-mode-btn');
        if (editModeBtn) {
            editModeBtn.addEventListener('click', () => {
                state.isEditMode = !state.isEditMode;
                const subControls = document.getElementById('sub-controls');
                
                editModeBtn.textContent = state.isEditMode ? '✅' : '✏️';
                editModeBtn.title = state.isEditMode ? 'خروج از حالت ویرایش' : 'حالت ویرایش';
                
                if (subControls) {
                    if (state.isEditMode) {
                        subControls.classList.remove('hidden-controls');
                        subControls.classList.add('visible-controls');
                    } else {
                        subControls.classList.remove('visible-controls');
                        subControls.classList.add('hidden-controls');
                    }
                }
                
                Renderer.renderDashboard();
            });
        }
        
        // دکمه به‌روزرسانی بوکمارک‌ها
        const refreshBtn = document.getElementById('refresh-bookmarks-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                if (!confirm('آیا از به‌روزرسانی بوکمارک‌ها از منبع مرکزی اطمینان دارید؟')) return;
                
                try {
                    const success = await BookmarkManager.refreshCentralBookmarks();
                    if (success) {
                        alert('بوکمارک‌ها با موفقیت به‌روزرسانی شدند.');
                        await Renderer.renderDashboard();
                    } else {
                        alert('خطا در به‌روزرسانی بوکمارک‌ها.');
                    }
                } catch (error) {
                    alert('خطا در به‌روزرسانی: ' + error.message);
                }
            });
        }
        
        // دکمه تغییر تم
        const themeBtn = document.getElementById('toggle-theme-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                ThemeManager.toggleTheme();
            });
        }
        
        // دکمه جستجو
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const searchContainer = document.getElementById('search-container');
                searchContainer?.classList.toggle('hidden');
                
                if (searchContainer && !searchContainer.classList.contains('hidden')) {
                    const searchInput = document.getElementById('bookmark-search');
                    if (searchInput) searchInput.focus();
                }
            });
        }
        
        // دکمه بستن جستجو
        const closeSearchBtn = document.getElementById('close-search');
        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => {
                const searchContainer = document.getElementById('search-container');
                searchContainer?.classList.add('hidden');
                state.searchTerm = '';
                
                const searchInput = document.getElementById('bookmark-search');
                if (searchInput) searchInput.value = '';
                
                Renderer.applySearchFilter('');
            });
        }
        
        // ورودی جستجو
        const searchInput = document.getElementById('bookmark-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                state.searchTerm = e.target.value.toLowerCase().trim();
                Renderer.applySearchFilter(state.searchTerm);
            });
        }
        
        // دکمه پس‌زمینه
        const bgBtn = document.getElementById('set-background-btn');
        if (bgBtn) {
            bgBtn.addEventListener('click', () => {
                const bgInput = document.getElementById('background-file-input');
                if (bgInput) bgInput.click();
            });
        }
        
        // Import/Export بوکمارک‌ها
        const exportBookmarksBtn = document.getElementById('export-bookmarks-btn');
        if (exportBookmarksBtn) {
            exportBookmarksBtn.addEventListener('click', () => {
                ImportExportManager.exportBookmarks();
            });
        }
        
        const importBookmarksBtn = document.getElementById('import-bookmarks-btn');
        if (importBookmarksBtn) {
            importBookmarksBtn.addEventListener('click', () => {
                const importInput = document.getElementById('import-bookmarks-file');
                if (importInput) importInput.click();
            });
        }
        
        // Import/Export تنظیمات
        const exportSettingsBtn = document.getElementById('export-settings-btn');
        if (exportSettingsBtn) {
            exportSettingsBtn.addEventListener('click', () => {
                ImportExportManager.exportSettings();
            });
        }
        
        const importSettingsBtn = document.getElementById('import-settings-btn');
        if (importSettingsBtn) {
            importSettingsBtn.addEventListener('click', () => {
                const importInput = document.getElementById('import-settings-file');
                if (importInput) importInput.click();
            });
        }
        
        // مدیریت فایل‌های import
        const importBookmarksFile = document.getElementById('import-bookmarks-file');
        if (importBookmarksFile) {
            importBookmarksFile.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                if (confirm('آیا از وارد کردن بوکمارک‌ها اطمینان دارید؟')) {
                    try {
                        await ImportExportManager.importBookmarks(file);
                        alert('بوکمارک‌ها با موفقیت وارد شدند.');
                    } catch (error) {
                        alert('خطا در وارد کردن بوکمارک‌ها: ' + error.message);
                    }
                }
                
                e.target.value = '';
            });
        }
        
        const importSettingsFile = document.getElementById('import-settings-file');
        if (importSettingsFile) {
            importSettingsFile.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                if (confirm('آیا از وارد کردن تنظیمات اطمینان دارید؟')) {
                    try {
                        await ImportExportManager.importSettings(file);
                        alert('تنظیمات با موفقیت وارد شدند.');
                    } catch (error) {
                        alert('خطا در وارد کردن تنظیمات: ' + error.message);
                    }
                }
                
                e.target.value = '';
            });
        }
        
        const backgroundFileInput = document.getElementById('background-file-input');
        if (backgroundFileInput) {
            backgroundFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    BackgroundManager.setBackground(event.target.result);
                };
                reader.readAsDataURL(file);
                e.target.value = '';
            });
        }
        
        // مدیریت Modal
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                const modal = document.getElementById('bookmark-modal');
                if (modal) modal.classList.add('hidden');
            });
        }
        
        const bookmarkForm = document.getElementById('bookmark-form');
        if (bookmarkForm) {
            bookmarkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    title: document.getElementById('bookmark-name')?.value || '',
                    type: document.getElementById('bookmark-type')?.value || 'bookmark',
                    url: document.getElementById('bookmark-url')?.value || '',
                    category: document.getElementById('bookmark-category')?.value || 'سایر',
                    tags: document.getElementById('bookmark-tags')?.value?.split(',').map(t => t.trim()).filter(t => t) || [],
                    description: document.getElementById('bookmark-description')?.value || ''
                };
                
                const modal = document.getElementById('bookmark-modal');
                const category = modal?.dataset.category;
                const currentPath = modal?.dataset.currentPath ? JSON.parse(modal.dataset.currentPath) : [];
                const itemId = document.getElementById('editing-item-id')?.value;
                
                // اضافه کردن parentPath اگر در پوشه‌ای هستیم
                if (currentPath && currentPath.length > 0) {
                    formData.parentPath = currentPath;
                }
                
                try {
                    if (itemId) {
                        // ویرایش بوکمارک موجود
                        BookmarkManager.updateUserBookmark(itemId, formData);
                    } else {
                        // افزودن بوکمارک جدید
                        BookmarkManager.addUserBookmark(formData);
                    }
                    
                    if (modal) modal.classList.add('hidden');
                    
                    await Renderer.renderDashboard();
                } catch (error) {
                    alert('خطا در ذخیره بوکمارک: ' + error.message);
                }
            });
        }
        
        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const itemId = document.getElementById('editing-item-id')?.value;
                
                if (confirm('آیا از حذف این آیتم اطمینان دارید؟')) {
                    try {
                        BookmarkManager.deleteUserBookmark(itemId);
                        const modal = document.getElementById('bookmark-modal');
                        if (modal) modal.classList.add('hidden');
                        await Renderer.renderDashboard();
                    } catch (error) {
                        alert('خطا در حذف بوکمارک: ' + error.message);
                    }
                }
            });
        }
        
        const bookmarkType = document.getElementById('bookmark-type');
        if (bookmarkType) {
            bookmarkType.addEventListener('change', () => {
                Renderer.updateModalFields();
            });
        }
        
        // تنظیمات پیشرفته
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                const modal = document.getElementById('settings-modal');
                if (modal) modal.classList.remove('hidden');
                this.loadSettingsForm();
            });
        }
        
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                const modal = document.getElementById('settings-modal');
                if (modal) modal.classList.add('hidden');
            });
        }
        
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', async () => {
                await this.saveSettings();
                const modal = document.getElementById('settings-modal');
                if (modal) modal.classList.add('hidden');
            });
        }
        
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', async () => {
                if (confirm('آیا از پاک کردن کش اطمینان دارید؟')) {
                    FaviconManager.clearCache();
                    alert('کش با موفقیت پاک شد.');
                }
            });
        }
        
        const resetAllBtn = document.getElementById('reset-all-btn');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', async () => {
                if (confirm('آیا از بازنشانی همه تنظیمات اطمینان دارید؟ این عمل قابل بازگشت نیست.')) {
                    StorageManager.clearAll();
                    location.reload();
                }
            });
        }
    }
    
    static loadSettingsForm() {
        const settings = StorageManager.get(CONFIG.STORAGE_KEYS.SETTINGS) || {};
        const customUrls = StorageManager.get(CONFIG.STORAGE_KEYS.CUSTOM_URLS) || {};
        
        const autoDarkMode = document.getElementById('auto-dark-mode');
        const compactView = document.getElementById('compact-view');
        const bookmarksJsonUrl = document.getElementById('bookmarks-json-url');
        
        if (autoDarkMode) autoDarkMode.checked = settings.autoDarkMode || false;
        if (compactView) compactView.checked = settings.compactView || false;
        if (bookmarksJsonUrl) bookmarksJsonUrl.value = customUrls.bookmarks || CONFIG.BOOKMARKS_JSON_URL;
    }
    
    static async saveSettings() {
        const autoDarkMode = document.getElementById('auto-dark-mode');
        const compactView = document.getElementById('compact-view');
        const bookmarksJsonUrl = document.getElementById('bookmarks-json-url');
        
        const settings = {
            autoDarkMode: autoDarkMode?.checked || false,
            compactView: compactView?.checked || false
        };
        
        const customUrls = {
            bookmarks: bookmarksJsonUrl?.value || CONFIG.BOOKMARKS_JSON_URL
        };
        
        StorageManager.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);
        StorageManager.set(CONFIG.STORAGE_KEYS.CUSTOM_URLS, customUrls);
        
        state.isCompactMode = settings.compactView;
        await Renderer.renderDashboard();
        
        alert('تنظیمات با موفقیت ذخیره شدند.');
    }
}

// ==================== Initialize Application ====================
class App {
    static async init() {
        try {
            console.log('راه‌اندازی برنامه...');
            
            ThemeManager.init();
            BackgroundManager.applySavedBackground();
            
            state.layoutMap = StorageManager.get(CONFIG.STORAGE_KEYS.LAYOUT) || {};
            state.currentPaths = StorageManager.get(CONFIG.STORAGE_KEYS.CURRENT_PATHS) || {};
            
            await BookmarkManager.loadBookmarks();
            EventManager.setup();

            // --- بخش اعمال تنظیمات خودکار از سرور ---
            const settingsApplied = StorageManager.get('netcofe_settings_applied');
            if (!settingsApplied) {
                try {
                    const response = await fetch(CONFIG.SETTINGS_JSON_URL);
                    if (response.ok) {
                        const importedSettings = await response.json();
                        
                        // دقیقاً کارهایی که importSettings انجام می‌دهد را اینجا تکرار می‌کنیم
                        if (importedSettings.layout) {
                            state.layoutMap = importedSettings.layout;
                            StorageManager.set(CONFIG.STORAGE_KEYS.LAYOUT, state.layoutMap);
                        }
                        if (importedSettings.theme) {
                            state.isDarkMode = importedSettings.theme === 'dark';
                            ThemeManager.applyTheme();
                        }
                        if (importedSettings.background) {
                            BackgroundManager.setBackground(importedSettings.background);
                        }
                        if (importedSettings.customUrls) {
                            StorageManager.set(CONFIG.STORAGE_KEYS.CUSTOM_URLS, importedSettings.customUrls);
                        }
                        if (importedSettings.settings) {
                            StorageManager.set(CONFIG.STORAGE_KEYS.SETTINGS, importedSettings.settings);
                            state.isCompactMode = importedSettings.settings.compactView || false;
                        }

                        StorageManager.set('netcofe_settings_applied', true);
                        console.log('✅ تنظیمات اولیه با موفقیت از سرور اعمال شد.');
                    }
                } catch (e) {
                    console.error('❌ خطا در دریافت فایل تنظیمات:', e);
                }
            }
            // ---------------------------------------

            await Renderer.renderDashboard();
            
            const firstRun = !StorageManager.get('netcofe_first_run');
            if (firstRun) {
                StorageManager.set('netcofe_first_run', true);
                setTimeout(() => {
                    alert('🎉 به همیار کافینت خوش آمدید!');
                }, 1000);
            }
            
        } catch (error) {
            console.error('❌ خطا در راه‌اندازی:', error);
            const container = document.getElementById('grid-container');
            if (container) {
                container.innerHTML = `<div class="error-state"><h3>❌ خطا در راه‌اندازی</h3><p>${error.message}</p></div>`;
            }
        }
    }
}

// ==================== راه‌اندازی برنامه ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM آماده است.');
    App.init();
    
    // نمایش وضعیت آنلاین/آفلاین
    const updateOnlineStatus = () => {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.toggle('hidden', navigator.onLine);
        }
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
});