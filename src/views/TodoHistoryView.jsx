import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import NoteEditorModal from '../components/NoteEditorModal';

export default function TodoHistoryView({ onBack }) {
  const { dailyTasks, toggleTaskStatus, taskLists, saveTask } = useData(); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListFilter, setSelectedListFilter] = useState('all'); 
  const [noteModalData, setNoteModalData] = useState(null); 

  // Słownik nazw list (żeby pokazać z jakiej listy pochodzi wykonane zadanie)
  const listNames = useMemo(() => {
    const dict = {};
    (taskLists || []).forEach(l => { dict[l.id] = l; });
    return dict;
  }, [taskLists]);

  const completedTasks = useMemo(() => {
    return (dailyTasks || []).filter(t => t.status === 'done');
  }, [dailyTasks]);

  const groupedHistory = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay() || 7; 
    if (day !== 1) startOfWeek.setHours(-24 * (day - 1));

    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    completedTasks.forEach(task => {
      const list = task.list_id ? listNames[task.list_id] : null;
      
      // 1. FILTROWANIE PO LIŚCIE (Combobox)
      if (selectedListFilter !== 'all' && task.list_id !== selectedListFilter) {
        return;
      }

      // 2. FILTROWANIE PO WYSZUKIWANIU (Treść zadania LUB Nazwa listy)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const contentMatch = task.content.toLowerCase().includes(query);
        const listMatch = list ? list.name.toLowerCase().includes(query) : false;
        
        if (!contentMatch && !listMatch) {
          return;
        }
      }

      // Jeśli nie ma completed_at (stare zadania przed naszą zmianą), traktujemy jako "Older"
      if (!task.completed_at) {
        groups.older.push(task);
        return;
      }

      const compDate = new Date(task.completed_at);
      
      if (compDate >= today) {
        groups.today.push(task);
      } else if (compDate >= yesterday && compDate < today) {
        groups.yesterday.push(task);
      } else if (compDate >= startOfWeek && compDate < yesterday) {
        groups.thisWeek.push(task);
      } else {
        groups.older.push(task);
      }
    });

    // Sortowanie wewnątrz grup (najnowsze na górze)
    const sortByDateDesc = (a, b) => {
      const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return dateB - dateA;
    };

    groups.today.sort(sortByDateDesc);
    groups.yesterday.sort(sortByDateDesc);
    groups.thisWeek.sort(sortByDateDesc);
    groups.older.sort(sortByDateDesc);

    return groups;
  }, [completedTasks, searchQuery, selectedListFilter, listNames]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const doneToday = completedTasks.filter(t => {
      if (!t.completed_at) return false;
      return new Date(t.completed_at) >= today;
    }).length;

    return {
      total: completedTasks.length,
      today: doneToday
    };
  }, [completedTasks]);

  const handleRestore = async (e, task) => {
    e.stopPropagation();
    await toggleTaskStatus(task); 
  };

  const handleSaveNote = async (newNote) => {
    if (!noteModalData) return;
    await saveTask({ ...noteModalData.task, note: newNote }, true);
    setNoteModalData(null);
  };

  const renderTaskGroup = (title, tasks, colorClass) => {
    if (tasks.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ml-2 ${colorClass}`}>
          {title} <span className="opacity-50 ml-1">({tasks.length})</span>
        </h3>
        <div className="bg-[#1c1c1e] rounded-2xl border border-gray-800 overflow-hidden shadow-sm">
          {tasks.map(task => {
            const list = task.list_id ? listNames[task.list_id] : null;
            const isShopping = list?.list_type === 'shopping';

            return (
              <div key={task.id} className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border-b border-gray-800/50 last:border-0 hover:bg-white/5 transition-colors group">
                <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: task.color || '#3498db' }}></div>
                
                <div className="flex-1 min-w-0 py-0.5">
                  {/* POPRAWKA: Zawijanie tekstu zamiast ucinania (truncate -> break-words) */}
                  <div className="text-gray-300 font-medium line-through decoration-gray-600 break-words whitespace-normal leading-tight">
                    {task.content}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {list && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-medium inline-flex items-center gap-1">
                        {list.icon || (isShopping ? '🛒' : '📁')} {list.name}
                      </span>
                    )}
                    {task.completed_at && (
                      <span className="text-[10px] text-gray-500">
                        {new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0 self-center">
                  {/* Ikonka Notatki */}
                  {task.note && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteModalData({
                          isOpen: true,
                          task: task,
                          content: task.note,
                          title: `Task Note: ${task.content}`
                        });
                      }}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-[#f1c40f] bg-gray-800/50 hover:bg-white/10 rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
                      title="View/Edit Note"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                  )}

                  {/* Przycisk Przywracania */}
                  <button 
                    onClick={(e) => handleRestore(e, task)}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-[#3498db] bg-gray-800/50 hover:bg-[#3498db]/10 rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
                    title="Restore to active tasks"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                    <span className="text-xs font-bold hidden sm:block">Restore</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] md:bg-transparent text-white relative">
      
      {/* HEADER */}
      <header className="flex items-center gap-3 sm:gap-4 p-4 md:p-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-[calc(env(safe-area-inset-top)+1.5rem)] shrink-0 border-b border-gray-800 md:border-none bg-[#1c1c1e] md:bg-transparent z-10">
        <button 
          onClick={onBack}
          className="p-2 sm:p-2.5 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Task History</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:px-8 pb-32">
        <div className="max-w-4xl mx-auto w-full">
          
          {/* STATS & SEARCH */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8">
            {/* POPRAWKA: Skalowanie kafelków statystyk */}
            <div className="flex gap-2 sm:gap-4 w-full sm:w-1/2">
              <div className="flex-1 bg-[#1c1c1e] border border-white/5 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col justify-center">
                <div className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5 sm:mb-1">Done Today</div>
                <div className="text-xl sm:text-2xl font-bold text-green-500 leading-none">{stats.today}</div>
              </div>
              <div className="flex-1 bg-[#1c1c1e] border border-white/5 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col justify-center">
                <div className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5 sm:mb-1">Total Done</div>
                <div className="text-xl sm:text-2xl font-bold text-[#3498db] leading-none">{stats.total}</div>
              </div>
            </div>

            <div className="w-full sm:w-1/2 flex flex-col gap-2 sm:gap-3">
              {/* Pasek wyszukiwania */}
              <div className="flex items-center bg-[#1c1c1e] border border-gray-800 rounded-2xl px-3 sm:px-4 shadow-sm focus-within:border-[#3498db] transition-colors">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input 
                  type="text" 
                  placeholder="Search tasks or list names..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-white px-2 sm:px-3 py-3 sm:py-4 focus:outline-none placeholder-gray-600 text-sm sm:text-base"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 text-gray-500 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                )}
              </div>
              
              {/* Dropdown Filtrowania List */}
              <div className="relative bg-[#1c1c1e] border border-gray-800 rounded-2xl shadow-sm focus-within:border-[#3498db] transition-colors">
                <select 
                  value={selectedListFilter} 
                  onChange={(e) => setSelectedListFilter(e.target.value)}
                  className="w-full bg-transparent text-white px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none appearance-none cursor-pointer text-sm sm:text-base"
                >
                  <option value="all">All Lists</option>
                  <option value="" disabled>──────────</option>
                  {taskLists.map(l => (
                    <option key={l.id} value={l.id}>{l.icon || (l.list_type === 'shopping' ? '🛒' : '📁')} {l.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {/* LISTY */}
          {completedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 mt-10 opacity-50 text-center">
              <span className="text-4xl sm:text-5xl mb-4">📭</span>
              <h2 className="text-lg sm:text-xl font-bold">History is empty.</h2>
              <p className="text-sm sm:text-base text-gray-400 mt-1">Complete some tasks to see them here.</p>
            </div>
          ) : (
            <>
              {renderTaskGroup("Today", groupedHistory.today, "text-green-500")}
              {renderTaskGroup("Yesterday", groupedHistory.yesterday, "text-[#3498db]")}
              {renderTaskGroup("Earlier This Week", groupedHistory.thisWeek, "text-orange-400")}
              {renderTaskGroup("Older", groupedHistory.older, "text-gray-500")}
              
              {(searchQuery || selectedListFilter !== 'all') && 
               groupedHistory.today.length === 0 && 
               groupedHistory.yesterday.length === 0 && 
               groupedHistory.thisWeek.length === 0 && 
               groupedHistory.older.length === 0 && (
                <div className="text-center text-sm sm:text-base text-gray-500 mt-10">
                  No matching tasks found.
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Modal Edytora Notatek */}
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