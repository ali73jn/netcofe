import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Search, Edit3, Plus, Save, Download, Upload, RefreshCw, Folder, Trash2, Globe } from 'lucide-react';
import { saveAs } from 'file-saver';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import Card from './components/Card';

const ResponsiveGridLayout = WidthProvider(Responsive);

// --- تنظیمات اولیه ---
const DEFAULT_LAYOUT = { lg: [] };
const GITHUB_DB_URL = "https://raw.githubusercontent.com/ali73jn/netcofe/refs/heads/main/database.json"; // آدرس خام فایل گیت‌هاب شما

export default function App() {
  // --- متغیرهای State ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // دیتابیس اصلی
  const [db, setDb] = useState({
    version: "1.0",
    lastUpdated: "",
    layout: [],
    cards: {} // ساختار: { "card_id": { title: "", items: [] } }
  });

  const fileInputRef = useRef(null);

  // --- بارگذاری اولیه ---
  useEffect(() => {
    const saved = localStorage.getItem('myDashboardDb');
    if (saved) {
      setDb(JSON.parse(saved));
    }
  }, []);

  // ذخیره در LocalStorage با هر تغییر
  useEffect(() => {
    localStorage.setItem('myDashboardDb', JSON.stringify(db));
  }, [db]);

  // --- توابع دیتابیس ---
  
  // دانلود دیتابیس
  const handleDownloadDb = () => {
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `database-${date}.json`;
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    saveAs(blob, fileName);
  };

  // آپلود دیتابیس
  const handleUploadDb = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const newDb = JSON.parse(event.target.result);
        setDb(newDb);
        alert('دیتابیس با موفقیت بارگذاری شد.');
      } catch (err) {
        alert('فایل نامعتبر است.');
      }
    };
    reader.readAsText(file);
  };

  // بروزرسانی از گیت‌هاب
  const handleSyncGithub = async () => {
    try {
      // اضافه کردن timestamp برای جلوگیری از کش شدن
      const res = await fetch(`${GITHUB_DB_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error("خطا در ارتباط");
      const data = await res.json();
      setDb(data);
      alert('سایت بروزرسانی شد!');
    } catch (error) {
      alert('خطا: آدرس گیت‌هاب را در کد چک کنید یا اتصال اینترنت را بررسی کنید.');
    }
  };

  // --- توابع مدیریت کارت‌ها ---
  
  const handleAddCard = () => {
    const id = `card_${Date.now()}`;
    const newCard = { i: id, x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 2 };
    
    setDb(prev => ({
      ...prev,
      layout: [...prev.layout, newCard],
      cards: {
        ...prev.cards,
        [id]: { title: 'کارت جدید', items: [] }
      }
    }));
  };

  const handleDeleteCard = (id) => {
    if (!window.confirm("این کارت حذف شود؟")) return;
    setDb(prev => {
      const newLayout = prev.layout.filter(l => l.i !== id);
      const newCards = { ...prev.cards };
      delete newCards[id];
      return { ...prev, layout: newLayout, cards: newCards };
    });
  };

  const handleLayoutChange = (layout) => {
    setDb(prev => ({ ...prev, layout }));
  };

  const handleEditCardTitle = (id, newTitle) => {
    setDb(prev => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { ...prev.cards[id], title: newTitle }
      }
    }));
  };

  // --- افزودن آیتم (بوک‌مارک/پوشه) ---
  const handleAddItem = (cardId, type) => {
    const name = prompt(type === 'folder' ? 'نام پوشه:' : 'نام سایت:');
    if (!name) return;
    
    let url = '';
    if (type === 'bookmark') {
      url = prompt('آدرس سایت (مثلا google.com):');
      if (!url) return;
      if (!url.startsWith('http')) url = 'https://' + url;
    }

    const newItem = {
      id: `item_${Date.now()}`,
      type,
      name,
      url,
      desc: 'توضیحات...',
      icon: type === 'bookmark' 
        ? `https://www.google.com/s2/favicons?domain=${url}&sz=64` 
        : null,
      items: [] // برای پوشه
    };

    setDb(prev => {
      const card = prev.cards[cardId];
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: { ...card, items: [...card.items, newItem] }
        }
      };
    });
  };

