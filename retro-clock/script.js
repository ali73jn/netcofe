// تبدیل اعداد انگلیسی به فارسی
function toPersianDigits(num) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, d => persianDigits[d]);
}

// تبدیل تاریخ میلادی به شمسی
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

/*=============== CLOCK ===============*/
const hour = document.getElementById('clock-hour'),
      minutes = document.getElementById('clock-minutes')

const clock = () => {
   // We get the Date object
   let date = new Date()

   // We get the hours and minutes 
   // (current time) / 12(hours) * 360(deg circle)
   // (Current minute) / 60(minutes) * 360(deg circle)
   let hh = date.getHours() / 12 * 360,
       mm = date.getMinutes() / 60 * 360

   // We add a rotation to the elements
   hour.style.transform = `rotateZ(${hh + mm / 12}deg)`
   minutes.style.transform = `rotateZ(${mm}deg)`
}
setInterval(clock, 1000) // (Updates every 1s) 1000 = 1s 

/*=============== TIME AND DATE TEXT ===============*/
const dateDayWeek = document.getElementById('date-day-week'),
      dateMonth = document.getElementById('date-month'),
      dateDay = document.getElementById('date-day'),
      dateYear = document.getElementById('date-year'),
      textHour = document.getElementById('text-hour'),
      textMinutes = document.getElementById('text-minutes'),
      textAmPm = document.getElementById('text-ampm')

const clockText = () => {
   // We get the Date object
   let date = new Date()

   // We get the time and date
   let dayWeek = date.getDay(),
       month = date.getMonth(),
       day = date.getDate(),
       year = date.getFullYear(),
       hh = date.getHours(),
       mm = date.getMinutes(),
       ampm

   // Convert to Persian calendar
   const jalali = gregorianToJalali(year, month + 1, day);
   
   // Persian days of week
   let daysWeek = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']
   
   // We add the corresponding dates
   dateDayWeek.innerHTML = `${daysWeek[dayWeek]}`
   dateMonth.innerHTML = `${toPersianDigits(jalali[1])}` // ماه عددی
   dateDay.innerHTML = `${toPersianDigits(jalali[2])},`
   dateYear.innerHTML = toPersianDigits(jalali[0])

   // If hours is greater than 12 (afternoon), we subtract -12, so that it starts at 1 (afternoon)
   if(hh >= 12){
      hh = hh - 12
      ampm = 'PM'
   } else{
      ampm = 'AM'
   }

   textAmPm.innerHTML = ampm

   // When it is 0 hours (early morning), we tell it to change to 12 hours
   if(hh == 0){hh = 12}

   // If hours is less than 10, add a 0 (01,02,03...09)
   if(hh < 10){hh = `0${hh}`}

   textHour.innerHTML = `${toPersianDigits(hh)}:`

   // If minutes is less than 10, add a 0 (01,02,03...09)
   if(mm < 10){mm = `0${mm}`}

   textMinutes.innerHTML = toPersianDigits(mm)
}

// First call
clockText();
setInterval(clockText, 1000) // (Updates every 1s) 1000 = 1s