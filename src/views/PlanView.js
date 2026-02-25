import { supabase } from '../api/supabase.js';

// Stan widoku (odpowiedniki @State)
let expandedDates = {};
let currentTopics = [];
let currentExams = [];
let currentSubjects = [];

export async function renderPlanView(container) {
  container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);"><i class="ph ph-spinner-gap" style="font-size: 32px; animation: spin 1s linear infinite;"></i></div>`;

  const today = new Date().toISOString().split('T')[0];

  // 1. POBIERANIE DANYCH
  const [ { data: topics }, { data: exams }, { data: subjects } ] = await Promise.all([
    supabase.from('topics').select('*'),
    supabase.from('exams').select('*'),
    supabase.from('subjects').select('*')
  ]);

  currentTopics = topics || [];
  currentExams = exams || [];
  currentSubjects = subjects || [];

  // Domyślnie rozwiń dzisiejszy dzień, jeśli nie był ustawiony (jak w .onAppear w SwiftUI)
  if (expandedDates[today] === undefined) {
    expandedDates[today] = true;
  }

  // Funkcja główna rysująca UI (będziemy ją wywoływać po zmianie stanu, by odświeżyć listę)
  const renderUI = () => {
    // 2. GRUPOWANIE DANYCH (Odpowiednik groupedPlan ze Swifta)
    const datesSet = new Set();
    currentTopics.forEach(t => t.scheduled_date && datesSet.add(t.scheduled_date));
    currentExams.forEach(e => e.date && datesSet.add(e.date));

    const groupedPlan = Array.from(datesSet)
      .filter(d => d >= today)
      .sort()
      .map(date => ({
        date,
        topics: currentTopics.filter(t => t.scheduled_date === date),
        exams: currentExams.filter(e => e.date === date)
      }));

    // 3. BUDOWA HTML DLA LISTY
    let listHTML = '';

    if (groupedPlan.length === 0) {
      // Pusty stan (Empty State)
      listHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <i class="ph ph-calendar-blank" style="font-size: 60px; color: var(--text-secondary); opacity: 0.5; margin-bottom: 15px;"></i>
          <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">No upcoming exams.</h3>
          <p style="color: var(--text-secondary); font-size: 14px;">Press + to add a new exam and topics to start planning.</p>
        </div>
      `;
    } else {
      groupedPlan.forEach(plan => {
        const isExpanded = expandedDates[plan.date] || false;
        const isToday = plan.date === today;
        const headerTitle = isToday ? `Today (${plan.date})` : plan.date;

        // Odpowiednik PlanHeaderView
        let badgesHTML = '';
        if (!isExpanded) {
          if (plan.topics.length > 0) {
            badgesHTML += `<span style="font-size: 10px; padding: 4px 8px; background: rgba(52, 152, 219, 0.15); color: var(--accent-blue); border-radius: 8px;">${plan.topics.length} topics</span>`;
          }
          if (plan.exams.length > 0) {
            const subjName = plan.exams[0].subject || "Unknown";
            badgesHTML += `<span style="font-size: 10px; font-weight: bold; padding: 4px 8px; background: rgba(231, 76, 60, 0.15); color: var(--accent-red); border-radius: 8px; display: flex; align-items: center; gap: 4px;"><i class="ph-fill ph-warning"></i> Exam: ${subjName}</span>`;
          }
        }

        listHTML += `
          <div style="margin-bottom: 15px;">
            <button class="plan-header-btn" data-date="${plan.date}" style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: none; border: none; padding: 10px 0; cursor: pointer;">
              <span style="font-size: 18px; font-weight: bold; color: var(--text-primary);">${headerTitle}</span>
              <div style="display: flex; align-items: center; gap: 10px;">
                ${badgesHTML}
                <i class="ph ph-caret-${isExpanded ? 'up' : 'down'}" style="color: var(--text-secondary);"></i>
              </div>
            </button>
        `;

        // Zawartość (Rozwinięta sekcja)
        if (isExpanded) {
          if (plan.topics.length === 0 && plan.exams.length === 0) {
            listHTML += `<p style="color: var(--text-secondary); font-size: 14px; padding: 10px;">No topics or exams scheduled.</p>`;
          } else {
            // Rysowanie Egzaminów
            plan.exams.forEach(exam => {
              listHTML += `
                <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--bg-secondary-grouped); border-radius: 12px; margin-bottom: 8px;">
                  <i class="ph-fill ph-flag" style="color: var(--accent-red); font-size: 18px;"></i>
                  <span style="font-size: 15px; font-weight: bold; color: var(--accent-red);">EXAM: ${exam.title} (${exam.subject || ""})</span>
                </div>
              `;
            });

            // Rysowanie Tematów (TopicRow)
            plan.topics.forEach(topic => {
              const parentExam = currentExams.find(e => e.id === topic.exam_id);
              const examNameStr = parentExam ? `${parentExam.subject || "Unknown"} - ${parentExam.title}` : "";
              const isDone = topic.status === 'done';
              
              listHTML += `
                <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--bg-secondary-grouped); border-radius: 12px; margin-bottom: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                  <button class="topic-toggle-btn" data-id="${topic.id}" data-status="${topic.status}" style="background: none; border: none; padding: 0; cursor: pointer; margin-top: 2px;">
                    <i class="${isDone ? 'ph-fill ph-check-circle' : 'ph ph-circle'}" style="font-size: 22px; color: ${isDone ? 'var(--accent-green)' : 'var(--text-secondary)'};"></i>
                  </button>
                  
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 16px; font-weight: 500; ${isDone ? 'text-decoration: line-through; color: var(--text-secondary);' : 'color: var(--text-primary);'}">${topic.name}</div>
                    ${examNameStr ? `<div style="font-size: 12px; font-weight: 500; color: var(--accent-blue); margin-top: 2px;">${examNameStr}</div>` : ''}
                    ${topic.note ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${topic.note}</div>` : ''}
                  </div>
                  
                  <div style="display: flex; gap: 8px;">
                     <button class="topic-edit-btn" data-id="${topic.id}" style="background: none; border: none; color: var(--accent-blue); font-size: 18px; cursor: pointer;"><i class="ph ph-pencil-simple"></i></button>
                     <button class="topic-delete-btn" data-id="${topic.id}" style="background: none; border: none; color: var(--accent-red); font-size: 18px; cursor: pointer;"><i class="ph ph-trash"></i></button>
                  </div>
                </div>
              `;
            });
          }
        }
        listHTML += `</div>`; // Zamknięcie sekcji dnia
      });
    }

    // 4. WSTAWIANIE GŁÓWNEGO WIDOKU
    container.innerHTML = `
      <div style="padding: 20px; padding-bottom: 100px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h1 style="font-size: 34px; font-weight: bold;">Study Plan</h1>
          
          <div style="display: flex; gap: 15px;">
            <button id="add-exam-btn" style="background: none; border: none; color: var(--accent-blue); font-size: 24px; cursor: pointer;"><i class="ph ph-plus-square"></i></button>
            <button id="planner-menu-btn" style="background: none; border: none; color: var(--accent-blue); font-size: 24px; cursor: pointer;"><i class="ph ph-dots-three-circle"></i></button>
          </div>
        </div>

        <div>${listHTML}</div>
      </div>

      <div id="add-exam-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: flex-end; justify-content: center;">
        <div style="background: var(--bg-system-grouped); width: 100%; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 20px; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <button id="close-exam-modal" style="color: var(--accent-blue); font-size: 16px; border: none; background: none; cursor: pointer;">Cancel</button>
            <h3 style="font-weight: bold; font-size: 16px;">Add New Exam</h3>
            <button id="save-exam-btn" style="color: var(--accent-blue); font-weight: bold; font-size: 16px; border: none; background: none; cursor: pointer;">Save</button>
          </div>
          
          <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 15px;">
             <input type="text" id="exam-subject-input" placeholder="Subject Name (or type manually)" style="width: 100%; border: none; background: transparent; color: var(--text-primary); font-size: 16px; padding: 8px 0; outline: none; border-bottom: 1px solid var(--bg-system-grouped); margin-bottom: 5px;">
             <input type="text" id="exam-title-input" placeholder="Type / Title (e.g. Midterm)" value="Exam" style="width: 100%; border: none; background: transparent; color: var(--text-primary); font-size: 16px; padding: 8px 0; outline: none;">
          </div>

          <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 15px;">
             <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                <span>Date</span>
                <input type="date" id="exam-date-input" style="background: transparent; border: none; color: var(--accent-blue); font-size: 16px; outline: none;">
             </div>
             <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                <span>Time</span>
                <input type="time" id="exam-time-input" style="background: transparent; border: none; color: var(--accent-blue); font-size: 16px; outline: none;">
             </div>
             <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                <span>Ignore scheduling barrier</span>
                <input type="checkbox" id="exam-barrier-input" style="width: 20px; height: 20px;">
             </div>
             <p style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">If checked, this exam won't block scheduling studying sessions for other, later exams.</p>
          </div>

          <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 20px;">
             <span style="font-size: 14px; font-weight: bold;">Topics</span>
             <textarea id="exam-topics-input" placeholder="Enter one topic per line. Numbering will be removed automatically." style="width: 100%; height: 100px; border: none; background: transparent; color: var(--text-primary); font-size: 16px; outline: none; margin-top: 10px; resize: none;"></textarea>
          </div>
        </div>
      </div>
    `;

    // 5. DODAWANIE EVENT LISTENERÓW (Delegacja zdarzeń)
    
    // Zwijanie/Rozwijanie Dni
    container.querySelectorAll('.plan-header-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const date = e.currentTarget.getAttribute('data-date');
        expandedDates[date] = !expandedDates[date];
        renderUI(); // Przerenderuj po zmianie
      });
    });

    // Zaznaczanie Tematów (Done/Undone)
    container.querySelectorAll('.topic-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const currentStatus = e.currentTarget.getAttribute('data-status');
        const newStatus = currentStatus === 'done' ? 'todo' : 'done';
        
        // Aktualizacja lokalna dla szybkości UI
        const t = currentTopics.find(x => x.id === id);
        if (t) t.status = newStatus;
        renderUI();

        // Zapis w bazie
        await supabase.from('topics').update({ status: newStatus }).eq('id', id);
      });
    });

    // Usuwanie tematów
    container.querySelectorAll('.topic-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if(confirm("Are you sure you want to delete this topic?")) {
          currentTopics = currentTopics.filter(x => x.id !== id);
          renderUI();
          await supabase.from('topics').delete().eq('id', id);
        }
      });
    });

    // Obsługa Modala Add Exam
    const addExamModal = document.getElementById('add-exam-modal');
    document.getElementById('add-exam-btn').addEventListener('click', () => {
      addExamModal.classList.remove('hidden');
      document.getElementById('exam-date-input').value = today;
    });
    document.getElementById('close-exam-modal').addEventListener('click', () => {
      addExamModal.classList.add('hidden');
    });

    document.getElementById('save-exam-btn').addEventListener('click', async () => {
      const subj = document.getElementById('exam-subject-input').value;
      const title = document.getElementById('exam-title-input').value;
      const date = document.getElementById('exam-date-input').value;
      const time = document.getElementById('exam-time-input').value;
      const barrier = document.getElementById('exam-barrier-input').checked;
      const rawTopics = document.getElementById('exam-topics-input').value;

      if (!subj || !title) return alert("Subject and Title are required");

      addExamModal.classList.add('hidden');
      // Tutaj w przyszłości podepniesz Supabase Edge Function lub zaimplementujesz logikę 'saveNewExam'
      alert("This will create Exam and its Topics in DB! (Logic to be hooked up)");
    });

    // Menu Plannera (Zamiast popupa, na razie prosty alert)
    document.getElementById('planner-menu-btn').addEventListener('click', () => {
      const action = prompt("Planner Algorithm: \n1 - Plan Unscheduled\n2 - Re-Plan Everything\n(Type 1 or 2)");
      if (action === "1" || action === "2") {
        alert("This will call the algorithm in Supabase (Edge Function)!");
      }
    });

  };

  // Pierwsze wyrysowanie
  renderUI();
}