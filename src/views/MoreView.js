import { supabase } from '../api/supabase.js';
import { renderFocusView } from './FocusView.js';
import { renderHistoryView } from './HistoryView.js';
import { renderGradesView } from './GradesView.js';
import { renderSubjectsView } from './SubjectsView.js'

export async function renderMoreView(container) {
  // ==========================================
  // 1. GŁÓWNE MENU (MoreView)
  // ==========================================
  const renderMainMenu = () => {
    // Helper do tworzenia rzędów listy na wzór iOS
    const createRow = (id, icon, text, color = "var(--text-primary)", showChevron = true) => `
      <button id="${id}" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: var(--bg-secondary-grouped); border: none; border-bottom: 1px solid var(--bg-system-grouped); cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <i class="${icon}" style="font-size: 22px; color: ${color};"></i>
          <span style="font-size: 16px; font-weight: 500; color: var(--text-primary);">${text}</span>
        </div>
        ${showChevron ? `<i class="ph ph-caret-right" style="color: var(--text-secondary); font-size: 16px;"></i>` : ''}
      </button>
    `;

    container.innerHTML = `
      <div style="padding: 20px; padding-bottom: 100px;">
        <h1 style="font-size: 34px; font-weight: bold; margin-bottom: 20px;">More</h1>

        <h3 style="font-size: 13px; font-weight: bold; color: var(--text-secondary); margin-left: 15px; margin-bottom: 8px; text-transform: uppercase;">Academic</h3>
        <div style="border-radius: 12px; overflow: hidden; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
          ${createRow('btn-timer', 'ph-fill ph-timer', 'Timer', '#5856d6')}
          ${createRow('btn-grades', 'ph-fill ph-graduation-cap', 'Grades', '#3498db')}
          ${createRow('btn-subjects', 'ph-fill ph-book', 'Subjects', '#e67e22')}
        </div>

        <h3 style="font-size: 13px; font-weight: bold; color: var(--text-secondary); margin-left: 15px; margin-bottom: 8px; text-transform: uppercase;">Tools & Progress</h3>
        <div style="border-radius: 12px; overflow: hidden; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
          ${createRow('btn-achievements', 'ph-fill ph-trophy', 'Achievements', '#f1c40f')}
          ${createRow('btn-days-off', 'ph-fill ph-calendar-minus', 'Days Off', '#e74c3c')}
          ${createRow('btn-history', 'ph-fill ph-clock-counter-clockwise', 'History', '#2ecc71')}
        </div>

        <h3 style="font-size: 13px; font-weight: bold; color: var(--text-secondary); margin-left: 15px; margin-bottom: 8px; text-transform: uppercase;">Application</h3>
        <div style="border-radius: 12px; overflow: hidden; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
          ${createRow('btn-settings', 'ph-fill ph-gear', 'Settings', 'gray')}
          ${createRow('btn-logout', 'ph-bold ph-sign-out', 'Log Out', 'var(--accent-red)', false)}
        </div>
      </div>
    `;

    // Podpinanie logiki
    document.getElementById('btn-timer').addEventListener('click', () => renderFocusView(container, renderMainMenu));
    document.getElementById('btn-grades').addEventListener('click', () => renderGradesView(container, renderMainMenu));
    document.getElementById('btn-subjects').addEventListener('click', () => renderSubjectsView(container, renderMainMenu));
    document.getElementById('btn-history').addEventListener('click', () => renderHistoryView(container, renderMainMenu));
    document.getElementById('btn-days-off').addEventListener('click', renderDaysOffView);
    document.getElementById('btn-logout').addEventListener('click', async () => {
      if (confirm("Are you sure you want to log out?")) {
        await supabase.auth.signOut();
        window.location.reload();
      }
    });

    // Placeholdery dla pozostałych ekranów
    ['btn-achievements', 'btn-settings'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => alert("This view will be implemented in the next step!"));
    });
  };

  // ==========================================
  // 2. EKRAN: DAYS OFF (DaysOffView.swift)
  // ==========================================
  const renderDaysOffView = async () => {
    container.innerHTML = `<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner-gap" style="font-size: 32px; animation: spin 1s linear infinite;"></i></div>`;

    // Pobieranie dni wolnych
    const { data: blockedDates } = await supabase.from('blocked_dates').select('*');
    
    const today = new Date().toISOString().split('T')[0];
    const futureDates = (blockedDates || [])
      .filter(bd => bd.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Odświeżanie ekranu Days Off
    const refreshUI = () => {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--bg-secondary-grouped); border-bottom: 1px solid var(--bg-system-grouped);">
            <button id="back-to-more" style="background: none; border: none; font-size: 16px; color: var(--accent-blue); display: flex; align-items: center; gap: 5px; cursor: pointer;">
              <i class="ph-bold ph-caret-left"></i> More
            </button>
            <h2 style="font-size: 16px; font-weight: bold; position: absolute; left: 50%; transform: translateX(-50%);">Days Off</h2>
            <button id="add-day-btn" style="background: none; border: none; font-size: 24px; color: var(--accent-blue); cursor: pointer;">
              <i class="ph-fill ph-plus-circle"></i>
            </button>
          </div>

          <div style="padding: 20px; flex: 1; overflow-y: auto;">
            <h3 style="font-size: 13px; font-weight: bold; color: var(--text-secondary); margin-left: 15px; margin-bottom: 8px; text-transform: uppercase;">Upcoming Days Off</h3>
            <div style="background: var(--bg-secondary-grouped); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
              ${futureDates.length === 0 
                ? `<div style="padding: 15px; color: var(--text-secondary); font-style: italic;">No upcoming days off</div>`
                : futureDates.map(bd => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid var(--bg-system-grouped);">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="ph-fill ph-calendar-minus" style="color: var(--accent-red); font-size: 20px;"></i>
                        <span style="font-size: 16px; font-weight: 500;">${bd.date}</span>
                      </div>
                      <button class="delete-day-btn" data-date="${bd.date}" style="color: var(--accent-red); background: none; border: none; font-size: 20px; cursor: pointer;">
                        <i class="ph ph-trash"></i>
                      </button>
                    </div>
                  `).join('')
              }
            </div>
          </div>
        </div>

        <div id="add-day-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: flex-end; justify-content: center;">
          <div style="background: var(--bg-system-grouped); width: 100%; border-radius: 20px 20px 0 0; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <button id="close-day-modal" style="color: var(--accent-blue); font-size: 16px; border: none; background: none; cursor: pointer;">Cancel</button>
              <h3 style="font-weight: bold; font-size: 16px;">Block New Date</h3>
              <button id="save-day-btn" style="color: var(--accent-blue); font-weight: bold; font-size: 16px; border: none; background: none; cursor: pointer;">Add</button>
            </div>

            <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 15px; text-align: center; margin-bottom: 20px;">
              <input type="date" id="new-date-input" value="${today}" style="font-size: 20px; padding: 10px; border: none; background: transparent; color: var(--accent-blue); outline: none;">
            </div>

            <div style="margin-bottom: 20px; padding: 0 10px;">
              <span style="font-size: 12px; color: var(--text-secondary);">Active blocks:</span>
              <p style="font-size: 12px; color: gray;">${futureDates.map(d => d.date).join(', ') || 'None'}</p>
            </div>
          </div>
        </div>
      `;

      // Eventy wewnątrz Days Off
      document.getElementById('back-to-more').addEventListener('click', renderMainMenu);
      
      const modal = document.getElementById('add-day-modal');
      document.getElementById('add-day-btn').addEventListener('click', () => modal.classList.remove('hidden'));
      document.getElementById('close-day-modal').addEventListener('click', () => modal.classList.add('hidden'));

      // Usuwanie
      container.querySelectorAll('.delete-day-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const dateToRemove = e.currentTarget.getAttribute('data-date');
          if (confirm(`Remove ${dateToRemove} from days off?`)) {
            // Update UI
            const idx = futureDates.findIndex(d => d.date === dateToRemove);
            if (idx > -1) futureDates.splice(idx, 1);
            refreshUI();
            
            // Update DB
            await supabase.from('blocked_dates').delete().eq('date', dateToRemove);
          }
        });
      });

      // Dodawanie (Z logiką sprawdzania duplikatów z iOS)
      document.getElementById('save-day-btn').addEventListener('click', async () => {
        const newDate = document.getElementById('new-date-input').value;
        if (!newDate) return;

        if (futureDates.some(d => d.date === newDate)) {
          alert(`Date Already Blocked:\nThe date ${newDate} is already on your list of days off.`);
          return;
        }

        modal.classList.add('hidden');
        
        // Update DB
        const { data, error } = await supabase.from('blocked_dates').insert([{ date: newDate }]).select();
        
        if (data && data.length > 0) {
          // Update UI
          futureDates.push(data[0]);
          futureDates.sort((a, b) => a.date.localeCompare(b.date));
          refreshUI();
        }
      });
    };

    refreshUI();
  };

  // Start - wyświetlamy Główne Menu
  renderMainMenu();
}