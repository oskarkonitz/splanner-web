import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import ExamFormModal from '../components/ExamFormModal';
import TopicFormModal from '../components/TopicFormModal';
import NoteEditorModal from '../components/NoteEditorModal';

export default function PlanView({ onBack }) {
  const { 
    exams, topics, subjects, toggleTopicStatus, deleteTopic, runPlanner, 
    saveExamNote, saveTopic, deleteExam 
  } = useData();

  const [expandedDates, setExpandedDates] = useState({});
  
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); 
  
  const [showExamForm, setShowExamForm] = useState(false);
  const [examToEdit, setExamToEdit] = useState(null);
  
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState(null);

  const [noteModalData, setNoteModalData] = useState(null); 

  // Stan do Drag & Drop (podświetlenie dnia nad którym jesteśmy)
  const [draggedOverDate, setDraggedOverDate] = useState(null);

  const todayStr = useMemo(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  }, []);

  const getDaysStatus = (dateStr) => {
    if (dateStr === todayStr) return "Today";
    const today = new Date(todayStr);
    const target = new Date(dateStr);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
  };

  const groupedPlan = useMemo(() => {
    const datesSet = new Set();
    
    topics.forEach(t => { if (t.scheduled_date) datesSet.add(t.scheduled_date); });
    exams.forEach(e => { if (e.date) datesSet.add(e.date); });

    const validDates = Array.from(datesSet)
      .filter(d => d >= todayStr)
      .sort((a, b) => a.localeCompare(b));

    return validDates.map(date => ({
      id: date,
      date: date,
      isToday: date === todayStr,
      topics: topics.filter(t => t.scheduled_date === date),
      exams: exams.filter(e => e.date === date)
    }));
  }, [topics, exams, todayStr]);

  useEffect(() => {
    setExpandedDates(prev => {
      if (prev[todayStr] === undefined) return { ...prev, [todayStr]: true };
      return prev;
    });
  }, [todayStr]);

  useEffect(() => {
    const closeMenus = () => { 
      setContextMenu(null); 
      setActionMenuOpen(false);
    };
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const toggleAccordion = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const handleContextMenu = (e, item, type) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 150),
      type: type,
      item: item
    });
  };

  const openNoteEditor = (e, item, type) => {
    e.stopPropagation();
    setNoteModalData({
      isOpen: true,
      id: item.id,
      type: type,
      content: item.note || '',
      title: type === 'exam' ? `Exam Note: ${item.title}` : `Topic Note: ${item.name}`
    });
    setContextMenu(null);
  };

  const handleSaveNote = async (newNote) => {
    if (!noteModalData) return;
    if (noteModalData.type === 'exam') {
      await saveExamNote(noteModalData.id, newNote);
    } else if (noteModalData.type === 'topic') {
      const topic = topics.find(t => t.id === noteModalData.id);
      if (topic) {
        await saveTopic({ ...topic, note: newNote });
      }
    }
  };

  const handlePlanUnscheduled = async () => {
    setActionMenuOpen(false);
    await runPlanner(true);
  };

  const handleRePlanEverything = async () => {
    setActionMenuOpen(false);
    if(window.confirm("Are you sure? This will rewrite all unlocked topics in your plan.")) {
      await runPlanner(false);
    }
  };

  // --- LOGIKA DRAG & DROP ---
  const handleDragStart = (e, topic) => {
    e.dataTransfer.setData('topicId', topic.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, date) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    if (draggedOverDate !== date) {
      setDraggedOverDate(date);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDraggedOverDate(null);
  };

  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    setDraggedOverDate(null);
    
    const topicId = e.dataTransfer.getData('topicId');
    if (!topicId) return;

    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    if (topic.scheduled_date === targetDate) return;

    if (topic.locked) {
      alert("This task is locked and cannot be moved via drag & drop. Unlock it in edit menu first.");
      return;
    }

    await saveTopic({ 
      ...topic, 
      scheduled_date: targetDate, 
      locked: true 
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] md:bg-[#1c1c1e] text-white relative">
      
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between p-4 px-6 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-800 bg-[#1c1c1e] shrink-0 sticky top-0 z-30 shadow-md md:shadow-none">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-[#3498db]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="text-2xl font-bold">Study Plan</h1>
        </div>

        {/* WIDOK MOBILE: Rozwijane menu z akcjami */}
        <div className="md:hidden flex items-center gap-2 relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setActionMenuOpen(!actionMenuOpen); }}
            className={`p-2 rounded-full transition-colors ${actionMenuOpen ? 'bg-white/10 text-white' : 'text-[#3498db] hover:bg-white/10'}`}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
          </button>
          
          {actionMenuOpen && (
            <div 
              className="absolute top-full right-0 mt-2 w-56 bg-[#2b2b2b] border border-gray-700 rounded-xl shadow-2xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => { setExamToEdit(null); setShowExamForm(true); setActionMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg transition-colors text-sm font-medium">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg> Add Exam
              </button>
              <div className="h-px bg-gray-800 my-1"></div>
              <button onClick={handlePlanUnscheduled} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg transition-colors text-sm font-medium text-[#f1c40f]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg> Plan Unscheduled
              </button>
              <button onClick={handleRePlanEverything} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium text-red-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Re-Plan Everything
              </button>
            </div>
          )}
        </div>

        {/* WIDOK DESKTOP: 3 ikony na stałe z tooltipami */}
        <div className="hidden md:flex items-center gap-2">
          <div className="relative group">
            <button onClick={() => { setExamToEdit(null); setShowExamForm(true); }} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
            </button>
            <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-max bg-[#2b2b2b] text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-700 shadow-xl pointer-events-none z-50">Add Exam</div>
          </div>
          <div className="relative group">
            <button onClick={handlePlanUnscheduled} className="p-2.5 text-[#f1c40f] hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
            </button>
            <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-max bg-[#2b2b2b] text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-700 shadow-xl pointer-events-none z-50">Plan Unscheduled</div>
          </div>
          <div className="relative group">
            <button onClick={handleRePlanEverything} className="p-2.5 text-red-500 hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
            <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-max bg-[#2b2b2b] text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-700 shadow-xl pointer-events-none z-50">Re-Plan Everything</div>
          </div>
        </div>
      </header>

      {/* --- ZAWARTOŚĆ --- */}
      <main className="flex-1 overflow-y-auto pb-32">
        
        {groupedPlan.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 mt-20 opacity-60 text-center">
            <svg className="w-20 h-20 mb-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <h2 className="text-xl font-bold">No upcoming exams.</h2>
            <p className="text-gray-400 mt-2 text-sm max-w-xs">Press the menu at the top right to add a new exam and topics to start planning.</p>
          </div>
        ) : (
          <>
            {/* ---------------------------------------------------- */}
            {/* WIDOK PWA / MOBILE (Harmonijka / Accordion)          */}
            {/* ---------------------------------------------------- */}
            <div className="md:hidden max-w-4xl mx-auto space-y-4 px-4 pt-4">
              {groupedPlan.map(plan => {
                const isExpanded = expandedDates[plan.date] ?? false;
                const isHovered = draggedOverDate === plan.date;
                
                return (
                  <div 
                    key={`mob_${plan.id}`} 
                    className={`bg-[#1c1c1e] rounded-2xl overflow-hidden border shadow-md transition-colors duration-200 ${isHovered ? 'border-[#3498db] bg-[#3498db]/10' : 'border-white/5'}`}
                    onDragOver={(e) => handleDragOver(e, plan.date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, plan.date)}
                  >
                    
                    <div 
                      className="flex flex-wrap gap-2 items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => toggleAccordion(plan.date)}
                    >
                      <span className={`font-bold ${plan.isToday ? 'text-[#3498db] text-lg' : 'text-gray-200'}`}>
                        {plan.isToday ? `Today (${plan.date})` : plan.date}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className={`flex gap-2 ${isExpanded ? 'hidden' : 'flex'}`}>
                          {plan.topics.length > 0 && (
                            <span className="bg-blue-500/15 text-[#3498db] px-2.5 py-1 rounded-md text-xs font-bold">
                              {plan.topics.length} topics
                            </span>
                          )}
                          {plan.exams.length > 0 && (
                            <span className="flex items-center gap-1 bg-red-500/15 text-red-500 px-2.5 py-1 rounded-md text-xs font-bold">
                              Exam
                            </span>
                          )}
                        </div>
                        <svg className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-800 bg-[#121212]/30 min-h-[50px]">
                        {plan.topics.length === 0 && plan.exams.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500 italic">Drop topic here...</div>
                        ) : (
                          <div className="flex flex-col">
                            
                            {/* Egzaminy Mobile */}
                            {plan.exams.map(exam => (
                              <div 
                                key={`ex_${exam.id}`} 
                                onClick={(e) => handleContextMenu(e, exam, 'exam')}
                                className="flex items-center justify-between p-4 border-b border-gray-800/50 bg-red-500/5 cursor-pointer active:bg-red-500/10"
                              >
                                <div className="flex items-center gap-3">
                                  <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd"/></svg>
                                  <span className="font-bold text-red-500 text-sm">EXAM: {exam.title} ({exam.subject})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {exam.note && (
                                    <span onClick={(e) => openNoteEditor(e, exam, 'exam')} className="text-xs text-red-300 bg-red-900/30 px-2 py-1 rounded-md">
                                      ✎ Note
                                    </span>
                                  )}
                                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                                </div>
                              </div>
                            ))}

                            {/* Tematy Mobile */}
                            {plan.topics.map(topic => {
                              const isDone = topic.status === 'done';
                              const exam = exams.find(e => e.id === topic.exam_id);
                              const subject = subjects?.find(s => s.id === exam?.subject_id);
                              const subjectColor = subject?.color || '#3498db';

                              return (
                                <div 
                                  key={topic.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, topic)}
                                  className={`flex items-stretch border-b border-gray-800/50 last:border-b-0 transition-colors hover:bg-white/5 active:bg-white/5 ${isDone ? 'opacity-50' : ''}`}
                                >
                                  {/* LEWA STRONA (TOGGLE) */}
                                  <div 
                                    className="flex items-center gap-3 p-4 pr-2 cursor-pointer w-2/5 shrink-0"
                                    onClick={(e) => { e.stopPropagation(); toggleTopicStatus(topic.id, topic.status); }}
                                  >
                                    <div className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                      {isDone && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
                                    </div>
                                    <span className="text-xs font-bold opacity-90 truncate" style={{ color: subjectColor }}>
                                      {exam?.subject || "Unknown Exam"}
                                    </span>
                                  </div>

                                  {/* PRAWA STRONA (MENU) */}
                                  <div 
                                    className="flex items-center justify-between flex-1 p-4 pl-0 cursor-pointer"
                                    onClick={(e) => handleContextMenu(e, topic, 'topic')}
                                  >
                                    <div className={`text-sm font-medium pr-2 ${isDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                      {topic.name}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                      {topic.locked && (
                                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                      )}
                                      {topic.note && (
                                        <span onClick={(e) => openNoteEditor(e, topic, 'topic')} className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded-md">
                                          ✎ Note
                                        </span>
                                      )}
                                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ---------------------------------------------------- */}
            {/* WIDOK DESKTOP (Oś czasu a'la Python Treeview)        */}
            {/* ---------------------------------------------------- */}
            <div className="hidden md:block max-w-5xl mx-auto pt-6 px-6">
              {groupedPlan.map(plan => {
                const isHovered = draggedOverDate === plan.date;

                return (
                  <div key={`desk_${plan.id}`} className="flex group">
                    
                    {/* LEWA KOLUMNA: Oś czasu i data */}
                    <div className="w-48 shrink-0 border-r-2 border-gray-700 relative py-4 pr-6 text-right">
                      <div className={`absolute right-[-9px] top-6 w-4 h-4 rounded-full border-4 transition-colors ${plan.isToday ? 'bg-[#3498db] border-[#3498db]' : 'bg-[#1c1c1e] border-gray-600 group-hover:border-gray-400'}`}></div>
                      
                      <div className={`text-lg font-bold ${plan.isToday ? 'text-[#3498db]' : 'text-gray-200'}`}>
                        {plan.date}
                      </div>
                      <div className={`text-sm font-medium mt-1 ${plan.isToday ? 'text-[#3498db]' : 'text-gray-500'}`}>
                        {getDaysStatus(plan.date)}
                      </div>
                    </div>

                    {/* PRAWA KOLUMNA: Obszar zrzutu (Dropzone) */}
                    <div 
                      className={`flex-1 py-4 pl-8 mb-6 rounded-2xl transition-colors duration-200 min-h-[60px] ${isHovered ? 'bg-[#3498db]/10 border border-[#3498db]/30' : ''}`}
                      onDragOver={(e) => handleDragOver(e, plan.date)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, plan.date)}
                    >
                      {plan.topics.length === 0 && plan.exams.length === 0 ? (
                        <div className="text-gray-500 italic mt-2 opacity-50">Drop topics here...</div>
                      ) : (
                        <div className="space-y-1.5">
                          
                          {/* Egzaminy Desktop */}
                          {plan.exams.map(exam => (
                            <div 
                              key={`desk_ex_${exam.id}`} 
                              onClick={(e) => handleContextMenu(e, exam, 'exam')}
                              className="flex items-center justify-between py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer group/exrow"
                            >
                              <div className="flex items-center gap-4">
                                <svg className="w-5 h-5 text-red-500 shrink-0 ml-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd"/></svg>
                                <span className="font-bold text-red-400">EXAM: {exam.title} ({exam.subject})</span>
                              </div>
                              
                              <div className="flex items-center gap-2 pr-1">
                                {exam.note && (
                                  <span onClick={(e) => openNoteEditor(e, exam, 'exam')} className="text-xs text-red-300 bg-red-900/40 px-2 py-1 rounded-md hover:text-white transition-colors cursor-pointer">
                                    ✎ Note
                                  </span>
                                )}
                                <svg className="w-4 h-4 text-red-400 opacity-0 group-hover/exrow:opacity-100 transition-opacity hover:text-red-300 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                              </div>
                            </div>
                          ))}

                          {/* Tematy Desktop */}
                          {plan.topics.map(topic => {
                            const isDone = topic.status === 'done';
                            const exam = exams.find(e => e.id === topic.exam_id);
                            const subject = subjects?.find(s => s.id === exam?.subject_id);
                            const subjectColor = subject?.color || '#3498db';
                            
                            return (
                              <div 
                                key={`desk_top_${topic.id}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, topic)}
                                className={`flex items-stretch rounded-xl border border-transparent hover:border-gray-700 hover:bg-white/5 transition-colors group/row ${isDone ? 'opacity-50' : ''}`}
                              >
                                {/* LEWA STRONA (TOGGLE) */}
                                <div 
                                  className="flex items-center gap-4 py-2.5 px-3 cursor-pointer shrink-0"
                                  onClick={(e) => { e.stopPropagation(); toggleTopicStatus(topic.id, topic.status); }}
                                >
                                  <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-gray-400'}`}>
                                    {isDone && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
                                  </div>
                                  
                                  <div className="w-32 font-bold truncate text-sm" style={{ color: subjectColor }}>
                                    {exam?.subject || "Unknown"}
                                  </div>
                                </div>

                                {/* PRAWA STRONA (MENU) */}
                                <div 
                                  className="flex items-center justify-between flex-1 py-2.5 pr-3 cursor-pointer"
                                  onClick={(e) => handleContextMenu(e, topic, 'topic')}
                                >
                                  <div className={`text-sm font-medium truncate ${isDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                    {topic.name}
                                  </div>

                                  <div className="flex items-center gap-2 pl-4">
                                    {topic.locked && (
                                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    )}
                                    {topic.note && (
                                      <span onClick={(e) => openNoteEditor(e, topic, 'topic')} className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded-md hover:text-white transition-colors cursor-pointer">
                                        ✎ Note
                                      </span>
                                    )}
                                    <svg className="w-4 h-4 text-gray-500 opacity-0 group-hover/row:opacity-100 transition-opacity hover:text-white ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* --- MENU KONTEKSTOWE --- */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#1c1c1e] border border-gray-800 rounded-xl shadow-2xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.type === 'topic' && (
            <>
              <button onClick={() => { setTopicToEdit(contextMenu.item); setShowTopicForm(true); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
                Edit Topic Details
              </button>
              <button onClick={(e) => openNoteEditor(e, contextMenu.item, 'topic')} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
                Edit Note
              </button>

              {/* DODANE: LOCK / UNLOCK TOPIC */}
              <button
                onClick={() => { 
                  saveTopic({ ...contextMenu.item, locked: !contextMenu.item.locked }); 
                  setContextMenu(null); 
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-orange-400 hover:bg-white/10 transition-colors border-b border-gray-800"
              >
                {contextMenu.item.locked ? 'Unlock Topic' : 'Lock Topic'}
              </button>

              <button onClick={() => { toggleTopicStatus(contextMenu.item.id, contextMenu.item.status); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-green-500 hover:bg-white/10 transition-colors border-b border-gray-800">
                {contextMenu.item.status === 'done' ? 'Mark as Todo' : 'Mark as Done'}
              </button>
              <button onClick={() => { if(window.confirm(`Delete topic: ${contextMenu.item.name}?`)) deleteTopic(contextMenu.item.id); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-white/10 transition-colors">
                Delete Topic
              </button>
            </>
          )}

          {contextMenu.type === 'exam' && (
            <>
              <button onClick={() => { setExamToEdit(contextMenu.item); setShowExamForm(true); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
                Edit Exam
              </button>
              <button onClick={(e) => openNoteEditor(e, contextMenu.item, 'exam')} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
                Edit Note
              </button>
              <button onClick={() => { if(window.confirm(`Delete exam: ${contextMenu.item.title}?`)) deleteExam(contextMenu.item.id); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-white/10 transition-colors">
                Delete Exam
              </button>
            </>
          )}
        </div>
      )}

      {/* --- MODALE --- */}
      <ExamFormModal isOpen={showExamForm} initialData={examToEdit} onClose={() => setShowExamForm(false)} />
      <TopicFormModal isOpen={showTopicForm} topic={topicToEdit} onClose={() => setShowTopicForm(false)} />
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