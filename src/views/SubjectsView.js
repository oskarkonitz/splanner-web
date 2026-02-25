import { supabase } from '../api/supabase.js';

export async function renderSubjectsView(container, onBack) {
  container.innerHTML = `<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner-gap" style="font-size: 32px; animation: spin 1s linear infinite;"></i></div>`;

  let selectedSemesterID = "ALL";
  
  // 1. POBIERANIE DANYCH
  const [ { data: semesters }, { data: subjects }, { data: entries } ] = await Promise.all([
    supabase.from('semesters').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('schedule_entries').select('*')
  ]);

  const db = {
    semesters: semesters || [],
    subjects: subjects || [],
    entries: entries || []
  };

  const currentSem = db.semesters.find(s => s.is_current);
  if (currentSem) selectedSemesterID = currentSem.id;

  // ==========================================
  // 2. GŁÓWNY WIDOK: LISTA PRZEDMIOTÓW
  // ==========================================
  const renderMainView = () => {
    let filteredSubjects = db.subjects;
    if (selectedSemesterID !== "ALL") {
      filteredSubjects = db.subjects.filter(s => s.semester_id === selectedSemesterID);
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; background: var(--bg-system-grouped);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--bg-secondary-grouped); border-bottom: 1px solid var(--bg-system-grouped);">
          <button id="subj-back-btn" style="background: none; border: none; font-size: 16px; color: var(--accent-blue); display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <i class="ph-bold ph-caret-left"></i> More
          </button>
          <h2 style="font-size: 16px; font-weight: bold;">Subjects</h2>
          <button id="add-subject-btn" style="background: none; border: none; font-size: 24px; color: var(--accent-blue); cursor: pointer;"><i class="ph-fill ph-plus-circle"></i></button>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 100px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--bg-secondary-grouped); padding: 10px 15px; border-radius: 12px;">
             <span style="font-size: 14px; color: var(--text-secondary);">Semester:</span>
             <select id="subj-sem-selector" style="background: transparent; border: none; font-size: 16px; font-weight: bold; outline: none; text-align: right; color: var(--text-primary);">
               <option value="ALL" ${selectedSemesterID === 'ALL' ? 'selected' : ''}>All Semesters</option>
               ${db.semesters.map(s => `<option value="${s.id}" ${selectedSemesterID === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
             </select>
          </div>

          <div style="background: var(--bg-secondary-grouped); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
            ${filteredSubjects.length === 0 ? `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No subjects found.</div>` : ''}
            ${filteredSubjects.map(sub => `
              <div class="subject-row" data-id="${sub.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 15px; border-bottom: 1px solid var(--bg-system-grouped); cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 4px; height: 25px; background-color: ${sub.color || '#3498db'}; border-radius: 2px;"></div>
                  <span style="font-size: 16px; font-weight: 500;">${sub.name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  ${sub.weight ? `<span style="font-size: 12px; color: var(--text-secondary); background: var(--bg-system-grouped); padding: 4px 8px; border-radius: 6px;">ECTS: ${sub.weight}</span>` : ''}
                  <i class="ph-bold ph-caret-right" style="color: var(--text-secondary);"></i>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.getElementById('subj-back-btn').addEventListener('click', onBack);
    document.getElementById('subj-sem-selector').addEventListener('change', (e) => {
      selectedSemesterID = e.target.value;
      renderMainView();
    });

    document.getElementById('add-subject-btn').addEventListener('click', () => openSubjectForm(null));

    container.querySelectorAll('.subject-row').forEach(row => {
      row.addEventListener('click', () => {
        const sub = db.subjects.find(s => s.id === row.getAttribute('data-id'));
        if (sub) renderSubjectDetail(sub);
      });
    });
  };

  // ==========================================
  // 3. SZCZEGÓŁY I ZARZĄDZANIE ZAJĘCIAMI
  // ==========================================
  const renderSubjectDetail = (subject) => {
    const subEntries = db.entries.filter(e => e.subject_id === subject.id);
    const daysArr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; background: var(--bg-system-grouped);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--bg-secondary-grouped); border-bottom: 1px solid var(--bg-system-grouped);">
          <button id="det-back-btn" style="background: none; border: none; font-size: 16px; color: var(--accent-blue); display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <i class="ph-bold ph-caret-left"></i> Subjects
          </button>
          <h2 style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${subject.short_name || subject.name}</h2>
          <button id="edit-sub-btn" style="background: none; border: none; font-size: 16px; color: var(--accent-blue); font-weight: bold; cursor: pointer;">Edit</button>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 100px;">
          
          <h3 style="font-size: 13px; font-weight: bold; color: var(--text-secondary); margin-left: 10px; margin-bottom: 8px; text-transform: uppercase;">Classes / Schedule</h3>
          <div style="background: var(--bg-secondary-grouped); border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
            ${subEntries.length === 0 ? `<div style="padding: 15px; color: gray; font-style: italic;">No classes scheduled.</div>` : ''}
            ${subEntries.map(e => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid var(--bg-system-grouped);">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="background: ${subject.color || '#3498db'}26; color: ${subject.color || '#3498db'}; font-weight: bold; padding: 6px 10px; border-radius: 8px; text-align: center; width: 45px;">
                    ${daysArr[e.day_of_week]}
                  </div>
                  <div>
                    <div style="font-weight: bold; font-size: 16px;">${e.start_time} - ${e.end_time}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${e.type || 'Class'} ${e.room ? `• Room ${e.room}` : ''}</div>
                  </div>
                </div>
                <div style="display: flex; gap: 10px;">
                  <button class="edit-entry-btn" data-id="${e.id}" style="color: var(--accent-blue); background: none; border: none; font-size: 20px; cursor: pointer;"><i class="ph-fill ph-pencil-simple"></i></button>
                  <button class="delete-entry-btn" data-id="${e.id}" style="color: var(--accent-red); background: none; border: none; font-size: 20px; cursor: pointer;"><i class="ph-fill ph-trash"></i></button>
                </div>
              </div>
            `).join('')}
            <button id="add-entry-btn" style="width: 100%; padding: 15px; background: none; border: none; color: var(--accent-blue); font-weight: bold; font-size: 16px; cursor: pointer; border-top: 1px solid var(--bg-system-grouped);">
              <i class="ph-bold ph-plus"></i> Add Class Slot
            </button>
          </div>

          <button id="delete-sub-btn" style="width: 100%; padding: 15px; background: var(--bg-secondary-grouped); color: var(--accent-red); border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer;">
            Delete Subject
          </button>
        </div>
      </div>
      <div id="sub-form-container"></div>
    `;

    document.getElementById('det-back-btn').addEventListener('click', renderMainView);
    document.getElementById('edit-sub-btn').addEventListener('click', () => openSubjectForm(subject));
    document.getElementById('add-entry-btn').addEventListener('click', () => openEntryForm(subject.id, null));

    container.querySelectorAll('.edit-entry-btn').forEach(b => b.addEventListener('click', (e) => {
      const entry = db.entries.find(x => x.id === e.currentTarget.getAttribute('data-id'));
      if(entry) openEntryForm(subject.id, entry);
    }));

    container.querySelectorAll('.delete-entry-btn').forEach(b => b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if(confirm("Delete this class slot?")) {
        db.entries = db.entries.filter(x => x.id !== id);
        renderSubjectDetail(subject);
        await supabase.from('schedule_entries').delete().eq('id', id);
      }
    }));

    document.getElementById('delete-sub-btn').addEventListener('click', async () => {
      if(confirm(`Are you sure you want to delete ${subject.name}? This will remove all related grades and classes.`)) {
        db.subjects = db.subjects.filter(s => s.id !== subject.id);
        renderMainView();
        await supabase.from('subjects').delete().eq('id', subject.id);
      }
    });

    // -------- FORMULARZ: Klasy (Schedule Entry) --------
    const openEntryForm = (subID, entryObj) => {
      const isEdit = entryObj !== null;
      document.getElementById('sub-form-container').innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2500; display: flex; align-items: flex-end;">
          <div style="background: var(--bg-system-grouped); width: 100%; padding: 20px; border-radius: 20px 20px 0 0;">
             <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
               <button id="c-ent-btn" style="color: var(--accent-blue); background: none; border: none;">Cancel</button>
               <h3 style="font-weight: bold;">${isEdit ? 'Edit Slot' : 'New Slot'}</h3>
               <button id="s-ent-btn" style="color: var(--accent-blue); font-weight: bold; background: none; border: none;">Save</button>
             </div>
             <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px;">
               <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                 <span>Day of Week</span>
                 <select id="e-day" style="border: none; background: transparent; color: var(--accent-blue); outline: none; font-weight: bold;">
                   <option value="0" ${isEdit && entryObj.day_of_week === 0 ? 'selected' : ''}>Monday</option>
                   <option value="1" ${isEdit && entryObj.day_of_week === 1 ? 'selected' : ''}>Tuesday</option>
                   <option value="2" ${isEdit && entryObj.day_of_week === 2 ? 'selected' : ''}>Wednesday</option>
                   <option value="3" ${isEdit && entryObj.day_of_week === 3 ? 'selected' : ''}>Thursday</option>
                   <option value="4" ${isEdit && entryObj.day_of_week === 4 ? 'selected' : ''}>Friday</option>
                   <option value="5" ${isEdit && entryObj.day_of_week === 5 ? 'selected' : ''}>Saturday</option>
                   <option value="6" ${isEdit && entryObj.day_of_week === 6 ? 'selected' : ''}>Sunday</option>
                 </select>
               </div>
               <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                 <span>Start Time</span><input type="time" id="e-start" value="${isEdit ? entryObj.start_time : '08:00'}" style="border: none; outline: none; color: var(--accent-blue);">
               </div>
               <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                 <span>End Time</span><input type="time" id="e-end" value="${isEdit ? entryObj.end_time : '09:30'}" style="border: none; outline: none; color: var(--accent-blue);">
               </div>
               <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                 <span>Type (e.g. Lecture)</span><input type="text" id="e-type" value="${isEdit ? entryObj.type || '' : ''}" style="border: none; outline: none; text-align: right;">
               </div>
               <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                 <span>Room</span><input type="text" id="e-room" value="${isEdit ? entryObj.room || '' : ''}" style="border: none; outline: none; text-align: right;">
               </div>
             </div>
          </div>
        </div>
      `;
      document.getElementById('c-ent-btn').addEventListener('click', () => document.getElementById('sub-form-container').innerHTML = '');
      document.getElementById('s-ent-btn').addEventListener('click', async () => {
        const payload = {
          subject_id: subID,
          day_of_week: parseInt(document.getElementById('e-day').value),
          start_time: document.getElementById('e-start').value,
          end_time: document.getElementById('e-end').value,
          type: document.getElementById('e-type').value,
          room: document.getElementById('e-room').value
        };
        document.getElementById('sub-form-container').innerHTML = '';
        if(isEdit) {
          Object.assign(entryObj, payload);
          renderSubjectDetail(subject);
          await supabase.from('schedule_entries').update(payload).eq('id', entryObj.id);
        } else {
          const { data } = await supabase.from('schedule_entries').insert([payload]).select();
          if(data) db.entries.push(data[0]);
          renderSubjectDetail(subject);
        }
      });
    };
  };

  // ==========================================
  // 4. FORMULARZ PRZEDMIOTU (Add/Edit)
  // ==========================================
  const openSubjectForm = (subjectObj) => {
    const isEdit = subjectObj !== null;
    container.innerHTML += `
      <div id="subject-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 3000; display: flex; align-items: flex-end;">
        <div style="background: var(--bg-system-grouped); width: 100%; padding: 20px; border-radius: 20px 20px 0 0; max-height: 90vh; overflow-y: auto;">
           <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
             <button id="c-sub-btn" style="color: var(--accent-blue); background: none; border: none;">Cancel</button>
             <h3 style="font-weight: bold;">${isEdit ? 'Edit Subject' : 'New Subject'}</h3>
             <button id="s-sub-btn" style="color: var(--accent-blue); font-weight: bold; background: none; border: none;">Save</button>
           </div>
           
           <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 15px;">
             <input type="text" id="s-name" value="${isEdit ? subjectObj.name : ''}" placeholder="Full Name (e.g. Mathematics)" style="width: 100%; border: none; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped); outline: none;">
             <input type="text" id="s-short" value="${isEdit ? subjectObj.short_name || '' : ''}" placeholder="Short Name (e.g. Math)" style="width: 100%; border: none; padding: 10px 0; outline: none;">
           </div>

           <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 15px;">
             <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
               <span>Semester</span>
               <select id="s-sem" style="border: none; background: transparent; outline: none; color: var(--accent-blue);">
                 ${db.semesters.map(s => `<option value="${s.id}" ${(isEdit ? subjectObj.semester_id : selectedSemesterID) === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
               </select>
             </div>
             <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-system-grouped);">
               <span>ECTS / Weight</span>
               <input type="number" id="s-weight" value="${isEdit ? subjectObj.weight || 0 : 0}" style="border: none; outline: none; text-align: right;">
             </div>
             <div style="display: flex; justify-content: space-between; padding: 10px 0; align-items: center;">
               <span>Color</span>
               <input type="color" id="s-color" value="${isEdit ? subjectObj.color || '#3498db' : '#3498db'}" style="width: 30px; height: 30px; border: none; outline: none;">
             </div>
           </div>
        </div>
      </div>
    `;

    document.getElementById('c-sub-btn').addEventListener('click', () => document.getElementById('subject-modal').remove());
    document.getElementById('s-sub-btn').addEventListener('click', async () => {
      const name = document.getElementById('s-name').value;
      if (!name) return;

      const payload = {
        name: name,
        short_name: document.getElementById('s-short').value || null,
        semester_id: document.getElementById('s-sem').value,
        weight: parseFloat(document.getElementById('s-weight').value) || 0,
        color: document.getElementById('s-color').value
      };

      document.getElementById('subject-modal').remove();

      if (isEdit) {
        Object.assign(subjectObj, payload);
        renderMainView();
        await supabase.from('subjects').update(payload).eq('id', subjectObj.id);
      } else {
        const { data } = await supabase.from('subjects').insert([payload]).select();
        if(data) db.subjects.push(data[0]);
        renderMainView();
      }
    });
  };

  renderMainView();
}