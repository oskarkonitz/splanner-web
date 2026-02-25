import { supabase } from '../api/supabase.js';

export async function renderHistoryView(container, onBack) {
  container.innerHTML = `<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner-gap" style="font-size: 32px; animation: spin 1s linear infinite;"></i></div>`;

  let selectedTab = 0; // 0 = Tasks, 1 = Topics Archive
  let selectedSemesterID = null;

  // 1. POBIERANIE DANYCH
  const [ { data: tasks }, { data: exams }, { data: topics }, { data: subjects }, { data: semesters } ] = await Promise.all([
    supabase.from('daily_tasks').select('*').eq('status', 'done'),
    supabase.from('exams').select('*'),
    supabase.from('topics').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('semesters').select('*')
  ]);

  const todayStr = new Date().toISOString().split('T')[0];

  const renderUI = () => {
    let contentHTML = '';

    // --- ZAKŁADKA 0: TASKS LOGBOOK ---
    if (selectedTab === 0) {
      const pastTasks = (tasks || []).filter(t => t.date && t.date < todayStr);
      
      if (pastTasks.length === 0) {
        contentHTML = `
          <div style="text-align: center; padding: 60px 20px;">
            <i class="ph-fill ph-tray" style="font-size: 50px; color: var(--text-secondary); opacity: 0.4; margin-bottom: 15px;"></i>
            <h3 style="font-size: 18px; font-weight: bold;">No task history yet.</h3>
            <p style="color: var(--text-secondary); font-size: 14px;">Your completed past tasks will appear here.</p>
          </div>
        `;
      } else {
        // Grupowanie po dacie
        const grouped = {};
        pastTasks.forEach(t => {
          if (!grouped[t.date]) grouped[t.date] = [];
          grouped[t.date].push(t);
        });
        
        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
        
        contentHTML = sortedDates.map(date => `
          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; font-weight: bold; color: var(--text-primary); margin-left: 10px; margin-bottom: 8px;">${date}</h4>
            <div style="background: var(--bg-secondary-grouped); border-radius: 12px; overflow: hidden;">
              ${grouped[date].map(task => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; border-bottom: 1px solid var(--bg-system-grouped);">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 4px; height: 25px; background-color: ${task.color || '#3498db'}; opacity: 0.5; border-radius: 2px;"></div>
                    <i class="ph-fill ph-check-circle" style="color: var(--accent-green); opacity: 0.6; font-size: 20px;"></i>
                    <div>
                      <div style="text-decoration: line-through; color: var(--text-secondary); font-size: 16px;">${task.content}</div>
                      ${task.note ? `<div style="font-size: 12px; color: gray;">${task.note}</div>` : ''}
                    </div>
                  </div>
                  <button class="restore-task-btn" data-id="${task.id}" style="color: var(--accent-blue); background: rgba(52, 152, 219, 0.1); border: none; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
                    <i class="ph-bold ph-arrow-u-up-left"></i> Restore
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');
      }
    } 
    // --- ZAKŁADKA 1: TOPICS ARCHIVE ---
    else {
      let pastExams = (exams || []).filter(e => e.date < todayStr);
      
      if (selectedSemesterID) {
        pastExams = pastExams.filter(e => {
          const subj = subjects.find(s => s.id === e.subject_id);
          return subj && subj.semester_id === selectedSemesterID;
        });
      }

      if (pastExams.length === 0) {
        contentHTML = `
          <div style="text-align: center; padding: 60px 20px;">
            <i class="ph-fill ph-archive-box" style="font-size: 50px; color: var(--text-secondary); opacity: 0.4; margin-bottom: 15px;"></i>
            <h3 style="font-size: 18px; font-weight: bold;">Archive is empty.</h3>
            <p style="color: var(--text-secondary); font-size: 14px;">Exams matching your filters will appear here.</p>
          </div>
        `;
      } else {
        // Grupowanie po Subject
        const grouped = {};
        pastExams.forEach(e => {
          const sName = subjects.find(s => s.id === e.subject_id)?.name || e.subject || "Unknown Subject";
          if (!grouped[sName]) grouped[sName] = [];
          grouped[sName].push(e);
        });

        const sortedSubjects = Object.keys(grouped).sort();

        contentHTML = sortedSubjects.map(subjName => `
          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; font-weight: bold; color: var(--text-primary); margin-left: 10px; margin-bottom: 8px;">${subjName}</h4>
            
            ${grouped[subjName].sort((a,b) => b.date.localeCompare(a.date)).map(exam => {
              const examColor = exam.color || '#3498db';
              const examTopics = (topics || []).filter(t => t.exam_id === exam.id);
              const doneCount = examTopics.filter(t => t.status === 'done').length;
              const progPercent = examTopics.length > 0 ? Math.round((doneCount / examTopics.length) * 100) : 0;
              
              let topicsList = examTopics.length === 0 ? `<p style="font-size: 12px; color: gray; padding: 5px;">No topics recorded.</p>` : examTopics.map(t => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0;">
                  <i class="${t.status === 'done' ? 'ph-fill ph-check-circle' : 'ph ph-circle'}" style="color: ${t.status === 'done' ? 'var(--accent-green)' : 'gray'};"></i>
                  <span style="font-size: 14px; ${t.status === 'done' ? 'text-decoration: line-through; color: gray;' : ''}">${t.name}</span>
                </div>
              `).join('');

              return `
                <details style="background: var(--bg-secondary-grouped); border-radius: 12px; margin-bottom: 10px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                  <summary style="padding: 15px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; outline: none; list-style: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                      <span style="font-weight: bold; color: ${examColor};">${exam.title}</span>
                      <span style="font-size: 10px; font-weight: bold; background: rgba(142,142,147,0.2); padding: 4px 8px; border-radius: 6px;">${exam.date}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 12px; color: gray;">Progress: ${doneCount}/${examTopics.length}</span>
                      <div style="flex: 1; height: 6px; background: rgba(142,142,147,0.2); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${progPercent}%; background: ${progPercent === 100 ? 'var(--accent-green)' : examColor};"></div>
                      </div>
                      <span style="font-size: 10px; font-weight: bold; color: ${progPercent === 100 ? 'var(--accent-green)' : 'gray'};">${progPercent}%</span>
                    </div>
                  </summary>
                  <div style="padding: 0 15px 15px 15px; border-top: 1px solid var(--bg-system-grouped);">
                    ${topicsList}
                  </div>
                </details>
              `;
            }).join('')}
          </div>
        `).join('');
      }
    }

    const semFilterOptions = (semesters || []).map(s => 
      `<option value="${s.id}" ${selectedSemesterID === s.id ? 'selected' : ''}>${s.name} ${s.is_current ? '(Current)' : ''}</option>`
    ).join('');

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; background: var(--bg-system-grouped);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--bg-secondary-grouped); border-bottom: 1px solid var(--bg-system-grouped);">
          <button id="history-back-btn" style="background: none; border: none; font-size: 16px; color: var(--accent-blue); display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <i class="ph-bold ph-caret-left"></i> More
          </button>
          <h2 style="font-size: 16px; font-weight: bold;">History</h2>
          <div style="width: 60px; text-align: right;">
            ${selectedTab === 1 ? `
              <select id="hist-sem-filter" style="background: transparent; color: var(--accent-blue); border: none; font-size: 14px; outline: none; width: 25px; direction: rtl;">
                <option value="">All</option>
                ${semFilterOptions}
              </select>
            ` : ''}
          </div>
        </div>

        <div style="padding: 15px 20px;">
          <div style="display: flex; background: var(--bg-secondary-grouped); padding: 4px; border-radius: 8px;">
            <button id="tab-tasks" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: ${selectedTab === 0 ? 'var(--bg-system-grouped)' : 'transparent'}; font-weight: ${selectedTab === 0 ? 'bold' : 'normal'}; cursor: pointer;">Tasks Logbook</button>
            <button id="tab-topics" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: ${selectedTab === 1 ? 'var(--bg-system-grouped)' : 'transparent'}; font-weight: ${selectedTab === 1 ? 'bold' : 'normal'}; cursor: pointer;">Topics Archive</button>
          </div>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 0 20px 100px 20px;">
          ${contentHTML}
        </div>
      </div>
    `;

    attachListeners();
  };

  const attachListeners = () => {
    document.getElementById('history-back-btn').addEventListener('click', onBack);
    
    document.getElementById('tab-tasks').addEventListener('click', () => { selectedTab = 0; renderUI(); });
    document.getElementById('tab-topics').addEventListener('click', () => { selectedTab = 1; renderUI(); });

    const filter = document.getElementById('hist-sem-filter');
    if (filter) filter.addEventListener('change', (e) => { selectedSemesterID = e.target.value; renderUI(); });

    // Restore Task Logic
    container.querySelectorAll('.restore-task-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        
        // Zaktualizuj UI optymistycznie
        const taskObj = tasks.find(t => t.id === id);
        if (taskObj) taskObj.date = todayStr; // Ukryje go z historii
        renderUI();

        // Zaktualizuj Bazę Danych (przywrócenie jako status 'todo' na dzisiaj)
        await supabase.from('daily_tasks').update({ status: 'todo', date: todayStr }).eq('id', id);
      });
    });
  };

  renderUI();
}