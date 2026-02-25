import { supabase } from '../api/supabase.js';

// Globalne stany dla widoku Tasks
let currentTasks = [];
let taskLists = [];
let selectedListID = 'all';

export async function renderTasksView(container) {
  container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);"><i class="ph ph-spinner-gap" style="font-size: 32px; animation: spin 1s linear infinite;"></i></div>`;

  const todayString = new Date().toISOString().split('T')[0];

  // ==========================================
  // 1. POBIERANIE DANYCH
  // ==========================================
  const [ { data: tasks }, { data: lists } ] = await Promise.all([
    supabase.from('daily_tasks').select('*'),
    supabase.from('task_lists').select('*')
  ]);

  currentTasks = tasks || [];
  taskLists = lists || [];

  // Sortowanie (todo najpierw)
  const sortTasks = (tasksArr) => {
    return tasksArr.sort((a, b) => {
      if (a.status !== b.status) return a.status === "todo" ? -1 : 1;
      return 0;
    });
  };

  // ==========================================
  // 2. FUNKCJA RENDERUJĄCA UI
  // ==========================================
  const renderUI = () => {
    // Odpowiednik: isShoppingList
    const currentListObj = taskLists.find(l => l.id === selectedListID);
    const isShoppingList = currentListObj?.list_type === "shopping";
    const shoppingListIDs = new Set(taskLists.filter(l => l.list_type === "shopping").map(l => l.id));

    // Odpowiednik: navTitle
    let navTitle = "Tasks";
    if (selectedListID === "all") navTitle = "All Tasks";
    else if (selectedListID === "default") navTitle = "Default / Inbox";
    else if (selectedListID === "scheduled") navTitle = "Scheduled";
    else if (selectedListID === "unscheduled") navTitle = "Unscheduled";
    else if (currentListObj) navTitle = currentListObj.name;

    // Odpowiednik: filteredTasks
    const filteredTasks = currentTasks.filter(task => {
      const lid = task.list_id || "";
      const isDefault = !lid || lid === "None" || lid === "general" || lid === "unscheduled" || lid === "default";
      const isShoppingTask = shoppingListIDs.has(lid);
      const tDate = task.date || "";

      let matchesList = false;
      if (selectedListID === "all") matchesList = true;
      else if (selectedListID === "scheduled") matchesList = tDate !== "";
      else if (selectedListID === "unscheduled") matchesList = (tDate === "" && !isShoppingTask);
      else if (selectedListID === "default") matchesList = isDefault;
      else matchesList = (lid === selectedListID);

      if (!matchesList) return false;
      if (isShoppingList) return true; // W liście zakupów widzimy zrobione ("Bought")
      if (task.status === "done" && tDate !== "" && tDate < todayString) return false; // Ukrywaj zrobione w przeszłości
      return true;
    });

    // ------------------------------------------
    // GRUPOWANIE ZADAŃ (KLASYCZNE I LISTY ZAKUPOWE)
    // ------------------------------------------
    let listsHTML = '';

    const renderSection = (title, tasksToRender, titleColor = "var(--text-primary)") => {
      if (tasksToRender.length === 0) return '';
      let rowsHTML = tasksToRender.map(task => {
        const isDone = task.status === "done";
        const taskColor = task.color || "#3498db";
        return `
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary-grouped); border-radius: 12px; margin-bottom: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
            <div style="width: 4px; height: 35px; background-color: ${taskColor}; border-radius: 2px;"></div>
            
            <button class="task-toggle-btn" data-id="${task.id}" data-status="${task.status}" style="background: none; border: none; padding: 0; cursor: pointer;">
              <i class="${isDone ? 'ph-fill ph-check-circle' : 'ph ph-circle'}" style="font-size: 24px; color: ${isDone ? 'var(--accent-green)' : 'var(--text-secondary)'};"></i>
            </button>
            
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 16px; font-weight: 500; ${isDone ? 'text-decoration: line-through; color: var(--text-secondary);' : 'color: var(--text-primary);'}">${task.content}</div>
              ${task.note ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${task.note}</div>` : ''}
            </div>
            
            <div style="display: flex; gap: 8px;">
               <button class="task-edit-btn" data-id="${task.id}" style="background: none; border: none; color: var(--accent-blue); font-size: 18px; cursor: pointer;"><i class="ph ph-pencil-simple"></i></button>
               <button class="task-delete-btn" data-id="${task.id}" style="background: none; border: none; color: var(--accent-red); font-size: 18px; cursor: pointer;"><i class="ph ph-trash"></i></button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: bold; color: ${titleColor}; margin-bottom: 10px; margin-left: 5px; text-transform: uppercase;">${title}</h3>
          ${rowsHTML}
        </div>
      `;
    };

    if (filteredTasks.length === 0) {
      listsHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <i class="ph ${isShoppingList ? 'ph-shopping-cart' : 'ph-check-square-offset'}" style="font-size: 60px; color: var(--text-secondary); opacity: 0.5; margin-bottom: 15px;"></i>
          <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">${isShoppingList ? "List is empty." : "No tasks."}</h3>
          <p style="color: var(--text-secondary); font-size: 14px;">${isShoppingList ? "Use the quick add bar below." : "Press + to add a new task."}</p>
        </div>
      `;
    } else {
      if (isShoppingList) {
        const toBuy = sortTasks(filteredTasks.filter(t => t.status === "todo"));
        const bought = sortTasks(filteredTasks.filter(t => t.status === "done"));
        listsHTML += renderSection("To Buy", toBuy);
        listsHTML += renderSection("Bought", bought, "var(--text-secondary)");
      } else {
        const overdue = sortTasks(filteredTasks.filter(t => t.date && t.date < todayString && t.status !== "done"));
        listsHTML += renderSection("Overdue", overdue, "var(--accent-red)");

        const upcomingTasks = filteredTasks.filter(t => {
          if (t.date && t.date < todayString && t.status !== "done") return false; // pomin overdue
          return true;
        });

        // Tworzenie słownika grup (jak w Swifcie: groupsDict)
        let groupsDict = {};
        const listNames = Object.fromEntries(taskLists.map(l => [l.id, l.name]));

        upcomingTasks.forEach(task => {
          const d = task.date || "";
          const lid = task.list_id || "";
          const isCustomList = lid && lid !== "None" && lid !== "general" && lid !== "unscheduled" && lid !== "default";
          
          let key = "", display = "", sortVal = 0;

          if (!d && isCustomList && selectedListID !== lid) {
            const lName = listNames[lid] || "List";
            key = `list_${lid}`; display = `● ${lName}`; sortVal = 1;
          } else {
            key = `date_${d}`; sortVal = 0;
            if (!d) { display = "No Date"; sortVal = 2; }
            else if (d === todayString) { display = `${d} (Today)`; }
            else { display = d; }
          }

          if (!groupsDict[key]) groupsDict[key] = { title: display, sortVal, dateVal: d, tasks: [] };
          groupsDict[key].tasks.append = task; // push
          groupsDict[key].tasks.push(task);
        });

        // Sortowanie grup
        const sortedGroups = Object.values(groupsDict).sort((g1, g2) => {
          if (g1.sortVal !== g2.sortVal) return g1.sortVal - g2.sortVal;
          if (g1.dateVal !== g2.dateVal) return g1.dateVal.localeCompare(g2.dateVal);
          return g1.title.localeCompare(g2.title);
        });

        sortedGroups.forEach(group => {
          const groupColor = group.dateVal === todayString ? "#9b59b6" : "var(--text-secondary)";
          listsHTML += renderSection(group.title, sortTasks(group.tasks), groupColor);
        });
      }
    }

    // Tworzenie opcji do Selecta (Menu filtrowania)
    const sysLists = `
      <optgroup label="System Lists">
        <option value="all" ${selectedListID === 'all' ? 'selected' : ''}>All Tasks</option>
        <option value="default" ${selectedListID === 'default' ? 'selected' : ''}>Default / Inbox</option>
        <option value="scheduled" ${selectedListID === 'scheduled' ? 'selected' : ''}>Scheduled</option>
        <option value="unscheduled" ${selectedListID === 'unscheduled' ? 'selected' : ''}>Unscheduled</option>
      </optgroup>
    `;
    const myLists = `
      <optgroup label="My Lists">
        ${taskLists.map(l => `<option value="${l.id}" ${selectedListID === l.id ? 'selected' : ''}>${l.list_type === 'shopping' ? l.name : l.name}</option>`).join('')}
      </optgroup>
    `;

    // 3. WSTAWIANIE DO DOM
    container.innerHTML = `
      <div style="padding: 20px; padding-bottom: 100px; display: flex; flex-direction: column; height: 100%;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
             <select id="task-filter-select" style="background: var(--bg-secondary-grouped); color: var(--accent-blue); font-weight: bold; border: none; padding: 8px 12px; border-radius: 10px; font-size: 16px; outline: none; -webkit-appearance: none;">
                ${sysLists}
                ${myLists}
             </select>
          </div>
          
          <div style="display: flex; gap: 15px;">
            ${isShoppingList ? 
              `<button id="sweep-tasks-btn" style="background: none; border: none; color: var(--accent-red); font-size: 24px; cursor: pointer;"><i class="ph ph-trash"></i></button>` : 
              `<button id="add-task-btn" style="background: none; border: none; color: var(--accent-blue); font-size: 24px; cursor: pointer;"><i class="ph-fill ph-plus-circle"></i></button>`
            }
          </div>
        </div>

        <h1 style="font-size: 34px; font-weight: bold; margin-bottom: 20px;">${navTitle}</h1>

        <div style="flex: 1; overflow-y: auto; padding-bottom: 20px;">
          ${listsHTML}
        </div>

        ${isShoppingList ? `
          <div style="display: flex; gap: 10px; align-items: center; padding: 15px; background: var(--bg-secondary-grouped); border-radius: 20px; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); margin-bottom: 10px;">
             <input type="text" id="quick-add-input" placeholder="Add new item..." style="flex: 1; border: 1px solid #ccc; padding: 10px 15px; border-radius: 10px; font-size: 16px; outline: none; background: transparent; color: var(--text-primary);">
             <button id="quick-add-btn" style="background: none; border: none; color: var(--accent-blue); font-size: 32px; cursor: pointer;"><i class="ph-fill ph-arrow-circle-up"></i></button>
          </div>
        ` : ''}

      </div>

      <div id="task-editor-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: flex-end; justify-content: center;">
        <div style="background: var(--bg-system-grouped); width: 100%; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 20px; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <button id="close-task-modal" style="color: var(--accent-blue); font-size: 16px; border: none; background: none; cursor: pointer;">Cancel</button>
            <h3 id="task-modal-title" style="font-weight: bold; font-size: 16px;">Task Info</h3>
            <button id="save-task-btn" style="color: var(--accent-blue); font-weight: bold; font-size: 16px; border: none; background: none; cursor: pointer;">Save</button>
          </div>
          
          <input type="hidden" id="task-edit-id">

          <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 15px;">
             <input type="text" id="task-content-input" placeholder="Task title" style="width: 100%; border: none; background: transparent; color: var(--text-primary); font-size: 16px; padding: 8px 0; outline: none; border-bottom: 1px solid var(--bg-system-grouped); margin-bottom: 5px;">
             
             <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                <span>Include Date</span>
                <input type="checkbox" id="task-date-toggle" style="width: 20px; height: 20px;">
             </div>
             
             <div id="task-date-wrapper" class="hidden" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--bg-system-grouped);">
                <input type="date" id="task-date-input" style="background: transparent; border: none; color: var(--accent-blue); font-size: 16px; outline: none; width: 100%;">
             </div>

             <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                <span>List</span>
                <select id="task-list-select" style="background: transparent; color: var(--text-secondary); border: none; font-size: 16px; outline: none; text-align: right;">
                  <option value="">Default / Inbox</option>
                  ${taskLists.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
                </select>
             </div>
          </div>

          <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 15px;">
            <span style="font-size: 14px; font-weight: bold;">Color Label</span>
            <div style="display: flex; gap: 15px; overflow-x: auto; padding: 10px 0; scrollbar-width: none;">
               ${['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#95a5a6', '#34495e'].map(color => `
                 <div class="color-picker-circle" data-color="${color}" style="min-width: 30px; height: 30px; border-radius: 50%; background-color: ${color}; border: 3px solid transparent; cursor: pointer;"></div>
               `).join('')}
            </div>
          </div>

          <div style="background: var(--bg-secondary-grouped); border-radius: 12px; padding: 10px 15px; margin-bottom: 20px;">
             <span style="font-size: 14px; font-weight: bold;">Note</span>
             <textarea id="task-note-input" style="width: 100%; height: 100px; border: none; background: transparent; color: var(--text-primary); font-size: 16px; outline: none; margin-top: 10px; resize: none;"></textarea>
          </div>
        </div>
      </div>
    `;

    // ==========================================
    // 4. EVENT LISTENERY (Delegacja)
    // ==========================================

    // Zmiana Filtra Listy
    document.getElementById('task-filter-select').addEventListener('change', (e) => {
      selectedListID = e.target.value;
      renderUI();
    });

    // Toggle Done/Todo
    container.querySelectorAll('.task-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const status = e.currentTarget.getAttribute('data-status');
        const newStatus = status === 'done' ? 'todo' : 'done';
        
        const task = currentTasks.find(t => t.id === id);
        if (task) task.status = newStatus;
        renderUI(); // Odbij w UI natychmiast

        await supabase.from('daily_tasks').update({ status: newStatus }).eq('id', id);
      });
    });

    // Usuwanie Zadania
    container.querySelectorAll('.task-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this task?")) {
          currentTasks = currentTasks.filter(t => t.id !== id);
          renderUI();
          await supabase.from('daily_tasks').delete().eq('id', id);
        }
      });
    });

    // Sweep Bought Items (Dla Shopping List)
    const sweepBtn = document.getElementById('sweep-tasks-btn');
    if (sweepBtn) {
      sweepBtn.addEventListener('click', async () => {
        if (confirm("Delete all bought items?")) {
          const toDeleteIds = currentTasks.filter(t => t.list_id === selectedListID && t.status === 'done').map(t => t.id);
          currentTasks = currentTasks.filter(t => !toDeleteIds.includes(t.id));
          renderUI();
          
          // Usuń w bazie
          for(const delId of toDeleteIds) {
             await supabase.from('daily_tasks').delete().eq('id', delId);
          }
        }
      });
    }

    // Quick Add Bar (Dla Shopping List)
    const quickAddBtn = document.getElementById('quick-add-btn');
    const quickAddInput = document.getElementById('quick-add-input');
    if (quickAddBtn && quickAddInput) {
      const submitQuickAdd = async () => {
        const text = quickAddInput.value.trim();
        if (!text) return;
        
        const targetListID = (['all', 'scheduled', 'unscheduled', 'default'].includes(selectedListID)) ? null : selectedListID;
        const newTask = { content: text, status: 'todo', list_id: targetListID, color: '#3498db', date: null };
        
        quickAddInput.value = '';
        
        const { data, error } = await supabase.from('daily_tasks').insert([newTask]).select();
        if (data && data.length > 0) {
          currentTasks.push(data[0]);
          renderUI();
        }
      };
      quickAddBtn.addEventListener('click', submitQuickAdd);
      quickAddInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitQuickAdd(); });
    }

    // ==========================================
    // LOGIKA MODALA (ADD / EDIT)
    // ==========================================
    const modal = document.getElementById('task-editor-modal');
    const titleEl = document.getElementById('task-modal-title');
    const idInput = document.getElementById('task-edit-id');
    const contentInput = document.getElementById('task-content-input');
    const dateToggle = document.getElementById('task-date-toggle');
    const dateWrapper = document.getElementById('task-date-wrapper');
    const dateInput = document.getElementById('task-date-input');
    const listSelect = document.getElementById('task-list-select');
    const noteInput = document.getElementById('task-note-input');
    let activeColor = '#3498db';

    // Obsługa wyboru koloru w Modalu
    const colorCircles = modal.querySelectorAll('.color-picker-circle');
    const updateColorSelection = (hex) => {
      activeColor = hex;
      colorCircles.forEach(c => {
        c.style.borderColor = c.getAttribute('data-color') === hex ? 'var(--text-primary)' : 'transparent';
      });
    };
    colorCircles.forEach(c => c.addEventListener('click', (e) => updateColorSelection(e.target.getAttribute('data-color'))));

    // Pokazywanie/Ukrywanie wyboru daty
    dateToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        dateWrapper.classList.remove('hidden');
        if (!dateInput.value) dateInput.value = todayString;
      } else {
        dateWrapper.classList.add('hidden');
      }
    });

    const openModal = (task = null) => {
      modal.classList.remove('hidden');
      if (task) {
        titleEl.innerText = "Edit Task";
        idInput.value = task.id;
        contentInput.value = task.content;
        noteInput.value = task.note || "";
        listSelect.value = task.list_id || "";
        updateColorSelection(task.color || "#3498db");

        if (task.date) {
          dateToggle.checked = true;
          dateWrapper.classList.remove('hidden');
          dateInput.value = task.date;
        } else {
          dateToggle.checked = false;
          dateWrapper.classList.add('hidden');
          dateInput.value = todayString;
        }
      } else {
        titleEl.innerText = "New Task";
        idInput.value = "";
        contentInput.value = "";
        noteInput.value = "";
        listSelect.value = ['all', 'scheduled', 'unscheduled', 'default'].includes(selectedListID) ? "" : selectedListID;
        updateColorSelection("#3498db");
        
        dateToggle.checked = false;
        dateWrapper.classList.add('hidden');
        dateInput.value = todayString;
      }
    };

    const addBtn = document.getElementById('add-task-btn');
    if (addBtn) addBtn.addEventListener('click', () => openModal());

    container.querySelectorAll('.task-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const task = currentTasks.find(t => t.id === e.currentTarget.getAttribute('data-id'));
        if (task) openModal(task);
      });
    });

    document.getElementById('close-task-modal').addEventListener('click', () => modal.classList.add('hidden'));

    // Zapisywanie z Modala
    document.getElementById('save-task-btn').addEventListener('click', async () => {
      if (!contentInput.value.trim()) return;

      const isShop = taskLists.find(l => l.id === listSelect.value)?.list_type === 'shopping';
      const finalDate = (isShop || !dateToggle.checked) ? null : dateInput.value;

      const payload = {
        content: contentInput.value.trim(),
        note: noteInput.value.trim() || null,
        list_id: listSelect.value || null,
        date: finalDate,
        color: activeColor
      };

      modal.classList.add('hidden');

      if (idInput.value) { // Update
        const tObj = currentTasks.find(t => t.id === idInput.value);
        Object.assign(tObj, payload);
        renderUI();
        await supabase.from('daily_tasks').update(payload).eq('id', idInput.value);
      } else { // Insert
        payload.status = 'todo';
        const { data } = await supabase.from('daily_tasks').insert([payload]).select();
        if (data && data.length > 0) {
          currentTasks.push(data[0]);
          renderUI();
        }
      }
    });

  }; // End renderUI()

  // Pierwsze wyrysowanie
  renderUI();
}