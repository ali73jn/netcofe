/*=============== RETRO CLOCK FIXED ===============*/

function updateClockHands() {
    const hour = document.getElementById('retro-clock-hour');
    const minutes = document.getElementById('retro-clock-minutes');
    
    if (!hour || !minutes) return;
    
    const date = new Date();
    const hh = date.getHours();
    const mm = date.getMinutes();
    const ss = date.getSeconds();
    
    // محاسبه درجات برای عقربه‌ها
    const hourDeg = (hh % 12) * 30 + mm * 0.5;  // هر ساعت 30 درجه + هر دقیقه 0.5 درجه
    const minuteDeg = mm * 6 + ss * 0.1;         // هر دقیقه 6 درجه + هر ثانیه 0.1 درجه
    
    // اعمال چرخش
    hour.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
    minutes.style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
}

function updateClockText() {
    const dateDayWeek = document.getElementById('retro-date-day-week');
    const dateMonth = document.getElementById('retro-date-month');
    const dateDay = document.getElementById('retro-date-day');
    const dateYear = document.getElementById('retro-date-year');
    const textHour = document.getElementById('retro-text-hour');
    const textMinutes = document.getElementById('retro-text-minutes');
    const textAmPm = document.getElementById('retro-text-ampm');
    
    if (!dateDayWeek) return;
    
    const date = new Date();
    const dayWeek = date.getDay();
    const month = date.getMonth();
    const day = date.getDate();
    const year = date.getFullYear();
    let hh = date.getHours();
    let mm = date.getMinutes();
    let ampm;
    
    // روزهای هفته انگلیسی
    const daysWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // نمایش تاریخ
    dateDayWeek.textContent = daysWeek[dayWeek];
    dateMonth.textContent = months[month];
    dateDay.textContent = day + ',';
    dateYear.textContent = year;
    
    // تبدیل به 12 ساعته
    if (hh >= 12) {
        ampm = 'PM';
        if (hh > 12) hh = hh - 12;
    } else {
        ampm = 'AM';
        if (hh === 0) hh = 12;
    }
    
    // نمایش زمان
    textHour.textContent = hh.toString().padStart(2, '0') + ':';
    textMinutes.textContent = mm.toString().padStart(2, '0');
    textAmPm.textContent = ampm;
}

// راه‌اندازی اولیه
function initRetroClock() {
    console.log('Initializing Retro Clock...');
    
    // فایل CSS را بارگذاری کن
    loadClockStyles();
    
    // شروع به‌روزرسانی‌ها
    updateClockHands();
    updateClockText();
    
    // تنظیم اینتروال‌ها
    setInterval(updateClockHands, 1000);
    setInterval(updateClockText, 1000);
}

// بارگذاری استایل‌های ساعت
function loadClockStyles() {
    if (document.getElementById('retro-clock-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'retro-clock-styles';
    style.textContent = `
        /* ساعت رترو */
        .retro-clock-container {
            direction: ltr !important;
            text-align: center !important;
        }
        
        .retro-clock {
            direction: ltr !important;
        }
        
        .retro-clock__circle {
            position: relative;
        }
        
        .retro-clock__hour, 
        .retro-clock__minutes {
            position: absolute;
            bottom: 50%;
            left: 50%;
            transform-origin: bottom center;
            transform: translateX(-50%);
            border-radius: 2px;
        }
        
        .retro-clock__hour {
            width: 2px;
            height: 25px;
            background-color: #d63031;
        }
        
        .retro-clock__minutes {
            width: 2px;
            height: 38px;
            background-color: #d63031;
        }
        
        .retro-clock__rounder {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 6px;
            height: 6px;
            background-color: #2d3436;
            border-radius: 50%;
            z-index: 10;
        }
        
        /* متن تاریخ و زمان */
        .retro-clock__info {
            direction: ltr !important;
            text-align: center !important;
        }
    `;
    document.head.appendChild(style);
}

// اجرای ساعت بعد از بارگذاری DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRetroClock);
} else {
    initRetroClock();
}