import { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import NoteEditorModal from '../components/NoteEditorModal';

export default function TodoView({ onBack }) {
  const { 
    dailyTasks, taskLists, saveTask, deleteTask, toggleTaskStatus, 
    sweepCompletedTasks, saveTaskList, deleteTaskList 
  } = useData();

  // --- STANY GŁÓWNE ---
  const [activeListId, setActiveListId] = useState('all');
  
  // Pasek Quick Add / Edit
  const [quickAddText, setQuickAddText] = useState('');
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickColor, setQuickColor] = useState('#3498db');
  const [showDateInput, setShowDateInput] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  const inputRef = useRef(null);

  // Formularz nowej Listy
  const [showListForm, setShowListForm] = useState(false);
  const [listFormName, setListFormName] = useState('');
  const [listFormType, setListFormType] = useState('');

  // Menu Kontekstowe & Notatnik
  const [contextMenu, setContextMenu] = useState(null);
  const [noteModalData, setNoteModalData] = useState(null);

  // Menu Mobilne Wyboru Listy
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Drag & Drop (Listy)
  const [draggedOverList, setDraggedOverList] = useState(null);

  // --- HELPERS ---
  const todayStr = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  }, []);

  const activeList = useMemo(() => 
    taskLists.find(l => l.id === activeListId), 
  [activeListId, taskLists]);

  const isShoppingList = activeList?.list_type === 'shopping';

  useEffect(() => {
    if (isShoppingList) setShowDateInput(false);
  }, [isShoppingList]);

  // Globalne zamykanie menu
  useEffect(() => {
    const closeMenu = () => {
      setContextMenu(null);
      setMobileFilterOpen(false);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // --- LOGIKA FILTROWANIA I GRUPOWANIA ---
  const filteredTasks = useMemo(() => {
    if (!dailyTasks) return [];
    const shoppingListIDs = new Set(taskLists.filter(l => l.list_type === 'shopping').map(l => l.id));

    return dailyTasks.filter(task => {
      const lid = task.list_id || '';
      const isDefault = !lid || lid === 'None' || lid === 'general' || lid === 'default' || lid === 'unscheduled';
      const isShoppingTask = shoppingListIDs.has(lid);
      const tDate = task.date || '';

      let matchesList = false;
      if (activeListId === 'all') matchesList = true;
      else if (activeListId === 'scheduled') { if (tDate) matchesList = true; }
      else if (activeListId === 'unscheduled') { if (!tDate && !isShoppingTask) matchesList = true; }
      else if (activeListId === 'default') { if (isDefault) matchesList = true; }
      else { if (lid === activeListId) matchesList = true; }

      if (!matchesList) return false;
      if (isShoppingList) return true;
      if (task.status === 'done' && tDate && tDate < todayStr) return false;

      return true;
    });
  }, [dailyTasks, taskLists, activeListId, isShoppingList, todayStr]);

  const groupedTasks = useMemo(() => {
    if (isShoppingList) {
      return {
        toBuy: filteredTasks.filter(t => t.status === 'todo'),
        bought: filteredTasks.filter(t => t.status === 'done')
      };
    }

    const overdue = [];
    const groupsDict = {};
    const listNames = {};
    taskLists.forEach(l => listNames[l.id] = l.name);

    filteredTasks.forEach(task => {
      const d = task.date || '';
      const lid = task.list_id || '';
      const isCustomList = lid && lid !== 'None' && lid !== 'general' && lid !== 'unscheduled' && lid !== 'default';

      if (d && d < todayStr && task.status === 'todo') {
        overdue.push(task);
        return;
      }

      let key = "";
      let display = "";
      let sortVal = 0;

      if (!d && isCustomList && activeListId !== lid) {
        key = `list_${lid}`;
        display = `● ${listNames[lid] || 'List'}`;
        sortVal = 1;
      } else {
        key = `date_${d}`;
        sortVal = 0;
        if (!d) { display = "No Date"; sortVal = 2; } 
        else if (d === todayStr) display = `${d} (Today)`;
        else display = d;
      }

      if (!groupsDict[key]) groupsDict[key] = { title: display, sortVal, dateVal: d, tasks: [] };
      groupsDict[key].tasks.push(task);
    });

    const upcoming = Object.values(groupsDict).sort((a, b) => {
      if (a.sortVal !== b.sortVal) return a.sortVal - b.sortVal;
      if (a.dateVal !== b.dateVal) return a.dateVal.localeCompare(b.dateVal);
      return a.title.localeCompare(b.title);
    }).map(g => {
      g.tasks.sort((t1, t2) => t1.status === 'todo' ? -1 : 1);
      return g;
    });

    overdue.sort((t1, t2) => t1.status === 'todo' ? -1 : 1);

    return { overdue, upcoming };
  }, [filteredTasks, isShoppingList, todayStr, activeListId, taskLists]);


  // --- AKCJE EDYCJI I DODAWANIA (Z Paska na górze) ---
  const handleEditTask = (task) => {
    setEditingTask(task);
    setQuickAddText(task.content);
    setQuickColor(task.color || '#3498db');
    
    if (task.date) {
      setQuickDate(task.date);
      setShowDateInput(true);
    } else {
      setQuickDate(todayStr);
      setShowDateInput(false);
    }
    
    setContextMenu(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setQuickAddText('');
    setQuickDate(todayStr);
    setQuickColor('#3498db');
    setShowDateInput(false);
  };

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    const text = quickAddText.trim();
    if (!text) return;

    const targetDate = (isShoppingList || !showDateInput) ? '' : quickDate;

    if (editingTask) {
      await saveTask({
        ...editingTask,
        content: text,
        date: targetDate,
        color: quickColor
      }, true);
      handleCancelEdit();
    } else {
      let targetListId = null;
      if (!['all', 'scheduled', 'unscheduled', 'default'].includes(activeListId)) {
        targetListId = activeListId;
      }
      await saveTask({
        content: text,
        list_id: targetListId,
        date: targetDate,
        color: quickColor,
        status: 'todo'
      }, false);
      setQuickAddText('');
    }
  };

  // --- NOTATKI ---
  const openNoteEditor = (e, task) => {
    e.stopPropagation();
    setNoteModalData({
      isOpen: true,
      task: task,
      content: task.note || '',
      title: `Task Note: ${task.content}`
    });
    setContextMenu(null);
  };

  const handleSaveNote = async (newNote) => {
    if (!noteModalData) return;
    await saveTask({ ...noteModalData.task, note: newNote }, true);
  };

  // --- LISTY I DRAG&DROP ---
  const handleSaveList = async () => {
    if (!listFormName) return;
    await saveTaskList({ name: listFormName, list_type: listFormType });
    setShowListForm(false);
    setListFormName('');
    setListFormType('');
  };

  const handleContextMenu = (e, task) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu({
      // ZMIANA: Zmieniono margines z 200 na 240, aby okienko w-56 (224px) 
      // nigdy nie wychodziło poza prawą krawędź ekranu i nie tworzyło scrolla.
      x: Math.min(e.clientX, window.innerWidth - 240),
      y: Math.min(e.clientY, window.innerHeight - 150),
      task
    });
  };

  const handleMoveToTomorrow = async (task) => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = tmrw.toISOString().split('T')[0];
    await saveTask({ ...task, date: tmrwStr }, true);
    setContextMenu(null);
  };

  const onDragStart = (e, task) => e.dataTransfer.setData('taskId', task.id);
  const onDragOverList = (e, listId) => { e.preventDefault(); setDraggedOverList(listId); };
  const onDragLeaveList = (e) => { e.preventDefault(); setDraggedOverList(null); };
  const onDropList = async (e, listId) => {
    e.preventDefault();
    setDraggedOverList(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;

    let targetLid = listId;
    let targetDate = task.date;

    if (listId === 'scheduled') { targetLid = null; if (!targetDate) targetDate = todayStr; }
    else if (listId === 'unscheduled') { targetLid = null; targetDate = ''; }
    else if (listId === 'default' || listId === 'all') { targetLid = null; }

    if (targetLid !== task.list_id || targetDate !== task.date) {
      await saveTask({ ...task, list_id: targetLid, date: targetDate }, true);
    }
  };

  // --- KOMPONENT WIERSZA (Task Row) ---
  const TaskRow = ({ task }) => {
    const isDone = task.status === 'done';
    
    return (
      <div 
        draggable
        onDragStart={(e) => onDragStart(e, task)}
        onContextMenu={(e) => handleContextMenu(e, task)}
        onClick={(e) => handleContextMenu(e, task)}
        className={`flex items-center gap-3 p-3 transition-colors hover:bg-white/5 active:bg-white/10 border-b border-gray-800/50 last:border-0 group cursor-pointer ${isDone ? 'opacity-50' : ''}`}
      >
        <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: task.color || '#3498db' }}></div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }}
          className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-gray-400'}`}
        >
          {isDone && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
        </button>

        <div className="flex-1 min-w-0 pr-2">
          <div className={`text-[15px] font-medium truncate ${isDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
            {task.content}
          </div>
          {task.note && (
             <div 
               onClick={(e) => openNoteEditor(e, task)}
               className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded-md inline-block mt-1 hover:text-white transition-colors"
             >
               ✎ Note
             </div>
          )}
        </div>

        <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 shrink-0">
           {!task.note && (
             <button onClick={(e) => openNoteEditor(e, task)} className="p-1.5 text-gray-400 hover:text-[#f1c40f] rounded-md hover:bg-white/10" title="Add Note">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
             </button>
           )}
           <button onClick={(e) => { e.stopPropagation(); handleEditTask(task); }} className="p-1.5 text-gray-400 hover:text-[#3498db] rounded-md hover:bg-white/10" title="Edit Task">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
           </button>
           <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-500/10" title="Delete Task">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-[#121212] md:bg-[#1c1c1e] text-white overflow-hidden relative">
      
      {/* ======================================= */}
      {/* DESKTOP LEWY PANEL (Nawigacja List)     */}
      {/* ======================================= */}
      <div className="hidden md:flex flex-col w-64 bg-[#121212] border-r border-gray-800 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">System Lists</h3>
            <div className="space-y-1">
              {[
                { id: 'all', name: 'All Tasks', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                { id: 'default', name: 'Inbox', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
                { id: 'scheduled', name: 'Scheduled', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { id: 'unscheduled', name: 'Unscheduled', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
              ].map(list => (
                <button
                  key={list.id}
                  onClick={() => { setActiveListId(list.id); handleCancelEdit(); }}
                  onDragOver={(e) => onDragOverList(e, list.id)}
                  onDragLeave={onDragLeaveList}
                  onDrop={(e) => onDropList(e, list.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeListId === list.id ? 'bg-[#3498db] text-white shadow-md' : (draggedOverList === list.id ? 'bg-[#3498db]/20 border border-[#3498db]/50' : 'text-gray-400 hover:bg-white/5 border border-transparent')}`}
                >
                  <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={list.icon}></path></svg>
                  {list.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Lists</h3>
              <button onClick={() => setShowListForm(true)} className="text-[#3498db] hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
              </button>
            </div>
            <div className="space-y-1">
              {taskLists.map(list => (
                <div key={list.id} className="relative group">
                  <button
                    onClick={() => { setActiveListId(list.id); handleCancelEdit(); }}
                    onDragOver={(e) => onDragOverList(e, list.id)}
                    onDragLeave={onDragLeaveList}
                    onDrop={(e) => onDropList(e, list.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeListId === list.id ? 'bg-[#3498db] text-white shadow-md' : (draggedOverList === list.id ? 'bg-[#3498db]/20 border border-[#3498db]/50' : 'text-gray-400 hover:bg-white/5 border border-transparent')}`}
                  >
                    <div className="flex items-center gap-3 truncate min-w-0">
                      <span className="text-lg leading-none shrink-0">{list.icon || (list.list_type === 'shopping' ? '🛒' : '📁')}</span>
                      <span className="truncate">{list.name}</span>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(window.confirm(`Delete list: ${list.name}?`)) { deleteTaskList(list.id); if(activeListId === list.id) setActiveListId('all'); } }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-500/20 ${activeListId === list.id ? 'flex' : 'hidden group-hover:flex'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ======================================= */}
      {/* ŚRODKOWY PANEL (Główna lista zadań)     */}
      {/* ======================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#121212] md:bg-transparent transition-all duration-300">
        
        {/* NAGŁÓWEK MOBILE & DESKTOP */}
        <header className={`flex flex-col md:flex-row md:items-center justify-between p-4 pb-2 md:pb-4 border-b border-gray-800 bg-[#1c1c1e] md:bg-transparent shrink-0 md:pt-[calc(env(safe-area-inset-top)+1.5rem)] md:px-8 ${!document.body.classList.contains('md:hidden') ? 'pt-[calc(env(safe-area-inset-top)+1rem)]' : ''}`}>
          {/* ZMIANA: min-w-0 dodane na rodzicach, aby h1 mógł bezpiecznie się ucinać (truncate) nie rozciągając ekranu */}
          <div className="flex items-center justify-between w-full md:w-auto min-w-0 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
              <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 min-w-0 w-full">
                {activeList?.icon && <span className="shrink-0">{activeList.icon}</span>}
                <span className="truncate block">
                  {activeListId === 'all' ? 'All Tasks' : 
                   activeListId === 'default' ? 'Inbox' :
                   activeListId === 'scheduled' ? 'Scheduled' :
                   activeListId === 'unscheduled' ? 'Unscheduled' : 
                   activeList?.name || 'Tasks'}
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isShoppingList && groupedTasks.bought?.length > 0 && (
                <button 
                  onClick={() => sweepCompletedTasks(activeListId)}
                  className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  <span className="hidden sm:inline">Sweep</span>
                </button>
              )}
              
              <div className="md:hidden flex items-center gap-1 relative">
                <button onClick={() => setShowListForm(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMobileFilterOpen(!mobileFilterOpen); }} className="p-2 text-gray-400 hover:text-white transition-colors">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                </button>

                {mobileFilterOpen && (
                  <div 
                    className="absolute top-full right-0 mt-2 w-56 bg-[#2b2b2b] border border-gray-700 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100 max-h-96 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2 mt-1">System Lists</div>
                    <div className="space-y-1">
                      {[
                        { id: 'all', name: 'All Tasks', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                        { id: 'default', name: 'Inbox', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
                        { id: 'scheduled', name: 'Scheduled', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                        { id: 'unscheduled', name: 'Unscheduled', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
                      ].map(list => (
                        <button
                          key={list.id}
                          onClick={() => { setActiveListId(list.id); handleCancelEdit(); setMobileFilterOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors min-w-0 ${activeListId === list.id ? 'bg-[#3498db] text-white' : 'text-gray-400 hover:bg-white/5'}`}
                        >
                          <svg className="w-4 h-4 opacity-80 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={list.icon}></path></svg>
                          <span className="truncate text-left">{list.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="h-px bg-gray-800 my-2"></div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">My Lists</div>
                    <div className="space-y-1">
                      {taskLists.map(list => (
                        <button
                          key={list.id}
                          onClick={() => { setActiveListId(list.id); handleCancelEdit(); setMobileFilterOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors min-w-0 ${activeListId === list.id ? 'bg-[#3498db] text-white' : 'text-gray-400 hover:bg-white/5'}`}
                        >
                          <span className="text-base leading-none shrink-0">{list.icon || (list.list_type === 'shopping' ? '🛒' : '📁')}</span>
                          <span className="truncate text-left">{list.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ZUNIFIKOWANY PASEK QUICK ADD / EDIT (Widoczny wszędzie) */}
        <div className={`p-3 md:p-4 md:px-8 bg-[#1c1c1e] shrink-0 border-b ${editingTask ? 'border-green-500/50 shadow-[0_4px_15px_-3px_rgba(34,197,94,0.1)]' : 'border-gray-800'}`}>
          <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
            <input 
              ref={inputRef}
              type="text" 
              placeholder={editingTask ? "Edit task..." : "Add new task..."}
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              className="flex-1 min-w-0 bg-[#2b2b2b] md:bg-transparent text-white px-4 py-2.5 md:p-0 rounded-xl md:rounded-none border border-gray-700 md:border-none focus:outline-none focus:border-[#3498db] md:text-lg w-full"
            />
            
            {/* ZMIANA: flex-wrap sm:flex-nowrap dla węższych ekranów w module narzędzi */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0">
                <div className="flex items-center gap-3 bg-[#2b2b2b] px-3 py-1.5 rounded-xl border border-gray-700">
                  {/* DATA */}
                  {!isShoppingList && !showDateInput && (
                    <button type="button" onClick={() => setShowDateInput(true)} className="text-gray-400 hover:text-[#3498db] transition-colors p-1" title="Set Date">
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </button>
                  )}
                  {!isShoppingList && showDateInput && (
                    <input 
                      type="date" 
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                      className="bg-transparent text-[#3498db] text-sm font-medium focus:outline-none [color-scheme:dark] cursor-pointer"
                    />
                  )}

                  {/* KOLOR */}
                  <input 
                    type="color" 
                    value={quickColor}
                    onChange={(e) => setQuickColor(e.target.value)}
                    className="w-6 h-6 rounded-full border-none bg-transparent cursor-pointer p-0 shrink-0"
                    title="Label Color"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* PRZYCISK ANULUJ EDYCJĘ */}
                  {editingTask && (
                    <button 
                      type="button" 
                      onClick={handleCancelEdit}
                      className="w-10 h-10 text-gray-400 hover:text-white flex items-center justify-center font-bold bg-[#2b2b2b] rounded-full border border-gray-700 transition-colors shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  )}

                  {/* PRZYCISK ZAPISZ */}
                  <button 
                    type="submit"
                    disabled={!quickAddText.trim()}
                    className={`w-10 h-10 text-white rounded-full flex items-center justify-center font-bold disabled:opacity-50 transition-colors shadow-md shrink-0 ${editingTask ? 'bg-green-500 hover:bg-green-600' : 'bg-[#3498db] hover:bg-blue-600'}`}
                  >
                    {editingTask ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                    )}
                  </button>
                </div>
            </div>
          </form>
        </div>

        {/* GŁÓWNA LISTA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
          <div className="max-w-4xl mx-auto space-y-6 w-full">
            
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 mt-10 opacity-50 text-center">
                <span className="text-5xl mb-4">{isShoppingList ? '🛒' : '📝'}</span>
                <h2 className="text-xl font-bold">List is empty.</h2>
                <p className="text-gray-400 mt-1">Use the bar above to insert new items.</p>
              </div>
            ) : (
              <>
                {/* WIDOK ZAKUPOWY */}
                {isShoppingList && (
                  <>
                    {groupedTasks.toBuy?.length > 0 && (
                      <section>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">To Buy</h3>
                        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden shadow-sm border border-white/5">
                          {groupedTasks.toBuy.map(task => <TaskRow key={task.id} task={task} />)}
                        </div>
                      </section>
                    )}
                    {groupedTasks.bought?.length > 0 && (
                      <section>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2 mt-6">Bought</h3>
                        <div className="bg-[#1c1c1e]/50 rounded-2xl overflow-hidden shadow-sm border border-white/5">
                          {groupedTasks.bought.map(task => <TaskRow key={task.id} task={task} />)}
                        </div>
                      </section>
                    )}
                  </>
                )}

                {/* WIDOK NORMALNY */}
                {!isShoppingList && (
                  <>
                    {groupedTasks.overdue?.length > 0 && (
                      <section>
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-2 ml-2">Overdue</h3>
                        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden shadow-sm border border-red-500/20">
                          {groupedTasks.overdue.map(task => <TaskRow key={task.id} task={task} />)}
                        </div>
                      </section>
                    )}
                    
                    {groupedTasks.upcoming?.map(group => (
                      <section key={group.title}>
                        <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ml-2 mt-6 ${group.dateVal === todayStr ? 'text-[#3498db]' : 'text-gray-400'}`}>
                          {group.title}
                        </h3>
                        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden shadow-sm border border-white/5">
                          {group.tasks.map(task => <TaskRow key={task.id} task={task} />)}
                        </div>
                      </section>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* GLOBALNE MENU KONTEKSTOWE ZADAŃ */}
      {contextMenu && (
        <div 
          className="fixed z-[60] bg-[#1c1c1e] border border-gray-800 rounded-xl shadow-2xl py-1 w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { handleEditTask(contextMenu.task); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
            Edit Task Details
          </button>
          <button onClick={(e) => openNoteEditor(e, contextMenu.task)} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
            Edit Note
          </button>
          {!isShoppingList && (
            <button onClick={() => handleMoveToTomorrow(contextMenu.task)} className="w-full text-left px-4 py-3 text-sm font-medium text-[#3498db] hover:bg-white/10 transition-colors border-b border-gray-800">
              Move to Tomorrow
            </button>
          )}
          <button onClick={() => { toggleTaskStatus(contextMenu.task); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-green-500 hover:bg-white/10 transition-colors border-b border-gray-800">
            {contextMenu.task.status === 'done' ? 'Mark as To-Do' : 'Mark as Done'}
          </button>
          <button onClick={() => { if(window.confirm(`Delete task?`)) deleteTask(contextMenu.task.id); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-white/10 transition-colors">
            Delete Task
          </button>
        </div>
      )}

      {/* MODAL LISTY (Add List) */}
      {showListForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
          <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:w-full md:max-w-sm flex flex-col md:rounded-3xl md:border md:border-white/10 shadow-2xl">
            <header className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
              <button onClick={() => setShowListForm(false)} className="text-[#3498db] font-medium">Cancel</button>
              <h1 className="text-lg font-bold text-white">New List</h1>
              <button onClick={handleSaveList} disabled={!listFormName} className="text-[#3498db] font-bold disabled:opacity-50">Save</button>
            </header>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">List Name</label>
                <input type="text" value={listFormName} onChange={e => setListFormName(e.target.value)} placeholder="e.g. Groceries" className="w-full bg-[#2b2b2b] text-white px-4 py-3 rounded-xl focus:outline-none border border-gray-700 focus:border-[#3498db]" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">List Type</label>
                <div className="flex flex-col gap-2">
                  <label className={`p-4 border rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${listFormType === '' ? 'bg-[#3498db]/10 border-[#3498db]' : 'border-gray-800 hover:bg-white/5'}`}>
                    <input type="radio" name="listType" checked={listFormType === ''} onChange={() => setListFormType('')} className="accent-[#3498db]" />
                    <div>
                      <div className="font-bold text-white">Standard (To-Do)</div>
                      <div className="text-xs text-gray-500">Tasks with dates and deadlines.</div>
                    </div>
                  </label>
                  <label className={`p-4 border rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${listFormType === 'shopping' ? 'bg-[#3498db]/10 border-[#3498db]' : 'border-gray-800 hover:bg-white/5'}`}>
                    <input type="radio" name="listType" checked={listFormType === 'shopping'} onChange={() => setListFormType('shopping')} className="accent-[#3498db]" />
                    <div>
                      <div className="font-bold text-white">Shopping / Dateless</div>
                      <div className="text-xs text-gray-500">Simple checklists without dates.</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIVERSAL NOTE EDITOR */}
      <NoteEditorModal 
        isOpen={noteModalData?.isOpen} 
        initialNote={noteModalData?.content} 
        title={noteModalData?.title}
        onClose={() => setNoteModalData(null)}
        onSave={handleSaveNote}
      />

    </div>
  );
}