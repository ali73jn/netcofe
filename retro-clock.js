// ==================== RETRO CLOCK ALL IN ONE ====================
class RetroClock {
    constructor() {
        this.interval = null;
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        
        console.log('Retro Clock Initializing...');
        
        // بارگذاری استایل‌ها
        this.injectStyles();
        
        // شروع ساعت
        this.start();
        
        this.initialized = true;
    }
    
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .retro-clock-container { direction: ltr !important; text-align: center !important; }
            .retro-clock { direction: ltr !important; }
            .retro-clock__circle { position: relative; width: 100px; height: 100px; border: 3px solid #2d3436; background: #dfe6e9; border-radius: 50%; box-shadow: inset 2px 2px 8px rgba(0,0,0,0.4); }
            .retro-clock__rounder { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; background: #2d3436; border-radius: 50%; z-index: 10; }
            .retro-clock__hour { position: absolute; bottom: 50%; left: 50%; transform: translateX(-50%); transform-origin: bottom center; width: 3px; height: 25px; background: #d63031; }
            .retro-clock__minutes { position: absolute; bottom: 50%; left: 50%; transform: translateX(-50%); transform-origin: bottom center; width: 2px; height: 38px; background: #d63031; }
        `;
        document.head.appendChild(style);
    }
    
    updateHands() {
        const hour = document.getElementById('retro-clock-hour');
        const minutes = document.getElementById('retro-clock-minutes');
        
        if (!hour || !minutes) return;
        
        const now = new Date();
        const h = now.getHours() % 12;
        const m = now.getMinutes();
        const s = now.getSeconds();
        
        const hourDeg = (h * 30) + (m * 0.5);
        const minuteDeg = (m * 6) + (s * 0.1);
        
        hour.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
        minutes.style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
    }
    
    updateText() {
        const elements = {
            dayWeek: document.getElementById('retro-date-day-week'),
            month: document.getElementById('retro-date-month'),
            day: document.getElementById('retro-date-day'),
            year: document.getElementById('retro-date-year'),
            hour: document.getElementById('retro-text-hour'),
            minutes: document.getElementById('retro-text-minutes'),
            ampm: document.getElementById('retro-text-ampm')
        };
        
        if (!elements.dayWeek) return;
        
        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        let h = now.getHours();
        const m = now.getMinutes();
        let ampm = 'AM';
        
        if (h >= 12) {
            ampm = 'PM';
            if (h > 12) h -= 12;
        }
        if (h === 0) h = 12;
        
        elements.dayWeek.textContent = days[now.getDay()];
        elements.month.textContent = months[now.getMonth()];
        elements.day.textContent = now.getDate() + ',';
        elements.year.textContent = now.getFullYear();
        elements.hour.textContent = h.toString().padStart(2, '0') + ':';
        elements.minutes.textContent = m.toString().padStart(2, '0');
        elements.ampm.textContent = ampm;
    }
    
    start() {
        this.updateHands();
        this.updateText();
        
        this.interval = setInterval(() => {
            this.updateHands();
            this.updateText();
        }, 1000);
    }
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

// ایجاد نمونه ساعت
window.retroClock = new RetroClock();

// شروع ساعت وقتی DOM آماده شد
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.retroClock.init());
} else {
    window.retroClock.init();
}