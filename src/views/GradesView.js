import { supabase } from '../api/supabase.js';

export async function renderGradesView(container, onBack) {
  container.innerHTML = `<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner-gap" style="font-size: 32px; animation: spin 1s linear infinite;"></i></div>`;

  const thresholds = [
    { grade: 5.0, minPercent: 90.0 },
    { grade: 4.5, minPercent: 80.0 },
    { grade: 4.0, minPercent: 70.0 },
    { grade: 3.5, minPercent: 60.0 },
    { grade: 3.0, minPercent: 50.0 }
  ];

  let selectedSemesterID = "ALL";
  
  // Dane z DB
  const [
    { data: semesters },
    { data: subjects },
    { data: gradeModules },
    { data: grades }
  ] = await Promise.all([
    supabase.from('semesters').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('grade_modules').select('*'),
    supabase.from('grades').select('*')
  ]);

  const db = {
    semesters: semesters || [],
    subjects: subjects || [],
    gradeModules: gradeModules || [],
    grades: grades || []
  };

  // Ustaw domyślny semestr (Current)
  const currentSem = db.semesters.find(s => s.is_current);
  if (currentSem) selectedSemesterID = currentSem.id;

  // --- LOGIKA OBLICZENIOWA ---
  const percentToGrade = (percent) => {
    if (percent === null) return null;
    for (let t of thresholds) {
      if (percent >= t.minPercent) return t.grade;
    }
    return 2.0;
  };

  const calculateSubjectPercent = (subjectID) => {
    const modules = db.gradeModules.filter(m => m.subject_id === subjectID);
    const allGrades = db.grades.filter(g => g.subject_id === subjectID);
    
    let totalWeightedScore = 0.0;
    let totalGradedWeight = 0.0;
    let hasAnyGrade = false;

    for (let mod of modules) {
      const modGrades = allGrades.filter(g => g.module_id === mod.id);
      const moduleWeightFactor = (mod.weight || 0.0) / 100.0;
      
      totalGradedWeight += moduleWeightFactor;
      
      if (modGrades.length > 0) {
        let sumW = 0.0;
        let weightedSum = 0.0;
        for (let g of modGrades) {
          const w = g.weight || 0.0;
          sumW += w;
          weightedSum += (g.value || 0) * w;
        }
        
        if (sumW > 0) {
          const modAvg = weightedSum / sumW;
          totalWeightedScore += modAvg * moduleWeightFactor;
          hasAnyGrade = true;
        }
      }
    }
    
    if (!hasAnyGrade || totalGradedWeight === 0) return null;
    return totalWeightedScore / totalGradedWeight;
  };

  const calculateGPA = (filteredSubjects) => {
    let totalECTS = 0.0;
    let weightedSum = 0.0;
    
    for (let sub of filteredSubjects) {
      const percent = calculateSubjectPercent(sub.id);
      const grade = percentToGrade(percent);
      
      if (grade !== null) {
        const ects = sub.weight || 0.0;
        if (ects > 0) {
          weightedSum += grade * ects;
          totalECTS += ects;
        }
      }
    }
    return totalECTS === 0 ? null : (weightedSum / totalECTS);
  };

  // ==========================================
  // GŁÓWNY WIDOK OCEN (GradesView)
  // ==========================================
  const renderMainView = () => {
    let filteredSubjects = db.subjects;
    if (selectedSemesterID !== "ALL") {
      filteredSubjects = db.subjects.filter(s => s.semester_id === selectedSemesterID);
    }

    const gpa = calculateGPA(filteredSubjects);
    let gpaColor = "var(--text-secondary)";
    if (gpa !== null) {
      if (gpa >= 4.0) gpaColor = "var(--accent-green)";
      else if (gpa >= 3.0) gpaColor = "var(--accent-orange)";
      else gpaColor = "var(--accent-red)";
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; background: var(--bg-system-grouped);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--bg-secondary-grouped); border-bottom: 1px solid var(--bg-system-grouped);">
          <button id="grades-back-btn" style="background: none; border: none; font-size: 16px; color: var(--accent-blue); display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <i class="ph-bold ph-caret-left"></i> More
          </button>
          <h2 style="font-size: 16px; font-weight: bold;">Grades</h2>
          <div style="width: 60px;"></div>
        </div>

        <div style="flex: 1; overflow-y: auto;">
          <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: var(--bg-secondary-grouped); padding: 10px 15px; border-radius: 12px;">
               <span style="font-size: 14px; color: var(--text-secondary);">Semester:</span>
               <select id="sem-selector" style="background: transparent; border: none; font-size: 16px; font-weight: bold; outline: none; text-align: right; color: var(--text-primary);">
                 <option value="ALL" ${selectedSemesterID === 'ALL' ? 'selected' : ''}>All Semesters</option>
                 ${db.semesters.map(s => `<option value="${s.id}" ${selectedSemesterID === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
               </select>
            </div>

            <div style="background: var(--bg-secondary-grouped); padding: 20px; border-radius: 16px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <span style="font-size: 18px; font-weight: bold; color: var(--text-secondary);">Overall GPA</span>
              <span style="font-size: 34px; font-weight: bold; font-family: ui-rounded, sans-serif; color: ${gpaColor};">${gpa !== null ? gpa.toFixed(2) : '--'}</span>
            </div>

            <div style="background: var(--bg-secondary-grouped); border-radius: 12px; overflow: hidden;">
              ${filteredSubjects.length === 0 ? `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No subjects found.</div>` : ''}
              ${filteredSubjects.map(sub => {
                const percent = calculateSubjectPercent(sub.id);
                const grade = percentToGrade(percent);
                let gColor = "gray";
                if (grade !== null) gColor = grade >= 4.0 ? "var(--accent-green)" : (grade >= 3.0 ? "var(--accent-orange)" : "var(--accent-red)");

                return `
                  <div class="subject-row" data-id="${sub.id}" style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid var(--bg-system-grouped); cursor: pointer;">
                    <div style="width: 4px; height: 30px; background-color: ${sub.color || 'gray'}; border-radius: 2px; margin-right: 12px;"></div>
                    <span style="font-size: 16px; font-weight: 500; flex: 1;">${sub.name}</span>
                    
                    ${grade !== null ? `
                      <div style="text-align: right; margin-right: 10px;">
                        <div style="font-size: 18px; font-weight: bold; color: ${gColor};">${grade.toFixed(1)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${percent.toFixed(1)}%</div>
                      </div>
                    ` : `
                      <div style="font-size: 18px; font-weight: bold; color: var(--text-secondary); margin-right: 10px;">--</div>
                    `}
                    <i class="ph-bold ph-caret-right" style="color: var(--text-secondary); font-size: 16px;"></i>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('grades-back-btn').addEventListener('click', onBack);
    document.getElementById('sem-selector').addEventListener('change', (e) => {
      selectedSemesterID = e.target.value;
      renderMainView();
    });

    container.querySelectorAll('.subject-row').forEach(row => {
      row.addEventListener('click', () => {
        const subId = row.getAttribute('data-id');
        const subject = db.subjects.find(s => s.id === subId);
        if (subject) renderDetailView(subject);
      });
    });
  };

  // ==========================================
  // SZCZEGÓŁY PRZEDMIOTU (SubjectGradesDetailView)
  // ==========================================
  const renderDetailView = (subject) => {
    const sModules = db.gradeModules.filter(m => m.subject_id === subject.id);
    const sGrades = db.grades.filter(g => g.subject_id === subject.id);

    const calcModAvg = (modGrades) => {
      if (modGrades.length === 0) return 0.0;
      let sW = 0, wSum = 0;
      modGrades.forEach(g => {
        sW += (g.weight || 0); wSum += (g.value || 0) * (g.weight || 0);
      });
      return sW === 0 ? 0 : (wSum / sW);
    };

    let modulesHTML = '';
    if (sModules.length === 0) {
      modulesHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <i class="ph-fill ph-tray" style="font-size: 50px; color: var(--text-secondary); opacity: 0.5; margin-bottom: 10px;"></i>
          <h3 style="font-weight: bold;">No modules yet.</h3>
          <p style="font-size: 12px; color: var(--text-secondary);">You must add at least one Module (e.g. 'Exams 60%') before adding grades.</p>
        </div>
      `;
    } else {
      modulesHTML = sModules.map(mod => {
        const mGrades = sGrades.filter(g => g.module_id === mod.id);
        const avg = calcModAvg(mGrades);
        
        return `
          <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 10px 8px 10px;">
              <span style="font-weight: bold; font-size: 14px; text-transform: uppercase;">${mod.name} (${mod.weight || 0}%)</span>
              <span style="font-weight: bold; font-size: 12px; color: ${avg === 0 ? 'var(--text-secondary)' : 'var(--accent-blue)'};">Avg: ${avg.toFixed(1)}%</span>
            </div>
            <div style="background: var(--bg-secondary-grouped); border-radius: 12px; overflow: hidden;">
              ${mGrades.length === 0 ? `<div style="padding: 15px; font-size: 12px; color: gray; font-style: italic;">No grades in this module.</div>` : ''}
              ${mGrades.map(g => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid var(--bg-system-grouped);">
                  <div>
                    <div style="font-weight: bold; font-size: 16px;">${g.desc || 'Untitled Grade'}</div>
                    <div style="font-size: 12px; color: gray;">${g.date || ''}</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="text-align: right;">
                      <div style="font-weight: bold; font-size: 16px;">${(g.value || 0).toFixed(1)}%</div>
                      <div style="font-size: 12px; color: gray;">Weight: ${(g.weight || 0).toFixed(0)}</div>
                    </div>
                    <button class="grade-action-btn" data-id="${g.id}" style="background: none; border: none; color: var(--accent-blue); font-size: 20px; cursor: pointer;"><i class="ph-fill ph-pencil-simple"></i></button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; background: var(--bg-system-grouped);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--bg-secondary-grouped); border-bottom: 1px solid var(--bg-system-grouped);">
          <button id="detail-back-btn" style="background: none; border: none; font-size: 16px; color: var(--accent-blue); display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <i class="ph-bold ph-caret-left"></i> Grades
          </button>
          <h2 style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${subject.name}</h2>
          <button id="detail-add-btn" style="background: none; border: none; font-size: 24px; color: var(--accent-blue); cursor: pointer;"><i class="ph-fill ph-plus-circle"></i></button>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 100px;">
          ${modulesHTML}
        </div>
      </div>

      <div id="add-action-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: flex-end; justify-content: center;">
        <div style="background: var(--bg-system-grouped); width: 100%; border-radius: 20px 20px 0 0; padding: 20px;">
          <h3 style="font-weight: bold; text-align: center; margin-bottom: 20px;">Add New</h3>
          <button id="btn-add-module" style="width: 100%; padding: 15px; background: var(--bg-secondary-grouped); border: none; border-radius: 12px; font-size: 16px; margin-bottom: 10px; cursor: pointer;"><i class="ph-fill ph-folder-plus"></i> Add Module</button>
          <button id="btn-add-grade" style="width: 100%; padding: 15px; background: var(--bg-secondary-grouped); border: none; border-radius: 12px; font-size: 16px; margin-bottom: 20px; cursor: pointer;" ${sModules.length === 0 ? 'disabled style="opacity:0.5"' : ''}><i class="ph-fill ph-file-plus"></i> Add Grade</button>
          <button id="close-action-modal" style="width: 100%; padding: 15px; color: white; background: var(--accent-blue); border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">Cancel</button>
        </div>
      </div>

      <div id="form-container"></div>
    `;

    document.getElementById('detail-back-btn').addEventListener('click', renderMainView);
    
    // Obsługa dodawania
    const actionModal = document.getElementById('add-action-modal');
    document.getElementById('detail-add-btn').addEventListener('click', () => actionModal.classList.remove('hidden'));
    document.getElementById('close-action-modal').addEventListener('click', () => actionModal.classList.add('hidden'));

    document.getElementById('btn-add-module').addEventListener('click', () => {
      actionModal.classList.add('hidden');
      openModuleForm(subject.id);
    });

    document.getElementById('btn-add-grade').addEventListener('click', () => {
      actionModal.classList.add('hidden');
      openGradeForm(subject.id, sModules, null);
    });

    // Obsługa edycji usunięcia
    container.querySelectorAll('.grade-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gradeId = e.currentTarget.getAttribute('data-id');
        const action = prompt("Type 'e' to Edit, or 'd' to Delete this grade:");
        if (action === 'd') {
          db.grades = db.grades.filter(g => g.id !== gradeId);
          renderDetailView(subject);
          supabase.from('grades').delete().eq('id', gradeId).then();
        } else if (action === 'e') {
          const gObj = db.grades.find(g => g.id === gradeId);
          if (gObj) openGradeForm(subject.id, sModules, gObj);
        }
      });
    });

    // Funkcje Renderujące same formularze Modali
    const openModuleForm = (subID) => {
      document.getElementById('form-container').innerHTML = `
        <div id="mod-form-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2500; display: flex; align-items: flex-end;">
          <div style="background: var(--bg-system-grouped); width: 100%; padding: 20px; border-radius: 20px 20px 0 0;">
             <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
               <button id="c-mod-btn" style="color: var(--accent-blue); background: none; border: none;">Cancel</button>
               <h3 style="font-weight: bold;">New Module</h3>
               <button id="s-mod-btn" style="color: var(--accent-blue); font-weight: bold; background: none; border: none;">Save</button>
             </div>
             <input type="text" id="m-name" placeholder="Module Name (e.g. Exams)" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: none;">
             <input type="number" id="m-weight" placeholder="Weight % (e.g. 60)" style="width: 100%; padding: 12px; border-radius: 8px; border: none;">
          </div>
        </div>
      `;
      document.getElementById('c-mod-btn').addEventListener('click', () => document.getElementById('form-container').innerHTML = '');
      document.getElementById('s-mod-btn').addEventListener('click', async () => {
        const n = document.getElementById('m-name').value;
        const w = parseFloat(document.getElementById('m-weight').value);
        if(!n || isNaN(w)) return;
        document.getElementById('form-container').innerHTML = '';
        
        const payload = { subject_id: subID, name: n, weight: w };
        const { data } = await supabase.from('grade_modules').insert([payload]).select();
        if(data) db.gradeModules.push(data[0]);
        renderDetailView(subject);
      });
    };

    const openGradeForm = (subID, mods, gradeObj) => {
      const today = new Date().toISOString().split('T')[0];
      const isEdit = gradeObj !== null;

      document.getElementById('form-container').innerHTML = `
        <div id="grade-form-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2500; display: flex; align-items: flex-end;">
          <div style="background: var(--bg-system-grouped); width: 100%; padding: 20px; border-radius: 20px 20px 0 0; max-height: 90vh; overflow-y: auto;">
             <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
               <button id="c-gr-btn" style="color: var(--accent-blue); background: none; border: none;">Cancel</button>
               <h3 style="font-weight: bold;">${isEdit ? 'Edit Grade' : 'New Grade'}</h3>
               <button id="s-gr-btn" style="color: var(--accent-blue); font-weight: bold; background: none; border: none;">Save</button>
             </div>
             
             <div style="background: white; border-radius: 12px; padding: 10px; margin-bottom: 15px;">
               <input type="text" id="g-title" value="${isEdit ? gradeObj.desc || '' : ''}" placeholder="Title (e.g. Midterm)" style="width: 100%; border: none; padding: 8px 0; border-bottom: 1px solid #eee; outline: none;">
               <select id="g-mod" style="width: 100%; border: none; padding: 10px 0; outline: none; background: white;">
                 ${mods.map(m => `<option value="${m.id}" ${isEdit && gradeObj.module_id === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
               </select>
             </div>

             <p style="font-size: 12px; color: gray; margin-left: 10px;">Calculator (Optional)</p>
             <div style="display: flex; gap: 10px; background: white; border-radius: 12px; padding: 10px; margin-bottom: 15px;">
                <input type="number" id="g-got" placeholder="Got" style="flex: 1; border: none; text-align: center; outline: none;">
                <span style="font-size: 20px; color: gray;">/</span>
                <input type="number" id="g-max" placeholder="Max" style="flex: 1; border: none; text-align: center; outline: none;">
             </div>

             <div style="background: white; border-radius: 12px; padding: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                  <span>Grade (%)</span><input type="number" id="g-val" value="${isEdit ? gradeObj.value : ''}" placeholder="85.5" style="border: none; text-align: right; outline: none; color: var(--accent-blue); font-weight: bold;">
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                  <span>Weight</span><input type="number" id="g-weight" value="${isEdit ? (gradeObj.weight || 100) : '100'}" style="border: none; text-align: right; outline: none;">
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                  <span>Date</span><input type="date" id="g-date" value="${isEdit ? gradeObj.date || today : today}" style="border: none; outline: none;">
                </div>
             </div>
          </div>
        </div>
      `;

      // Auto-calculator
      const updateVal = () => {
        const got = parseFloat(document.getElementById('g-got').value);
        const max = parseFloat(document.getElementById('g-max').value);
        if(!isNaN(got) && !isNaN(max) && max > 0) {
          document.getElementById('g-val').value = ((got/max)*100).toFixed(1);
        }
      };
      document.getElementById('g-got').addEventListener('input', updateVal);
      document.getElementById('g-max').addEventListener('input', updateVal);

      document.getElementById('c-gr-btn').addEventListener('click', () => document.getElementById('form-container').innerHTML = '');
      
      document.getElementById('s-gr-btn').addEventListener('click', async () => {
        const val = parseFloat(document.getElementById('g-val').value);
        if(isNaN(val)) return alert("Percentage value is required");

        const payload = {
          subject_id: subID,
          module_id: document.getElementById('g-mod').value,
          desc: document.getElementById('g-title').value,
          value: val,
          weight: parseFloat(document.getElementById('g-weight').value) || 100,
          date: document.getElementById('g-date').value
        };

        document.getElementById('form-container').innerHTML = '';

        if(isEdit) {
          Object.assign(gradeObj, payload);
          renderDetailView(subject);
          await supabase.from('grades').update(payload).eq('id', gradeObj.id);
        } else {
          const { data } = await supabase.from('grades').insert([payload]).select();
          if(data) db.grades.push(data[0]);
          renderDetailView(subject);
        }
      });
    };
  };

  // Start Render
  renderMainView();
}