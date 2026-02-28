import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import SubjectFormModal from '../components/SubjectFormModal';
import SemesterFormModal from '../components/SemesterFormModal';

export default function SubjectsView({ onBack }) {
  const { 
    semesters, subjects, scheduleEntries, 
    deleteSubject, saveSemester, deleteSemester, setCurrentSemester 
  } = useData();

  // STANY GŁÓWNE
  const [selectedSemesterId, setSelectedSemesterId] = useState('ALL');
  const [mobileTab, setMobileTab] = useState('subjects'); // 'subjects' lub 'semesters'
  const [isInitialized, setIsInitialized] = useState(false);

  // STANY MODALI
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState(null);
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [semesterToEdit, setSemesterToEdit] = useState(null);

  // MENU KONTEKSTOWE
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type: 'subject' | 'semester', item }

  // Ustawienie domyślnego semestru na AKTUALNY
  useEffect(() => {
    if (!isInitialized && semesters && semesters.length > 0) {
      const cur = semesters.find(s => s.is_current);
      setSelectedSemesterId(cur ? cur.id : semesters[0].id);
      setIsInitialized(true);
    }
  }, [semesters, isInitialized]);

  // Zamykanie menu
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // FILTROWANIE
  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    if (selectedSemesterId === 'ALL') return subjects.sort((a,b) => a.name.localeCompare(b.name));
    return subjects.filter(s => s.semester_id === selectedSemesterId).sort((a,b) => a.name.localeCompare(b.name));
  }, [subjects, selectedSemesterId]);

  const sortedSemesters = useMemo(() => {
    if (!semesters) return [];
    return [...semesters].sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
      return new Date(b.start_date) - new Date(a.start_date);
    });
  }, [semesters]);

  // AKCJE KLIKNIĘĆ
  const handleContextMenu = (e, item, type) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 150),
      type,
      item
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] md:bg-[#1c1c1e] text-white relative">
      
      {/* HEADER */}
      <header className="flex flex-col pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-800 bg-[#1c1c1e] shrink-0 sticky top-0 z-30 shadow-md md:shadow-none">
        <div className="flex items-center justify-between p-4 px-6 pb-2">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="md:hidden p-2 -ml-2 text-[#3498db]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 className="text-2xl md:text-3xl font-bold">Subjects & Semesters</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* WIDOK DESKTOP: Przycisk Add Subject (Semestry mają własnego plusa w lewym panelu) */}
            <button 
              onClick={() => { setSubjectToEdit(null); setShowSubjectForm(true); }}
              className="hidden md:flex items-center gap-2 text-[#3498db] bg-[#3498db]/10 px-4 py-2 rounded-xl font-bold hover:bg-[#3498db]/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
              <span>Add Subject</span>
            </button>

            {/* WIDOK MOBILE: Dynamiczny przycisk plusa zależny od aktualnej zakładki */}
            <button 
              onClick={() => { 
                if (mobileTab === 'subjects') {
                  setSubjectToEdit(null); setShowSubjectForm(true);
                } else {
                  setSemesterToEdit(null); setShowSemesterForm(true);
                }
              }}
              className="md:hidden p-2 text-gray-400 hover:text-[#3498db] transition-colors"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
            </button>
          </div>
        </div>

        {/* MOBILE SEGMENTED CONTROL */}
        <div className="md:hidden flex bg-[#2b2b2b] p-1 rounded-xl mx-6 my-3 shadow-inner border border-gray-800">
          <button 
            onClick={() => setMobileTab('subjects')}
            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${mobileTab === 'subjects' ? 'bg-[#3498db] text-white shadow-md' : 'text-gray-400'}`}
          >
            Subjects
          </button>
          <button 
            onClick={() => setMobileTab('semesters')}
            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${mobileTab === 'semesters' ? 'bg-[#3498db] text-white shadow-md' : 'text-gray-400'}`}
          >
            Semesters
          </button>
        </div>
      </header>

      {/* GŁÓWNY WIDOK */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEWY PANEL (Semestry - Desktop Only / Mobile Tab) */}
        <div className={`w-full md:w-80 flex-col border-r border-gray-800 bg-[#121212] overflow-y-auto ${mobileTab === 'semesters' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-4 space-y-2">
            <h3 className="hidden md:flex text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 ml-2 items-center justify-between">
              Semesters
              <button onClick={() => { setSemesterToEdit(null); setShowSemesterForm(true); }} className="text-[#3498db] hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
              </button>
            </h3>

            {sortedSemesters.map(sem => (
              <div 
                key={sem.id}
                onClick={(e) => {
                  if (document.body.classList.contains('md:hidden')) {
                    handleContextMenu(e, sem, 'semester');
                  } else {
                    setSelectedSemesterId(sem.id);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, sem, 'semester')}
                className={`relative flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${selectedSemesterId === sem.id && !document.body.classList.contains('md:hidden') ? 'bg-[#3498db]/10 border-[#3498db]' : 'bg-[#1c1c1e] border-gray-800 hover:border-gray-600'}`}
              >
                <div>
                  <h4 className={`font-bold flex items-center gap-2 ${sem.is_current ? 'text-[#3498db]' : 'text-white'}`}>
                    {sem.is_current && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>}
                    {sem.name}
                  </h4>
                  <div className="text-xs text-gray-400 mt-1 font-medium">{sem.start_date} → {sem.end_date}</div>
                </div>
                
                <button 
                  onClick={(e) => handleContextMenu(e, sem, 'semester')}
                  className="hidden md:flex p-2 text-gray-500 hover:text-white rounded-md hover:bg-white/10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PRAWY PANEL (Przedmioty) */}
        <div className={`flex-1 flex-col bg-[#121212] md:bg-transparent ${mobileTab === 'subjects' ? 'flex' : 'hidden md:flex'}`}>
          
          <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b border-gray-800 md:bg-[#1c1c1e]">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-500 uppercase">View:</span>
              <select 
                value={selectedSemesterId} 
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="bg-transparent text-white font-bold text-lg focus:outline-none appearance-none cursor-pointer pr-4"
              >
                <option value="ALL">All Semesters</option>
                {semesters?.map(sem => <option key={sem.id} value={sem.id}>{sem.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
            <div className="max-w-4xl mx-auto">
              {filteredSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 mt-10 opacity-50 text-center">
                  <svg className="w-20 h-20 mb-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                  <h2 className="text-xl font-bold">No subjects found.</h2>
                  <p className="text-gray-400 mt-2 text-sm">Add your first subject to start planning classes and exams.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredSubjects.map(sub => {
                    const slotsCount = scheduleEntries?.filter(e => e.subject_id === sub.id).length || 0;
                    
                    // Ucinamy czas, zostawiamy tylko daty YYYY-MM-DD
                    const startDateStr = sub.start_datetime ? sub.start_datetime.substring(0, 10) : 'TBA';
                    const endDateStr = sub.end_datetime ? sub.end_datetime.substring(0, 10) : 'TBA';

                    return (
                      <div 
                        key={sub.id}
                        onClick={(e) => handleContextMenu(e, sub, 'subject')}
                        className="bg-[#1c1c1e] p-4 rounded-2xl flex items-center justify-between border border-gray-800 hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-10 rounded-full" style={{ backgroundColor: sub.color || '#3498db' }}></div>
                          <div>
                            <h3 className="font-bold text-lg text-white leading-tight">{sub.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                              <span className="font-semibold text-[#3498db]">{sub.short_name}</span>
                              <span>•</span>
                              <span>{slotsCount} classes/wk</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex flex-col items-end mr-4 opacity-70">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Duration</span>
                            {/* Tutaj wyświetlamy samą uciętą datę */}
                            <span className="text-sm font-medium">{startDateStr} - {endDateStr}</span>
                          </div>

                          <div className="bg-blue-500/10 text-[#3498db] px-3 py-1.5 rounded-lg font-bold text-sm shrink-0 border border-[#3498db]/20">
                            {sub.weight} ECTS
                          </div>
                          
                          <button className="hidden md:block p-1 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- MENU KONTEKSTOWE --- */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#1c1c1e] border border-gray-800 rounded-xl shadow-2xl py-1 w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.type === 'semester' && (
            <>
              <button onClick={() => { setSemesterToEdit(contextMenu.item); setShowSemesterForm(true); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
                Edit Semester
              </button>
              {!contextMenu.item.is_current && (
                <button onClick={() => { setCurrentSemester(contextMenu.item.id); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-[#3498db] hover:bg-white/10 transition-colors border-b border-gray-800">
                  Set as Current
                </button>
              )}
              <button onClick={() => { if(window.confirm(`Delete semester: ${contextMenu.item.name}? This will NOT delete subjects.`)) deleteSemester(contextMenu.item.id); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-white/10 transition-colors">
                Delete Semester
              </button>
            </>
          )}

          {contextMenu.type === 'subject' && (
            <>
              <button onClick={() => { setSubjectToEdit(contextMenu.item); setShowSubjectForm(true); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
                Edit Subject & Classes
              </button>
              <button onClick={() => { if(window.confirm(`Delete subject: ${contextMenu.item.name}?`)) deleteSubject(contextMenu.item.id); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-white/10 transition-colors">
                Delete Subject
              </button>
            </>
          )}
        </div>
      )}

      {/* --- MODALE --- */}
      <SemesterFormModal 
        isOpen={showSemesterForm} 
        initialData={semesterToEdit} 
        onClose={() => setShowSemesterForm(false)} 
        onSave={saveSemester}
      />

      <SubjectFormModal 
        isOpen={showSubjectForm} 
        initialData={subjectToEdit} 
        onClose={() => setShowSubjectForm(false)} 
      />

    </div>
  );
}