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

  // --- رندر آیتم‌ها (با قابلیت جستجو) ---
  const renderItems = (items, cardId) => {
    // اگر در حالت جستجو هستیم، فقط آیتم‌های مچ شده را نشان بده
    const filtered = items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return filtered.map(item => (
      <div key={item.id} className="group relative flex items-center p-2 mb-1 hover:bg-white/10 rounded-lg cursor-pointer">
        {/* آیکون */}
        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center mr-2 shrink-0">
          {item.type === 'folder' ? (
            <Folder size={18} className="text-yellow-400" />
          ) : (
            <img src={item.icon} alt="" className="w-5 h-5" onError={(e) => {e.target.src='https://via.placeholder.com/32'}} />
          )}
        </div>
        
        {/* متن */}
        <div className="flex-1 min-w-0 ml-2">
          <div className="text-sm font-medium truncate text-white">{item.name}</div>
          <div className="text-xs text-gray-400 truncate">{item.type === 'bookmark' ? item.desc : `${item.items.length} آیتم`}</div>
        </div>

        {/* اکشن‌های حالت ویرایش */}
        {isEditMode && (
          <button 
             onClick={(e) => {
               e.stopPropagation();
               // منطق حذف آیتم اینجا اضافه می‌شود (ساده‌سازی شده)
               alert('برای حذف کامل باید لاجیک تو در تو پیاده شود');
             }}
             className="text-red-400 opacity-0 group-hover:opacity-100 p-1"
          >
            <Trash2 size={14} />
          </button>
        )}

        {/* پاپ آپ توضیحات (فقط در حالت غیر ویرایش و بوک‌مارک) */}
        {!isEditMode && item.type === 'bookmark' && (
           <a href={item.url} target="_blank" className="absolute inset-0 z-10" title={item.desc} />
        )}
      </div>
    ));
  };

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
          draggableHandle=".cursor-grab" // فقط از هدر کارت می‌شه درگ کرد
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
