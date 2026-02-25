import { supabase } from '../api/supabase.js';

// Zmienna globalna do trzymania interwału (aby można go było wyczyścić przy zmianie widoku)
let nowNextInterval = null;

export async function renderHomeView(container) {
  container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);"><i class="ph ph-spinner-gap" style="font-size: 32px; animation: spin 1s linear infinite;"></i></div>`;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // ==========================================
  // 1. POBIERANIE DANYCH (Odpowiednik storage w Swifcie)
  // ==========================================
  const [
    { data: tasks }, { data: exams }, { data: topics }, // DODANO TOPICS
    { data: entries }, { data: subjects }, { data: cancellations }, 
    { data: events }, { data: lists }
  ] = await Promise.all([
    supabase.from('daily_tasks').select('*'),
    supabase.from('exams').select('*'), // Pobieramy wszystkie egzaminy, posortujemy w JS
    supabase.from('topics').select('*'), // Pobieramy tematy do Overall Progress
    supabase.from('schedule_entries').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('cancellations').select('*'),
    supabase.from('custom_events').select('*'),
    supabase.from('event_lists').select('*')
  ]);

  // --- STATYSTYKI: TODAY ---
  const tasksToday = (tasks || []).filter(t => t.date === today);
  // Jeśli masz tematy przypisane na dziś:
  const topicsToday = (topics || []).filter(t => t.scheduled_date === today);
  
  const todayTotal = tasksToday.length + topicsToday.length;
  const todayDone = tasksToday.filter(t => t.status === 'done').length + 
                    topicsToday.filter(t => t.status === 'done').length;

  // --- STATYSTYKI: OVERALL (Algorytm ze Swifta) ---
  const futureExams = (exams || []).filter(e => e.date >= today);
  const futureExamIDs = new Set(futureExams.map(e => e.id));

  const relevantTopics = (topics || []).filter(topic => {
    const belongsToFutureExam = futureExamIDs.has(topic.exam_id || "");
    const isOverdue = (topic.status !== "done");
    return belongsToFutureExam || isOverdue;
  });

  const relevantTasks = (tasks || []).filter(task => {
    const isFutureOrToday = (task.date || "") >= today;
    const isOverdue = (task.status !== "done");
    return isFutureOrToday || isOverdue;
  });

  const overallTotal = relevantTopics.length + relevantTasks.length;
  const overallDone = relevantTopics.filter(t => t.status === 'done').length +
                      relevantTasks.filter(t => t.status === 'done').length;


  // --- NAJBLIŻSZY EGZAMIN ---
  const upcomingExams = futureExams.sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : null;
  // Przypisanie nazwy przedmiotu do egzaminu
  if (nextExam && subjects) {
    const subj = subjects.find(s => s.id === nextExam.subject_id);
    if (subj) nextExam.subject = subj.name;
  }

  const currentGPA = "0.00"; 
  const studyTimeSeconds = 0; 

  const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  const formattedDate = new Date().toLocaleDateString('en-US', dateOptions);

  // ==========================================
  // 2. LOGIKA NOW/NEXT (Odpowiednik nextScheduleItem w Swift)
  // ==========================================
  function getNextScheduleItem() {
    const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    for (let offset = 0; offset < 7; offset++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + offset);
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      // JS: 0=Niedziela, Swift: 0=Poniedziałek. Konwersja do formatu ze Swifta:
      let weekday = (checkDate.getDay() + 6) % 7; 

      let dailyItems = [];

      // A) Stary plan zajęć (Szkoła/Uczelnia)
      const dayClasses = (entries || []).filter(entry => {
        if (entry.day_of_week !== weekday) return false;
        const subject = (subjects || []).find(s => s.id === entry.subject_id);
        if (!subject) return false;
        
        if (subject.start_datetime && subject.start_datetime.substring(0, 10) > checkDateStr) return false;
        if (subject.end_datetime && subject.end_datetime.substring(0, 10) < checkDateStr) return false;
        
        const isCancelled = (cancellations || []).some(c => c.entry_id === entry.id && c.date === checkDateStr);
        if (isCancelled) return false;
        if (offset === 0 && entry.end_time <= currentTimeStr) return false;
        return true;
      });

      dayClasses.forEach(entry => {
        const subject = subjects.find(s => s.id === entry.subject_id);
        const roomStr = entry.room ? `Room ${entry.room}` : "";
        dailyItems.push({
          title: subject.name, subtitle: roomStr, startTime: entry.start_time, endTime: entry.end_time,
          typeStr: entry.type || "Class", dateStr: checkDateStr, hexColor: subject.color || "#3498db"
        });
      });

      // B) Nowe wydarzenia (Praca, Klub itp.)
      const dayEvents = (events || []).filter(event => {
        const isRec = event.is_recurring || false;
        const sDate = event.date || event.start_date || "";
        const eDate = event.end_date || sDate;

        if (!isRec) {
          if (!sDate || checkDateStr < sDate || checkDateStr > eDate) return false;
        } else {
          if (event.day_of_week !== weekday) return false;
          if (event.start_date && event.start_date > checkDateStr) return false;
          if (event.end_date && event.end_date < checkDateStr) return false;
        }

        let effectiveEnd = event.end_time;
        if (checkDateStr < eDate) effectiveEnd = "23:59";
        if (offset === 0 && effectiveEnd <= currentTimeStr) return false;
        return true;
      });

      dayEvents.forEach(event => {
        let listName = "Event";
        if (event.list_id && lists) {
          const list = lists.find(l => l.id === event.list_id);
          if (list) listName = list.name;
        }
        
        const sDate = event.date || event.start_date || "";
        const eDate = event.end_date || sDate;
        let effectiveStart = event.start_time;
        let effectiveEnd = event.end_time;
        
        if (checkDateStr > sDate) effectiveStart = "00:00";
        if (checkDateStr < eDate) effectiveEnd = "23:59";

        dailyItems.push({
          title: event.title, subtitle: "", startTime: effectiveStart, endTime: effectiveEnd,
          typeStr: listName, dateStr: checkDateStr, hexColor: event.color || "#3498db"
        });
      });

      if (dailyItems.length > 0) {
        dailyItems.sort((a, b) => a.startTime.localeCompare(b.startTime));
        return dailyItems[0];
      }
    }
    return null;
  }

  const nextItem = getNextScheduleItem();

  // ==========================================
  // 3. GENEROWANIE HTML
  // ==========================================
  const renderProgressCard = (title, done, total, colorHex) => {
    const percentage = total > 0 ? done / total : 0;
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - percentage * circumference;

    return `
      <div style="background-color: var(--bg-secondary-grouped); padding: 15px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px;">
        <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">${title}</span>
        <div style="position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
          <svg width="80" height="80" style="transform: rotate(-90deg);">
            <circle cx="40" cy="40" r="${radius}" fill="none" stroke="${colorHex}" stroke-width="10" stroke-linecap="round" opacity="0.2" />
            <circle cx="40" cy="40" r="${radius}" fill="none" stroke="${colorHex}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" style="transition: stroke-dashoffset 1s ease-in-out;" />
          </svg>
          <div style="position: absolute; text-align: center;">
            <div style="font-size: 18px; font-weight: bold;">${Math.round(percentage * 100)}%</div>
            <div style="font-size: 10px; color: var(--text-secondary);">${done} / ${total}</div>
          </div>
        </div>
      </div>
    `;
  };

  const getNowNextHtml = (item) => {
    if (!item) {
      return `
        <div style="background-color: var(--bg-secondary-grouped); padding: 20px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <div style="font-size: 12px; font-weight: bold; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px;">Now / Next</div>
          <h3 style="font-size: 18px; font-weight: bold; color: var(--accent-green);">No events ahead</h3>
        </div>
      `;
    }

    return `
      <div id="now-next-card" style="position: relative; background-color: var(--bg-secondary-grouped); padding: 20px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); margin-bottom: 20px; overflow: hidden; border: 2px solid transparent;">
        <div id="nn-pulsating-border" style="position: absolute; inset: 0; border-radius: 18px; border: 3px solid ${item.hexColor}; opacity: 0; transition: transform 1.2s ease-out, opacity 1.2s ease-out; pointer-events: none;"></div>
        
        <svg id="nn-progress-svg" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; display: none;">
          <rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="18" fill="none" stroke="${item.hexColor}26" stroke-width="4" />
          <rect id="nn-progress-fill" x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="18" fill="none" stroke="${item.hexColor}" stroke-width="4" stroke-linecap="round" style="transition: stroke-dashoffset 1s linear;" />
        </svg>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; position: relative; z-index: 1;">
          <span id="nn-label" style="font-size: 12px; font-weight: bold; color: ${item.hexColor}; text-transform: uppercase;"></span>
          <div id="nn-badge"></div>
        </div>
        
        <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 6px; position: relative; z-index: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</h3>
        
        <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text-secondary); margin-bottom: 10px; position: relative; z-index: 1;">
          <i class="ph ph-clock"></i>
          <span id="nn-time-str"></span>
        </div>
        
        <span style="font-size: 10px; font-weight: bold; background-color: ${item.hexColor}26; color: ${item.hexColor}; padding: 4px 8px; border-radius: 6px; position: relative; z-index: 1;">${item.typeStr}</span>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="padding: 20px; padding-bottom: 40px; display: flex; flex-direction: column; gap: 20px;">
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px;">
        <div>
          <h1 style="font-size: 34px; font-weight: bold; margin-bottom: 4px;">Dashboard</h1>
          <p style="color: var(--text-secondary); font-size: 15px;">${formattedDate}</p>
        </div>
        <i class="ph-fill ph-chart-bar" style="font-size: 35px; color: var(--accent-blue);"></i>
      </div>

      ${getNowNextHtml(nextItem)}

      <div style="background-color: var(--bg-secondary-grouped); padding: 20px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
          <i class="ph-fill ph-calendar-blank" style="color: var(--accent-red); font-size: 18px;"></i>
          <span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">Next Exam</span>
        </div>
        
        ${nextExam ? `
          <h2 style="font-size: 20px; font-weight: bold;">${nextExam.title}</h2>
          <p style="font-size: 14px; color: var(--accent-red); margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nextExam.subject || 'Unknown Subject'}</p>
          
          <div style="display: inline-flex; gap: 12px; font-size: 14px; background-color: rgba(231, 76, 60, 0.15); color: var(--accent-red); padding: 6px 12px; border-radius: 8px; font-weight: 500;">
            <div style="display: flex; align-items: center; gap: 4px;"><i class="ph ph-calendar"></i> ${nextExam.date}</div>
            <div style="display: flex; align-items: center; gap: 4px;"><i class="ph ph-clock"></i> ${nextExam.time || 'TBA'}</div>
          </div>
        ` : `<h3 style="font-size: 18px; font-weight: bold; color: var(--accent-green);">No upcoming exams</h3>`}
      </div>

      <div style="display: flex; gap: 15px;">
        ${renderProgressCard("Today", todayDone, todayTotal, "var(--accent-green)")}
        ${renderProgressCard("Overall", overallDone, overallTotal, "var(--accent-blue)")}
      </div>

      <div style="background-color: var(--bg-secondary-grouped); padding: 20px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 5px;">Today's Focus</div>
          <div style="font-size: 34px; font-weight: bold; color: #5856d6; font-family: ui-rounded, sans-serif;">00:00</div>
        </div>
        <i class="ph-fill ph-timer" style="font-size: 40px; color: rgba(88, 86, 214, 0.8);"></i>
      </div>

      <div style="background-color: var(--bg-secondary-grouped); padding: 20px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 5px;">Current Semester GPA</div>
          <div style="font-size: 34px; font-weight: bold; color: var(--accent-blue); font-family: ui-rounded, sans-serif;">${currentGPA}</div>
        </div>
        <i class="ph-fill ph-graduation-cap" style="font-size: 40px; color: rgba(52, 152, 219, 0.8);"></i>
      </div>
    </div>
  `;

  // ==========================================
  // 4. ANIMACJA I TIMER NOW/NEXT (Na żywo)
  // ==========================================
  if (nextItem) {
    if (nowNextInterval) clearInterval(nowNextInterval);

    const updateNowNextCard = () => {
      const card = document.getElementById('now-next-card');
      if (!card) {
        clearInterval(nowNextInterval); // Zatrzymaj, gdy zmienisz zakładkę
        return;
      }

      const current = new Date();
      const startDate = new Date(`${nextItem.dateStr}T${nextItem.startTime}:00`);
      
      let endDate = new Date(`${nextItem.dateStr}T${nextItem.endTime}:00`);
      if (nextItem.endTime === "23:59" || nextItem.endTime === "00:00") {
        endDate = new Date(`${nextItem.dateStr}T23:59:59`);
      }

      const isNow = current >= startDate && current < endDate;
      const timeDiffSeconds = (startDate - current) / 1000;
      const isStartingSoon = !isNow && timeDiffSeconds > 0 && timeDiffSeconds <= 300;

      const seconds = Math.floor(timeDiffSeconds);
      const minutes = Math.floor((seconds / 60) % 60);
      const hours = Math.floor(seconds / 3600);
      
      const currentDay = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const days = Math.round((startDay - currentDay) / (1000 * 60 * 60 * 24));

      const totalDur = (endDate - startDate) / 1000;
      const elapsed = (current - startDate) / 1000;
      const progress = totalDur > 0 ? Math.max(0, Math.min(1, elapsed / totalDur)) : 0;

      // Elementy UI
      const label = document.getElementById('nn-label');
      const badge = document.getElementById('nn-badge');
      const timeStr = document.getElementById('nn-time-str');
      const pulsBorder = document.getElementById('nn-pulsating-border');
      const progSvg = document.getElementById('nn-progress-svg');
      const progFill = document.getElementById('nn-progress-fill');

      label.innerText = isNow ? "NOW" : "NEXT";

      // Obliczanie etykiety czasowej z prawej strony (badge)
      if (isNow) {
        badge.innerHTML = `<span style="font-size: 10px; font-weight: bold; color: white; background-color: ${nextItem.hexColor}; padding: 4px 8px; border-radius: 6px;">In Progress</span>`;
      } else if (isStartingSoon) {
        const timeText = seconds < 60 ? `In ${seconds} s` : `In ${Math.floor(seconds / 60)} min`;
        badge.innerHTML = `<span style="font-size: 14px; font-weight: bold; color: ${nextItem.hexColor}; background-color: ${nextItem.hexColor}26; padding: 4px 10px; border-radius: 8px;">${timeText}</span>`;
      } else if (timeDiffSeconds > 0 && timeDiffSeconds < 3600) {
        badge.innerHTML = `<span style="font-size: 14px; font-weight: bold; color: ${nextItem.hexColor}; background-color: ${nextItem.hexColor}26; padding: 4px 10px; border-radius: 8px;">In ${Math.max(1, Math.floor(seconds / 60))} min</span>`;
      } else if (timeDiffSeconds >= 3600 && timeDiffSeconds < 86400 && days <= 1) {
        const text = minutes > 0 ? `In ${hours}h ${minutes}m` : `In ${hours}h`;
        badge.innerHTML = `<span style="font-size: 10px; font-weight: bold; color: ${nextItem.hexColor}; background-color: ${nextItem.hexColor}1A; padding: 2px 6px; border-radius: 4px;">${text}</span>`;
      } else {
        badge.innerHTML = `
          <div style="text-align: right; background-color: ${nextItem.hexColor}1A; padding: 4px 6px; border-radius: 6px;">
            <div style="font-size: 10px; font-weight: bold; color: ${nextItem.hexColor};">${days === 1 ? "Tomorrow" : `In ${days} days`}</div>
            <div style="font-size: 10px; color: var(--text-secondary);">${nextItem.dateStr}</div>
          </div>`;
      }

      const displayEnd = (nextItem.endTime === "23:59" || nextItem.endTime === "00:00") ? "End of day" : nextItem.endTime;
      const displayTime = (nextItem.startTime === "00:00" && displayEnd === "End of day") ? "All day" : `${nextItem.startTime} - ${displayEnd}`;
      timeStr.innerHTML = `${displayTime} ${nextItem.subtitle ? `• ${nextItem.subtitle}` : ""}`;

      // Efekty ramki (Pulsowanie i Obramówka Postępu)
      if (isStartingSoon) {
        card.style.border = `2px solid ${nextItem.hexColor}`;
        pulsBorder.style.display = 'block';
        if (pulsBorder.style.transform === 'scale(1.05)') {
          pulsBorder.style.transform = 'scale(1)'; pulsBorder.style.opacity = '0.8';
        } else {
          pulsBorder.style.transform = 'scale(1.05)'; pulsBorder.style.opacity = '0';
        }
      } else {
        card.style.border = `2px solid transparent`;
        pulsBorder.style.display = 'none';
      }

      if (isNow) {
        progSvg.style.display = 'block';
        // Hack na obliczenie obwodu w czasie rzeczywistym by SVG rysowało się płynnie 
        const rect = progFill.getBoundingClientRect();
        const perimeter = (rect.width + rect.height) * 2 - 32; 
        progFill.style.strokeDasharray = perimeter;
        progFill.style.strokeDashoffset = perimeter - (progress * perimeter);
      } else {
        progSvg.style.display = 'none';
      }
    };

    updateNowNextCard(); // Wykonaj od razu
    nowNextInterval = setInterval(updateNowNextCard, 1000); // Odświeżaj co 1s
  }
}