import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import ExamFormModal from '../components/ExamFormModal';
import TopicFormModal from '../components/TopicFormModal';

export default function ArchiveView({ onBack }) {
  const { 
    subjects, exams, topics, semesters, 
    deleteExam, toggleTopicStatus, saveExamNote 
  } = useData();

  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [selectedExam, setSelectedExam] = useState(null);
  const [examNote, setExamNote] = useState('');

  const [contextMenu, setContextMenu] = useState(null);
  const [showExamForm, setShowExamForm] = useState(false);
  const [examToEdit, setExamToEdit] = useState(null);
  
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    if (selectedExam) {
      setExamNote(selectedExam.note || '');
    }
  }, [selectedExam]);

  const getDaysStatus = (dateStr) => {
    if (!dateStr) return { text: "TBA", color: "text-gray-500" };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const exDate = new Date(dateStr);
    exDate.setHours(0,0,0,0);
    
    const diffTime = exDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Archived", color: "text-gray-500" };
    if (diffDays === 0) return { text: "Today", color: "text-[#3498db]" };
    return { text: `In ${diffDays} days`, color: "text-green-500" };
  };

  const groupedData = useMemo(() => {
    if (!subjects || !exams) return [];

    const filteredSubjects = selectedSemester === 'ALL' 
      ? subjects 
      : subjects.filter(s => s.semester_id === selectedSemester);

    const result = [];

    filteredSubjects.forEach(sub => {
      const subExams = exams
        .filter(e => e.subject_id === sub.id)
        .sort((a, b) => (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99"));

      if (subExams.length > 0) {
        const enrichedExams = subExams.map(ex => {
          const exTopics = topics?.filter(t => t.exam_id === ex.id) || [];
          const total = exTopics.length;
          const done = exTopics.filter(t => t.status === 'done').length;
          
          return {
            ...ex,
            progress: total > 0 ? `${done}/${total}` : '0/0',
            progressPct: total > 0 ? Math.round((done / total) * 100) : 0,
            status: getDaysStatus(ex.date)
          };
        });

        result.push({
          subject: sub,
          exams: enrichedExams
        });
      }
    });

    return result.sort((a, b) => a.subject.name.localeCompare(b.subject.name));
  }, [subjects, exams, topics, selectedSemester]);

  const currentTopics = useMemo(() => {
    if (!selectedExam || !topics) return [];
    return topics
      .filter(t => t.exam_id === selectedExam.id)
      .sort((a, b) => (a.scheduled_date || "9999").localeCompare(b.scheduled_date || "9999"));
  }, [selectedExam, topics]);

  const handleContextMenu = (e, exam, subject) => {
    e.stopPropagation();
    e.preventDefault();
    
    const examDataForModal = { ...exam, subjectName: subject.name };

    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 150),
      exam: examDataForModal
    });
  };

  const activeExamEnriched = useMemo(() => {
    if (!selectedExam) return null;
    for (const group of groupedData) {
      const found = group.exams.find(e => e.id === selectedExam.id);
      if (found) return { ...found, subject: group.subject };
    }
    return null;
  }, [selectedExam, groupedData]);

  const handleNoteBlur = () => {
    if (selectedExam && examNote !== selectedExam.note) {
      saveExamNote(selectedExam.id, examNote);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#2b2b2b] text-white">
      
      {/* HEADER Z SAFE AREA TOP */}
      <header className="flex flex-wrap items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-800 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 text-[#3498db]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="text-xl md:text-2xl font-bold">Exam Archive</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium hidden md:block">Semester:</span>
          <select 
            value={selectedSemester} 
            onChange={(e) => { setSelectedSemester(e.target.value); setSelectedExam(null); }}
            className="bg-[#1c1c1e] text-white border border-gray-800 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-8 relative"
          >
            <option value="ALL">All Semesters</option>
            {semesters?.map(sem => (
              <option key={sem.id} value={sem.id}>
                {sem.name} {sem.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* MASTER-DETAIL */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEWY PANEL */}
        <div className={`w-full md:w-[35%] lg:w-[30%] flex-col border-r border-gray-800 bg-[#121212] overflow-y-auto ${selectedExam ? 'hidden md:flex' : 'flex'}`}>
          {groupedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-50 p-6 text-center">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-gray-400">No exams found in this semester.</p>
            </div>
          ) : (
            <div className="p-4 space-y-6 pb-32"> {/* Dodany grubszy padding dolny */}
              {groupedData.map(group => (
                <div key={group.subject.id} className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.subject.color || '#3498db' }}></div>
                    {group.subject.name}
                  </h3>
                  
                  <div className="flex flex-col gap-2">
                    {group.exams.map(exam => {
                      const isSelected = selectedExam?.id === exam.id;
                      return (
                        <div 
                          key={exam.id}
                          onClick={() => setSelectedExam(exam)}
                          className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-[#3498db]/10 border-[#3498db] shadow-sm' : 'bg-[#1c1c1e] border-gray-800 hover:border-gray-600'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-bold ${isSelected ? 'text-[#3498db]' : 'text-white'}`}>{exam.title}</h4>
                            <button 
                              onClick={(e) => handleContextMenu(e, exam, group.subject)}
                              className="p-1 -mr-2 -mt-1 text-gray-500 hover:text-white transition-colors"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/></svg>
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                              {exam.date}
                            </span>
                            <span className={`font-bold ${exam.status.color}`}>{exam.status.text}</span>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-[#3498db] transition-all" style={{ width: `${exam.progressPct}%` }}></div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium w-8 text-right">{exam.progressPct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRAWY PANEL */}
        <div className={`flex-1 flex-col bg-[#1c1c1e] relative ${selectedExam ? 'flex' : 'hidden md:flex'}`}>
          {!activeExamEnriched ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 pointer-events-none p-6 text-center">
              <svg className="w-24 h-24 mb-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <h2 className="text-xl font-bold">Select an exam to view details</h2>
            </div>
          ) : (
            <>
              {/* NAGŁÓWEK SZCZEGÓŁÓW */}
              <div className="px-6 py-4 border-b border-gray-800 bg-[#2b2b2b] shrink-0">
                <div className="flex items-center gap-3 mb-2 md:hidden">
                  <button onClick={() => setSelectedExam(null)} className="flex items-center text-[#3498db] font-medium p-1 -ml-1">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
                    Back to list
                  </button>
                </div>

                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeExamEnriched.subject.color || '#3498db' }}></div>
                      {activeExamEnriched.subject.name}
                    </h2>
                    <div className="text-gray-400 flex items-center gap-3">
                      <span className="font-medium text-white">{activeExamEnriched.title}</span>
                      <span>•</span>
                      <span>{activeExamEnriched.date} at {activeExamEnriched.time?.substring(0,5) || "TBA"}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-3xl font-black text-[#3498db]">{activeExamEnriched.progressPct}%</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Progress</div>
                  </div>
                </div>
              </div>

              {/* ZAWARTOŚĆ (TEMATY + NOTATNIK) */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-40">
                <div className="max-w-3xl mx-auto flex flex-col gap-8">
                  
                  {/* SEKCJA 1: TEMATY */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex justify-between items-end">
                      Topics to study
                      <span className="text-sm font-medium text-gray-500">{activeExamEnriched.progress} completed</span>
                    </h3>
                    
                    {currentTopics.length === 0 ? (
                      <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-gray-700 text-gray-400">
                        No topics assigned to this exam. Edit the exam to add them.
                      </div>
                    ) : (
                      <div className="bg-[#2b2b2b] rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                        {currentTopics.map((topic, idx) => (
                          <div 
                            key={topic.id}
                            className={`w-full flex items-center justify-between p-4 text-left transition-colors border-b border-gray-800 last:border-0 hover:bg-white/5 ${topic.status === 'done' ? 'bg-[#2b2b2b]/50' : ''}`}
                          >
                            <div 
                              className="flex items-center gap-4 flex-1 cursor-pointer"
                              onClick={() => toggleTopicStatus(topic.id, topic.status)}
                            >
                              <div className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${topic.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                {topic.status === 'done' && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
                              </div>
                              <div className="flex-1">
                                <span className={`text-base font-medium transition-all ${topic.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                  {idx + 1}. {topic.name}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              {topic.scheduled_date && (
                                <span className="text-xs font-bold text-gray-500 bg-black/20 px-2 py-1 rounded-md">
                                  {topic.scheduled_date}
                                </span>
                              )}
                              <button 
                                onClick={() => { setTopicToEdit(topic); setShowTopicForm(true); }}
                                className="p-2 text-gray-500 hover:text-[#3498db] transition-colors bg-white/5 rounded-xl hover:bg-white/10"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SEKCJA 2: NOTATNIK */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#f1c40f]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      Exam Notebook
                      <span className="text-xs font-normal text-gray-500 ml-2">(Auto-saves on blur)</span>
                    </h3>
                    <textarea 
                      value={examNote}
                      onChange={(e) => setExamNote(e.target.value)}
                      onBlur={handleNoteBlur}
                      placeholder="Write your exam details, links, or references here..."
                      className="w-full h-48 bg-[#2b2b2b] text-gray-300 placeholder-gray-600 rounded-2xl border border-white/5 p-5 focus:outline-none focus:border-[#3498db] shadow-xl resize-none leading-relaxed"
                    />
                  </div>

                </div>
              </div>

              {/* POPRAWKA BOTTOM-28 DLA TELEFONU */}
              <div className="absolute bottom-28 md:bottom-6 right-6 flex gap-3">
                <button 
                  onClick={() => { setExamToEdit(activeExamEnriched); setShowExamForm(true); }}
                  className="bg-[#3498db] text-white px-5 py-3 rounded-full font-bold shadow-lg shadow-[#3498db]/30 hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  Edit Exam
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* MODALE I MENU */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#1c1c1e] border border-gray-800 rounded-xl shadow-2xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setExamToEdit(contextMenu.exam); setShowExamForm(true); setContextMenu(null); }}
            className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800"
          >
            Edit Exam
          </button>
          <button
            onClick={() => { 
              if(window.confirm(`Delete ${contextMenu.exam.title}?`)) {
                deleteExam(contextMenu.exam.id);
                if (selectedExam?.id === contextMenu.exam.id) setSelectedExam(null);
              }
              setContextMenu(null); 
            }}
            className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-white/10 transition-colors"
          >
            Delete Exam
          </button>
        </div>
      )}

      <ExamFormModal isOpen={showExamForm} initialData={examToEdit} onClose={() => setShowExamForm(false)} />
      <TopicFormModal isOpen={showTopicForm} topic={topicToEdit} onClose={() => setShowTopicForm(false)} />

    </div>
  );
}