import { supabase } from '../api/supabase.js';

// Globalne stany
let selectedDate = new Date();
let selectedSemesters = new Set();
let selectedLists = new Set();

let dbData = {
  exams: [], events: [], entries: [], subjects: [], cancellations: [], lists: [], semesters: []
};

// Funkcje pomocnicze do dat w JS (żeby uniknąć problemów z UTC)
const formatYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay() || 7; // 0 (Niedziela) -> 7
  date.setDate(date.getDate() - (day - 1));
  return date;
};

const addDays = (date, days) => {
  const res = new Date(date);
  res.setDate(res.getDate() + days);
  return res;
};

export async function renderScheduleView(container) {
  container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);"><i class="ph ph-spinner-gap" style="font-size: 32px; animation: spin 1s linear infinite;"></i></div>`;

  // 1. POBIERANIE DANYCH
  const [
    { data: exams }, { data: events }, { data: entries }, 
    { data: subjects }, { data: cancellations }, 
    { data: lists }, { data: semesters }
  ] = await Promise.all([
    supabase.from('exams').select('*'),
    supabase.from('custom_events').select('*'),
    supabase.from('schedule_entries').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('cancellations').select('*'),
    supabase.from('event_lists').select('*'),
    supabase.from('semesters').select('*')
  ]);

  dbData = {
    exams: exams || [], events: events || [], entries: entries || [],
    subjects: subjects || [], cancellations: cancellations || [],
    lists: lists || [], semesters: semesters || []
  };

  const renderUI = () => {
    const selectedDateStr = formatYMD(selectedDate);
    // Python weekday: 0 = Mon, 6 = Sun
    const pythonWeekday = (selectedDate.getDay() + 6) % 7; 
    
    // Generowanie dat dla bieżącego tygodnia (DayPicker)
    const startOfWeek = getMonday(selectedDate);
    const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i));

    // ==========================================
    // 2. FILTROWANIE DANYCH
    // ==========================================
    const classesForDay = dbData.entries.filter(entry => {
      if (entry.day_of_week !== pythonWeekday) return false;
      const subject = dbData.subjects.find(s => s.id === entry.subject_id);
      if (!subject) return false;
      if (selectedSemesters.size > 0 && !selectedSemesters.has(subject.semester_id || "")) return false;
      if (subject.start_datetime && subject.start_datetime.substring(0, 10) > selectedDateStr) return false;
      if (subject.end_datetime && subject.end_datetime.substring(0, 10) < selectedDateStr) return false;
      const isCancelled = dbData.cancellations.some(c => c.entry_id === entry.id && c.date === selectedDateStr);
      if (isCancelled) return false;
      return true;
    }).map(entry => ({ type: 'class', data: entry, sortTime: entry.start_time }));

    const examsForDay = dbData.exams.filter(exam => {
      if (exam.date !== selectedDateStr) return false;
      if (selectedSemesters.size > 0) {
        const subject = dbData.subjects.find(s => s.id === exam.subject_id);
        if (!subject || !selectedSemesters.has(subject.semester_id || "")) return false;
      }
      return true;
    }).map(exam => ({ type: 'exam', data: exam, sortTime: exam.time || "00:00" }));

    const eventsForDay = dbData.events.filter(ev => {
      if (selectedLists.size > 0 && !selectedLists.has(ev.list_id || "")) return false;
      const isRec = ev.is_recurring || false;
      if (!isRec) {
        const sDate = ev.date || ev.start_date || "";
        const eDate = ev.end_date || sDate;
        return sDate && selectedDateStr >= sDate && selectedDateStr <= eDate;
      } else {
        if (ev.day_of_week !== pythonWeekday) return false;
        if (ev.start_date && ev.start_date > selectedDateStr) return false;
        if (ev.end_date && ev.end_date < selectedDateStr) return false;
        return true;
      }
    }).map(ev => ({ type: 'event', data: ev, sortTime: ev.start_time }));

    // Unified Schedule
    const unifiedSchedule = [...classesForDay, ...examsForDay, ...eventsForDay]
      .sort((a, b) => a.sortTime.localeCompare(b.sortTime));

    // ==========================================
    // 3. GENEROWANIE HTML
    // ==========================================

    // Sekcja: Day Picker
    let dayPickerHTML = `<div style="display: flex; gap: 12px; overflow-x: auto; padding: 10px 20px; background: var(--bg-secondary-grouped); scrollbar-width: none;">`;
    weekDates.forEach(date => {
      const isSelected = formatYMD(date) === formatYMD(selectedDate);
      const isToday = formatYMD(date) === formatYMD(new Date());
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const dayNum = date.getDate();

      dayPickerHTML += `
        <button class="day-picker-btn" data-date="${formatYMD(date)}" style="min-width: 50px; display: flex; flex-direction: column; align-items: center; padding: 10px 15px; border: none; border-radius: 12px; cursor: pointer; background: ${isSelected ? 'var(--accent-blue)' : 'transparent'};">
          <span style="font-size: 12px; font-weight: 600; color: ${isSelected ? '#fff' : 'var(--text-secondary)'}">${dayName}</span>
          <span style="font-size: 18px; font-weight: bold; color: ${isSelected ? '#fff' : (isToday ? 'var(--accent-blue)' : 'var(--text-primary)')}">${dayNum}</span>
        </button>
      `;
    });
    dayPickerHTML += `</div>`;

    // Sekcja: Agenda Cards
    let agendaHTML = '';
    if (unifiedSchedule.length === 0) {
      agendaHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <i class="ph-fill ph-coffee" style="font-size: 50px; color: var(--text-secondary); opacity: 0.5; margin-bottom: 15px;"></i>
          <h3 style="font-size: 18px; font-weight: bold; color: var(--text-secondary);">No schedule for today.</h3>
        </div>
      `;
    } else {
      unifiedSchedule.forEach(item => {
        if (item.type === 'class') {
          const entry = item.data;
          const subject = dbData.subjects.find(s => s.id === entry.subject_id);
          const color = subject?.color || '#3498db';
          agendaHTML += `
            <div style="display: flex; align-items: flex-start; gap: 15px; padding: 15px; background: var(--bg-secondary-grouped); border-radius: 12px; margin-bottom: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); position: relative; overflow: hidden;">
              <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background-color: ${color};"></div>
              
              <div style="width: 55px; text-align: right;">
                <div style="font-weight: bold; font-size: 16px;">${entry.start_time}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">${entry.end_time}</div>
              </div>
              
              <div style="width: 1px; background: var(--bg-system-grouped); align-self: stretch;"></div>
              
              <div style="flex: 1;">
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${subject?.name || 'Unknown Subject'}</div>
                <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-secondary);">
                  ${entry.type ? `<span><i class="ph-fill ph-graduation-cap"></i> ${entry.type}</span>` : ''}
                  ${entry.room ? `<span><i class="ph-fill ph-door"></i> ${entry.room}</span>` : ''}
                </div>
              </div>

              <div style="display: flex; gap: 10px;">
                <button class="cancel-class-btn" data-id="${entry.id}" style="background: none; border: none; color: var(--accent-red); font-size: 20px; cursor: pointer;" title="Cancel this class"><i class="ph ph-x-circle"></i></button>
              </div>
            </div>
          `;
        } 
        else if (item.type === 'event') {
          const ev = item.data;
          const color = ev.color || '#3498db';
          const sDate = ev.date || ev.start_date || "";
          const eDate = ev.end_date || sDate;
          const isStart = selectedDateStr === sDate;
          const isEnd = selectedDateStr === eDate;
          
          let timeDisplay = "";
          let subTime = "";
          
          if (isStart && isEnd) {
            timeDisplay = ev.start_time;
            subTime = (ev.end_time === "23:59" || ev.end_time === "00:00") ? "End of day" : ev.end_time;
          } else if (isStart) {
            timeDisplay = ev.start_time; subTime = "-> ...";
          } else if (isEnd) {
            timeDisplay = "... ->"; subTime = (ev.end_time === "23:59" || ev.end_time === "00:00") ? "End of day" : ev.end_time;
          } else {
            timeDisplay = "All day";
          }

          agendaHTML += `
            <div style="display: flex; align-items: flex-start; gap: 15px; padding: 15px; background: var(--bg-secondary-grouped); border-radius: 12px; margin-bottom: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); position: relative; overflow: hidden;">
              <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background-color: ${color};"></div>
              
              <div style="width: 65px; text-align: right;">
                <div style="font-weight: bold; font-size: 16px;">${timeDisplay}</div>
                <div style="font-size: 14px; color: ${subTime === 'End of day' ? 'var(--accent-orange)' : 'var(--text-secondary)'}; font-style: ${subTime === 'End of day' ? 'italic' : 'normal'};">${subTime}</div>
              </div>
              
              <div style="width: 1px; background: var(--bg-system-grouped); align-self: stretch;"></div>
              
              <div style="flex: 1;">
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${ev.title}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                  <i class="ph ${ev.is_recurring ? 'ph-repeat' : 'ph-calendar'}"></i> ${ev.is_recurring ? 'Weekly' : 'One-time'}
                  ${sDate !== eDate ? `<span style="color: var(--accent-blue); display: block; margin-top: 2px;">Multi-day until ${eDate}</span>` : ''}
                </div>
              </div>

              <div style="display: flex; gap: 5px; flex-direction: column;">
                <button class="edit-event-btn" data-id="${ev.id}" style="background: none; border: none; color: var(--accent-blue); font-size: 18px; cursor: pointer;"><i class="ph ph-pencil-simple"></i></button>
                <button class="delete-event-btn" data-id="${ev.id}" style="background: none; border: none; color: var(--accent-red); font-size: 18px; cursor: pointer;"><i class="ph ph-trash"></i></button>
              </div>
            </div>
          `;
        }
        else if (item.type === 'exam') {
          const ex = item.data;
          const subject = dbData.subjects.find(s => s.id === ex.subject_id);
          agendaHTML += `
            <div style="display: flex; align-items: flex-start; gap: 15px; padding: 15px; background: rgba(231, 76, 60, 0.05); border: 1px solid rgba(231, 76, 60, 0.3); border-radius: 12px; margin-bottom: 12px; position: relative; overflow: hidden;">
              <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background-color: var(--accent-red);"></div>
              
              <div style="width: 55px; text-align: right;">
                <div style="font-weight: bold; font-size: 16px; color: var(--accent-red);">${ex.time || 'TBA'}</div>
              </div>
              
              <div style="width: 1px; background: rgba(231, 76, 60, 0.2); align-self: stretch;"></div>
              
              <div style="flex: 1;">
                <div style="font-size: 14px; font-weight: bold; color: var(--accent-red); margin-bottom: 2px;">EXAM: ${subject?.name || 'Subject'}</div>
                <div style="font-size: 16px; font-weight: bold;">${ex.title}</div>
              </div>

              <button class="edit-exam-btn" data-id="${ex.id}" style="background: none; border: none; color: var(--accent-blue); font-size: 20px; cursor: pointer;"><i class="ph ph-pencil-simple"></i></button>
            </div>
          `;
        }
      });
    }

    // Opcje dla filtrowania Semestrów i List (HTML)
    const semOptions = dbData.semesters.map(s => `
      <div class="filter-item">
        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; cursor: pointer;">
          <input type="checkbox" class="sem-filter" value="${s.id}" ${selectedSemesters.has(s.id) ? 'checked' : ''}>
          <span>${s.name}</span>
        </label>
      </div>
    `).join('');

    const listOptions = dbData.lists.map(l => `
      <div class="filter-item">
        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; cursor: pointer;">
          <input type="checkbox" class="list-filter" value="${l.id}" ${selectedLists.has(l.id) ? 'checked' : ''}>
          <span>${l.name}</span>
        </label>
      </div>
    `).join('');

    // ZŁOŻENIE CAŁEGO WIDOKU
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--bg-secondary-grouped); border-bottom: 1px solid var(--bg-system-grouped);">
          
          <div style="position: relative;">
            <button id="filter-btn" style="background: none; border: none; font-size: 24px; color: ${selectedSemesters.size || selectedLists.size ? 'var(--accent-blue)' : 'var(--text-primary)'}; cursor: pointer;"><i class="${selectedSemesters.size || selectedLists.size ? 'ph-fill' : 'ph'} ph-funnel"></i></button>
            
            <div id="filter-dropdown" class="hidden" style="position: absolute; top: 35px; left: 0; background: var(--bg-secondary-grouped); border: 1px solid var(--bg-system-grouped); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 100; width: 200px; padding: 10px;">
              <h4 style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin: 5px 10px;">Semesters</h4>
              ${semOptions}
              <div style="height: 1px; background: var(--bg-system-grouped); margin: 5px 0;"></div>
              <h4 style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin: 5px 10px;">Event Lists</h4>
              ${listOptions}
            </div>
          </div>

          <button id="today-btn" style="background: none; border: none; font-size: 18px; font-weight: bold; cursor: pointer;">
            ${selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} <i class="ph-fill ph-house" style="font-size: 14px; color: var(--accent-blue);"></i>
          </button>

          <div style="position: relative;">
             <button id="menu-dots-btn" style="background: none; border: none; font-size: 24px; cursor: pointer;"><i class="ph ph-dots-three-circle"></i></button>
             <div id="menu-dropdown" class="hidden" style="position: absolute; top: 35px; right: 0; background: var(--bg-secondary-grouped); border: 1px solid var(--bg-system-grouped); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 100; width: 180px; padding: 5px 0;">
                <button id="open-add-event" style="width: 100%; text-align: left; background: none; border: none; padding: 12px 15px; font-size: 16px; display: flex; align-items: center; gap: 10px; cursor: pointer;"><i class="ph ph-calendar-plus"></i> Add Event</button>
                <div style="height: 1px; background: var(--bg-system-grouped);"></div>
                <button id="open-manage-lists" style="width: 100%; text-align: left; background: none; border: none; padding: 12px 15px; font-size: 16px; display: flex; align-items: center; gap: 10px; cursor: pointer;"><i class="ph ph-list-bullets"></i> Manage Lists</button>
             </div>
          </div>
        </div>

        ${dayPickerHTML}

        <div style="flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 100px;">
          ${agendaHTML}
        </div>
      </div>

      ${renderModalsHTML()}
    `;

    attachEvents();
  }; // End renderUI()

  // ------------------------------------------
  // MODALE (HTML)
  // ------------------------------------------
  const renderModalsHTML = () => `
    <div id="event-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: flex-end; justify-content: center;">
      <div style="background: var(--bg-system-grouped); width: 100%; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 20px; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <button id="close-event-modal" style="color: var(--accent-blue); font-size: 16px; border: none; background: none;">Cancel</button>
          <h3 id="ev-modal-title" style="font-weight: bold;">Event</h3>
          <button id="save-event-btn" style="color: var(--accent-blue); font-weight: bold; font-size: 16px; border: none; background: none;">Save</button>
        </div>
        <input type="hidden" id="ev-id">
        <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 15px;">
           <input type="text" id="ev-title" placeholder="Title (e.g. Morning Shift)" style="width: 100%; border: none; background: transparent; font-size: 16px; padding: 8px 0; outline: none; border-bottom: 1px solid var(--bg-system-grouped);">
           <select id="ev-list" style="width: 100%; background: transparent; border: none; font-size: 16px; padding: 10px 0; outline: none; color: var(--text-primary);">
              <option value="">None (Standalone)</option>
              ${dbData.lists.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
           </select>
        </div>
        <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px;">
           <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
              <span>Repeats Weekly?</span><input type="checkbox" id="ev-recurring" style="width: 20px; height: 20px;">
           </div>
           
           <div id="ev-non-rec-box">
             <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                <span>Start Date</span><input type="date" id="ev-start-date" style="border: none; background: transparent; color: var(--accent-blue); outline: none;">
             </div>
             <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                <span>End Date</span><input type="date" id="ev-end-date" style="border: none; background: transparent; color: var(--accent-blue); outline: none;">
             </div>
           </div>

           <div id="ev-rec-box" class="hidden">
             <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                <span>Day of Week</span>
                <select id="ev-day" style="border: none; background: transparent; color: var(--accent-blue); outline: none;">
                  <option value="0">Monday</option><option value="1">Tuesday</option><option value="2">Wednesday</option>
                  <option value="3">Thursday</option><option value="4">Friday</option><option value="5">Saturday</option><option value="6">Sunday</option>
                </select>
             </div>
           </div>

           <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
              <span>Start Time</span><input type="time" id="ev-start-time" value="12:00" style="border: none; background: transparent; color: var(--accent-blue); outline: none;">
           </div>
           <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
              <span>Until End of Day</span><input type="checkbox" id="ev-end-day" style="width: 20px; height: 20px;">
           </div>
           <div id="ev-end-time-box" style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span>End Time</span><input type="time" id="ev-end-time" value="13:00" style="border: none; background: transparent; color: var(--accent-blue); outline: none;">
           </div>
        </div>
      </div>
    </div>

    <div id="edit-exam-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: flex-end; justify-content: center;">
      <div style="background: var(--bg-system-grouped); width: 100%; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <button id="close-ex-modal" style="color: var(--accent-blue); border: none; background: none;">Cancel</button>
          <h3 style="font-weight: bold;">Edit Exam</h3>
          <button id="save-ex-btn" style="color: var(--accent-blue); font-weight: bold; border: none; background: none;">Save</button>
        </div>
        <input type="hidden" id="ex-id">
        <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 15px;">
           <input type="text" id="ex-title" style="width: 100%; border: none; background: transparent; font-size: 16px; padding: 8px 0; outline: none;">
        </div>
        <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px;">
           <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
              <span>Date</span><input type="date" id="ex-date" style="border: none; background: transparent; color: var(--accent-blue); outline: none;">
           </div>
           <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
              <span>Time</span><input type="time" id="ex-time" style="border: none; background: transparent; color: var(--accent-blue); outline: none;">
           </div>
           <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span>Ignore Barrier</span><input type="checkbox" id="ex-barrier" style="width: 20px; height: 20px;">
           </div>
        </div>
      </div>
    </div>

    <div id="manage-lists-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: flex-end; justify-content: center;">
      <div style="background: var(--bg-system-grouped); width: 100%; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <h3 style="font-weight: bold;">Manage Lists</h3>
          <button id="close-lists-modal" style="color: var(--accent-blue); border: none; background: none; font-weight: bold;">Done</button>
        </div>
        <div id="lists-container" style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; max-height: 250px; overflow-y: auto; margin-bottom: 15px;">
          ${dbData.lists.length === 0 ? '<p style="color: gray; font-size: 14px;">No lists created yet.</p>' : dbData.lists.map(l => `
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 15px; height: 15px; border-radius: 50%; background: ${l.color || '#3498db'};"></div>
                <span style="font-weight: bold;">${l.name}</span>
              </div>
              <button class="del-list-btn" data-id="${l.id}" style="color: var(--accent-red); background: none; border: none;"><i class="ph ph-trash"></i></button>
            </div>
          `).join('')}
        </div>
        <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; display: flex; gap: 10px;">
          <input type="text" id="new-list-name" placeholder="New list name" style="flex: 1; border: none; background: transparent; outline: none; font-size: 16px;">
          <input type="color" id="new-list-color" value="#3498db" style="width: 30px; height: 30px; border: none; outline: none;">
          <button id="add-list-btn" style="color: var(--accent-blue); font-weight: bold; background: none; border: none;">Add</button>
        </div>
      </div>
    </div>
  `;

  // ------------------------------------------
  // EVENT LISTENERS
  // ------------------------------------------
  const attachEvents = () => {
    // Dropdowny nawigacji
    const fBtn = document.getElementById('filter-btn');
    const fDrop = document.getElementById('filter-dropdown');
    fBtn?.addEventListener('click', () => fDrop.classList.toggle('hidden'));

    const mBtn = document.getElementById('menu-dots-btn');
    const mDrop = document.getElementById('menu-dropdown');
    mBtn?.addEventListener('click', () => mDrop.classList.toggle('hidden'));

    // Powrót do "Dzisiaj"
    document.getElementById('today-btn')?.addEventListener('click', () => {
      selectedDate = new Date(); renderUI();
    });

    // Zmiana Daty w Pickerze
    container.querySelectorAll('.day-picker-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedDate = new Date(e.currentTarget.getAttribute('data-date'));
        renderUI();
      });
    });

    // Filtry
    container.querySelectorAll('.sem-filter').forEach(cb => {
      cb.addEventListener('change', (e) => {
        if(e.target.checked) selectedSemesters.add(e.target.value);
        else selectedSemesters.delete(e.target.value);
        renderUI();
      });
    });
    container.querySelectorAll('.list-filter').forEach(cb => {
      cb.addEventListener('change', (e) => {
        if(e.target.checked) selectedLists.add(e.target.value);
        else selectedLists.delete(e.target.value);
        renderUI();
      });
    });

    // Usuwanie Wydarzeń
    container.querySelectorAll('.delete-event-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if(confirm("Delete this event?")) {
          dbData.events = dbData.events.filter(ev => ev.id !== id);
          renderUI();
          await supabase.from('custom_events').delete().eq('id', id);
        }
      });
    });

    // Odwoływanie Zajęć (Cancel Class)
    container.querySelectorAll('.cancel-class-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if(confirm(`Cancel class for ${formatYMD(selectedDate)}?`)) {
          const payload = { entry_id: id, date: formatYMD(selectedDate) };
          dbData.cancellations.push(payload);
          renderUI();
          await supabase.from('cancellations').insert([payload]);
        }
      });
    });

    // --- LOGIKA MODAL: ADD/EDIT EVENT ---
    const evModal = document.getElementById('event-modal');
    const recToggle = document.getElementById('ev-recurring');
    const endDayToggle = document.getElementById('ev-end-day');
    
    recToggle?.addEventListener('change', (e) => {
      if(e.target.checked) {
        document.getElementById('ev-rec-box').classList.remove('hidden');
        document.getElementById('ev-non-rec-box').classList.add('hidden');
      } else {
        document.getElementById('ev-rec-box').classList.add('hidden');
        document.getElementById('ev-non-rec-box').classList.remove('hidden');
      }
    });

    endDayToggle?.addEventListener('change', (e) => {
      if(e.target.checked) {
        document.getElementById('ev-end-time-box').style.display = 'none';
        document.getElementById('ev-end-time').value = '23:59';
      } else {
        document.getElementById('ev-end-time-box').style.display = 'flex';
      }
    });

    const openEventModal = (ev = null) => {
      document.getElementById('menu-dropdown').classList.add('hidden');
      evModal.classList.remove('hidden');
      
      const titleEl = document.getElementById('ev-modal-title');
      const idInput = document.getElementById('ev-id');
      const titleInput = document.getElementById('ev-title');
      const listSel = document.getElementById('ev-list');
      const dStart = document.getElementById('ev-start-date');
      const dEnd = document.getElementById('ev-end-date');
      const tStart = document.getElementById('ev-start-time');
      const tEnd = document.getElementById('ev-end-time');

      if (ev) {
        titleEl.innerText = "Edit Event";
        idInput.value = ev.id;
        titleInput.value = ev.title;
        listSel.value = ev.list_id || "";
        recToggle.checked = ev.is_recurring || false;
        recToggle.dispatchEvent(new Event('change'));

        dStart.value = ev.date || ev.start_date || formatYMD(selectedDate);
        dEnd.value = ev.end_date || dStart.value;
        document.getElementById('ev-day').value = ev.day_of_week || 0;

        tStart.value = ev.start_time;
        tEnd.value = ev.end_time;
        endDayToggle.checked = (ev.end_time === '23:59');
        endDayToggle.dispatchEvent(new Event('change'));
      } else {
        titleEl.innerText = "New Event";
        idInput.value = ""; titleInput.value = ""; listSel.value = "";
        recToggle.checked = false; recToggle.dispatchEvent(new Event('change'));
        dStart.value = formatYMD(selectedDate); dEnd.value = formatYMD(selectedDate);
        tStart.value = "12:00"; tEnd.value = "13:00";
        endDayToggle.checked = false; endDayToggle.dispatchEvent(new Event('change'));
      }
    };

    document.getElementById('open-add-event')?.addEventListener('click', () => openEventModal());
    container.querySelectorAll('.edit-event-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ev = dbData.events.find(x => x.id === e.currentTarget.getAttribute('data-id'));
        if(ev) openEventModal(ev);
      });
    });

    document.getElementById('close-event-modal')?.addEventListener('click', () => evModal.classList.add('hidden'));

    document.getElementById('save-event-btn')?.addEventListener('click', async () => {
      const payload = {
        title: document.getElementById('ev-title').value || "Event",
        list_id: document.getElementById('ev-list').value || null,
        is_recurring: document.getElementById('ev-recurring').checked,
        start_time: document.getElementById('ev-start-time').value,
        end_time: document.getElementById('ev-end-time').value,
        color: dbData.lists.find(l => l.id === document.getElementById('ev-list').value)?.color || "#3498db"
      };

      if (payload.is_recurring) {
        payload.day_of_week = parseInt(document.getElementById('ev-day').value);
      } else {
        payload.date = document.getElementById('ev-start-date').value;
        payload.end_date = document.getElementById('ev-end-date').value;
      }

      const id = document.getElementById('ev-id').value;
      evModal.classList.add('hidden');

      if (id) {
        const idx = dbData.events.findIndex(x => x.id === id);
        Object.assign(dbData.events[idx], payload);
        renderUI();
        await supabase.from('custom_events').update(payload).eq('id', id);
      } else {
        const { data } = await supabase.from('custom_events').insert([payload]).select();
        if(data) dbData.events.push(data[0]);
        renderUI();
      }
    });

    // --- LOGIKA MODAL: EDIT EXAM ---
    const exModal = document.getElementById('edit-exam-modal');
    container.querySelectorAll('.edit-exam-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ex = dbData.exams.find(x => x.id === e.currentTarget.getAttribute('data-id'));
        if(ex) {
          document.getElementById('ex-id').value = ex.id;
          document.getElementById('ex-title').value = ex.title;
          document.getElementById('ex-date').value = ex.date;
          document.getElementById('ex-time').value = ex.time || "00:00";
          document.getElementById('ex-barrier').checked = ex.ignore_barrier || false;
          exModal.classList.remove('hidden');
        }
      });
    });
    document.getElementById('close-ex-modal')?.addEventListener('click', () => exModal.classList.add('hidden'));
    document.getElementById('save-ex-btn')?.addEventListener('click', async () => {
      const id = document.getElementById('ex-id').value;
      const payload = {
        title: document.getElementById('ex-title').value,
        date: document.getElementById('ex-date').value,
        time: document.getElementById('ex-time').value,
        ignore_barrier: document.getElementById('ex-barrier').checked
      };
      exModal.classList.add('hidden');
      const idx = dbData.exams.findIndex(x => x.id === id);
      if(idx >= 0) Object.assign(dbData.exams[idx], payload);
      renderUI();
      await supabase.from('exams').update(payload).eq('id', id);
    });

    // --- LOGIKA MODAL: MANAGE LISTS ---
    const listModal = document.getElementById('manage-lists-modal');
    document.getElementById('open-manage-lists')?.addEventListener('click', () => {
      document.getElementById('menu-dropdown').classList.add('hidden');
      listModal.classList.remove('hidden');
    });
    document.getElementById('close-lists-modal')?.addEventListener('click', () => listModal.classList.add('hidden'));
    
    document.getElementById('add-list-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('new-list-name').value;
      const color = document.getElementById('new-list-color').value;
      if(!name) return;
      const { data } = await supabase.from('event_lists').insert([{ name, color, list_type: 'event' }]).select();
      if(data) {
        dbData.lists.push(data[0]);
        document.getElementById('new-list-name').value = '';
        renderUI();
        document.getElementById('manage-lists-modal').classList.remove('hidden'); // trzymaj otwarte
      }
    });

    listModal.querySelectorAll('.del-list-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        dbData.lists = dbData.lists.filter(l => l.id !== id);
        renderUI();
        listModal.classList.remove('hidden');
        await supabase.from('event_lists').delete().eq('id', id);
      });
    });
  };

  // Pierwsze rysowanie
  renderUI();
}