// ... (سایر کدها)

  // --- رندر آیتم‌ها (حالت شبکه آیکون‌ها) ---
  const renderItems = (items, cardId) => {
    // اگر در حالت جستجو هستیم، فقط آیتم‌های مچ شده را نشان بده
    const filtered = items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (filtered.length === 0) {
      if (searchQuery) return <p className="text-gray-400 text-sm text-center p-4">نتیجه‌ای یافت نشد.</p>;
      if (!isEditMode) return <p className="text-gray-400 text-sm text-center p-4">کارت خالی است.</p>;
    }

    return (
      <div className="flex flex-wrap gap-4 justify-start p-2"> 
        {filtered.map(item => {
          const isBookmark = item.type === 'bookmark';
          const linkTarget = isBookmark ? item.url : '#';
          
          return (
            <a 
              href={linkTarget} 
              target={isBookmark ? "_blank" : "_self"}
              key={item.id} 
              title={item.desc || item.name}
              // Card Style: شبیه به آیکون‌های ویندوز/موبایل
              className="w-[70px] flex flex-col items-center p-2 rounded-lg text-center transition-none bg-transparent hover:bg-white/10 relative"
            >
              {/* کانتینر آیکون (برای استایل دهی) */}
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-1 
                           bg-white/20 backdrop-blur-sm shadow-lg border border-white/30"
              >
                {isBookmark ? (
                  <img 
                    src={item.icon} 
                    alt={item.name} 
                    className="w-8 h-8 rounded-lg" 
                    onError={(e) => {e.target.src='https://via.placeholder.com/32'}} 
                  />
                ) : (
                  <Folder size={24} className="text-yellow-400" />
                )}
              </div>
              
              {/* نام آیتم */}
              <span className="text-xs mt-2 text-center text-white truncate w-full">{item.name}</span>

              {/* دکمه‌های ویرایش کوچک (فقط در حالت ویرایش) */}
              {isEditMode && (
                <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      // منطق حذف آیتم باید در این تابع پیاده‌سازی شود
                      alert(`حذف آیتم: ${item.name}. (لاجیک پیاده‌سازی نشده)`);
                    }}
                    className="text-red-400 bg-slate-800/80 rounded-full p-0.5"
                    title="حذف"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </a>
          );
        })}
      </div>
    );
  };

// ... (سایر کدها)
  return (
    <div className="min-h-screen bg-grid-pattern text-white pb-20">
      
      {/* --- هدر --- */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur border-b border-white/10 p-4 flex items-center gap-4 justify-between">
        
        {/* بخش جستجو */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="جستجو..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pr-10 pl-4 text-sm focus:outline-none focus:bg-white/10 transition-colors"
          />
        </div>

        {/* دکمه‌های کنترلی */}
        <div className="flex items-center gap-2">
          {/* دکمه‌های دیتابیس */}
          <div className="flex bg-white/5 rounded-lg p-1 mr-4 border border-white/10">
            <button onClick={handleSyncGithub} title="بروزرسانی از گیت‌هاب" className="p-2 hover:bg-white/10 rounded"><RefreshCw size={18} /></button>
            <button onClick={handleDownloadDb} title="دانلود دیتابیس" className="p-2 hover:bg-white/10 rounded"><Download size={18} /></button>
            <button onClick={() => fileInputRef.current.click()} title="آپلود دیتابیس" className="p-2 hover:bg-white/10 rounded"><Upload size={18} /></button>
            <input type="file" ref={fileInputRef} onChange={handleUploadDb} className="hidden" accept=".json" />
          </div>

          {/* دکمه افزودن کارت (فقط در ویرایش) */}
          {isEditMode && (
             <button onClick={handleAddCard} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium text-sm">
               <Plus size={16} /> کارت جدید
             </button>
          )}

          {/* سوییچ حالت ویرایش */}
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`p-2 rounded-lg border transition-colors ${isEditMode ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-white/5 border-transparent text-gray-400 hover:text-white'}`}
            title={isEditMode ? "خروج از ویرایش" : "حالت ویرایش"}
          >
            {isEditMode ? <Save size={20} /> : <Edit3 size={20} />}
          </button>
        </div>
      </header>

      {/* --- صفحه اصلی (گرید) --- */}
// ... (سایر کدها)

      {/* --- صفحه اصلی (گرید) --- */}
      <main className="p-6">
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: db.layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".cursor-grab" 
          
          // تنظیمات جدید برای کیفیت و نظم (Grid Line)
          margin={[20, 20]}        // فاصله ۲۰ پیکسلی بین کارت‌ها
          containerPadding={[20, 20]} // پدینگ اطراف کل محیط گرید
          compactType={null}       // جلوگیری از جمع شدن تهاجمی کارت‌ها
          preventCollision={true}  // جلوگیری از افتادن کارت‌ها روی هم
          // --------------------------------------------------
        >
          {db.layout.map((item) => {
            const cardData = db.cards[item.i] || { title: 'بی‌نام', items: [] };
            
            return (
              <div key={item.i}>
                <Card 
                  item={item} 
                  isEditMode={isEditMode}
                  onDelete={handleDeleteCard}
                  onEditTitle={handleEditCardTitle}
                >
                  {/* دکمه‌های افزودن آیتم به کارت */}
                  {isEditMode && (
                    <div className="flex gap-2 mb-2 px-1">
                      <button onClick={() => handleAddItem(item.i, 'bookmark')} className="flex-1 bg-white/5 hover:bg-white/10 py-1 rounded text-xs text-center border border-dashed border-white/20">+ سایت</button>
                      <button onClick={() => handleAddItem(item.i, 'folder')} className="flex-1 bg-white/5 hover:bg-white/10 py-1 rounded text-xs text-center border border-dashed border-white/20">+ پوشه</button>
                    </div>
                  )}
                  
                  {/* لیست آیتم‌ها */}
                  <div className="space-y-1">
                     {renderItems(cardData.items, item.i)}
                  </div>
                </Card>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </main>
    </div>
  );
}
