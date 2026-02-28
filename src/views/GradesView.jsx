import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import GradeModuleFormModal from '../components/GradeModuleFormModal';
import GradeFormModal from '../components/GradeFormModal';
import GradeSimulatorModal from '../components/GradeSimulatorModal';

const THRESHOLDS = [
  { grade: 5.0, minPercent: 90.0 },
  { grade: 4.5, minPercent: 80.0 },
  { grade: 4.0, minPercent: 70.0 },
  { grade: 3.5, minPercent: 60.0 },
  { grade: 3.0, minPercent: 50.0 }
];

const percentToGrade = (percent) => {
  if (percent === null || percent === undefined) return null;
  for (let t of THRESHOLDS) {
    if (percent >= t.minPercent) return t.grade;
  }
  return 2.0;
};

// Logika 1:1 z Advanced Mode
export const calculateModuleAvg = (grades) => {
  if (!grades || grades.length === 0) return 0.0; // Pusty moduł daje 0%
  let sumW = 0.0;
  let weightedSum = 0.0;
  for (let g of grades) {
    const w = g.weight || 0.0;
    sumW += w;
    weightedSum += g.value * w;
  }
  return sumW === 0 ? 0 : (weightedSum / sumW);
};

export const calculateSubjectPercent = (subjectId, allModules, allGrades) => {
  const modules = allModules.filter(m => m.subject_id === subjectId);
  const subjectGrades = allGrades.filter(g => g.subject_id === subjectId);

  let totalWeightedScore = 0.0;
  let totalGradedWeight = 0.0;
  let hasAnyGrade = false;

  for (let mod of modules) {
    const modGrades = subjectGrades.filter(g => g.module_id === mod.id);
    const moduleWeightFactor = (mod.weight || 0.0) / 100.0;
    
    totalGradedWeight += moduleWeightFactor;

    if (modGrades.length > 0) {
      let sumW = 0.0;
      let weightedSum = 0.0;
      for (let g of modGrades) {
        const weight = g.weight || 0.0;
        sumW += weight;
        weightedSum += g.value * weight;
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

export default function GradesView({ onBack }) {
  const { semesters, subjects, gradeModules, grades, deleteGradeModule, deleteGrade } = useData();

  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  
  const [gradeToEdit, setGradeToEdit] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // Zamykanie context menu
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    if (semesters?.length > 0 && selectedSemester === 'ALL') {
      const current = semesters.find(s => s.is_current);
      if (current) setSelectedSemester(current.id);
    }
  }, [semesters]);

  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    if (selectedSemester === 'ALL') return subjects.sort((a,b) => a.name.localeCompare(b.name));
    return subjects.filter(s => s.semester_id === selectedSemester).sort((a,b) => a.name.localeCompare(b.name));
  }, [subjects, selectedSemester]);

  const activeSubjectEnriched = useMemo(() => {
    if (!selectedSubject) return null;
    return filteredSubjects.find(s => s.id === selectedSubject.id);
  }, [selectedSubject, filteredSubjects]);

  const gpa = useMemo(() => {
    let totalECTS = 0.0;
    let weightedSum = 0.0;

    for (const sub of filteredSubjects) {
      const percent = calculateSubjectPercent(sub.id, gradeModules, grades);
      if (percent !== null) {
        const grade = percentToGrade(percent);
        const ects = sub.weight || 0.0;
        if (ects > 0) {
          weightedSum += grade * ects;
          totalECTS += ects;
        }
      }
    }
    return totalECTS === 0 ? null : (weightedSum / totalECTS);
  }, [filteredSubjects, gradeModules, grades]);

  const handleContextMenu = (e, item, type) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 150),
      type, item
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#2b2b2b] text-white">
      
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-800 gap-4 shrink-0 bg-[#1c1c1e]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 text-[#3498db]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="text-xl md:text-2xl font-bold">Grades</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium hidden md:block">Semester:</span>
          <select 
            value={selectedSemester} 
            onChange={(e) => { setSelectedSemester(e.target.value); setSelectedSubject(null); }}
            className="bg-[#2b2b2b] text-white border border-gray-800 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-8"
          >
            <option value="ALL">All Semesters</option>
            {semesters?.map(sem => <option key={sem.id} value={sem.id}>{sem.name}</option>)}
          </select>
        </div>
      </header>

      {/* COMPACT GPA CARD (Mobile) */}
      <div className="md:hidden px-4 py-3 bg-[#1c1c1e] border-b border-gray-800 shrink-0">
        <div className="bg-[#2b2b2b] rounded-2xl p-4 flex items-center justify-between shadow-sm border border-white/5">
          <span className="font-bold text-gray-400">Overall GPA</span>
          <span className={`text-3xl font-bold ${gpa ? (gpa >= 4.0 ? 'text-green-500' : (gpa >= 3.0 ? 'text-orange-400' : 'text-red-500')) : 'text-gray-500'}`}>
            {gpa ? gpa.toFixed(2) : '--'}
          </span>
        </div>
      </div>

      {/* MASTER-DETAIL */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEWY PANEL (Subjects) */}
        <div className={`w-full md:w-[35%] lg:w-[30%] flex-col border-r border-gray-800 bg-[#121212] overflow-y-auto ${selectedSubject ? 'hidden md:flex' : 'flex'}`}>
          
          <div className="hidden md:flex p-6 items-center justify-between border-b border-gray-800 shrink-0 bg-[#1c1c1e]">
            <span className="font-bold text-gray-400">Overall GPA</span>
            <span className={`text-3xl font-bold ${gpa ? (gpa >= 4.0 ? 'text-green-500' : (gpa >= 3.0 ? 'text-orange-400' : 'text-red-500')) : 'text-gray-500'}`}>
              {gpa ? gpa.toFixed(2) : '--'}
            </span>
          </div>

          <div className="p-4 space-y-2 pb-32">
            {filteredSubjects.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No subjects in this semester.</div>
            ) : (
              filteredSubjects.map(sub => {
                const percent = calculateSubjectPercent(sub.id, gradeModules, grades);
                const grade = percentToGrade(percent);
                const isSelected = selectedSubject?.id === sub.id;

                return (
                  <div 
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub)}
                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-[#3498db]/10 border-[#3498db] shadow-sm' : 'bg-[#1c1c1e] border-gray-800 hover:border-gray-600'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: sub.color || '#3498db' }}></div>
                      <div>
                        <h4 className={`font-bold line-clamp-1 ${isSelected ? 'text-[#3498db]' : 'text-white'}`}>{sub.name}</h4>
                        <div className="text-xs text-gray-500 mt-0.5">{sub.weight} ECTS</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {percent !== null ? (
                        <>
                          <div className={`text-xl font-bold ${grade >= 4.0 ? 'text-green-500' : (grade >= 3.0 ? 'text-orange-400' : 'text-red-500')}`}>
                            {grade.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-400">{percent.toFixed(1)}%</div>
                        </>
                      ) : (
                        <div className="text-xl font-bold text-gray-600">--</div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* PRAWY PANEL (Grades & Modules) */}
        <div className={`flex-1 flex-col bg-[#1c1c1e] relative ${selectedSubject ? 'flex' : 'hidden md:flex'}`}>
          {!activeSubjectEnriched ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 pointer-events-none p-6 text-center">
              <svg className="w-24 h-24 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              <h2 className="text-xl font-bold">Select a subject to view grades</h2>
            </div>
          ) : (() => {
            const subjectModules = gradeModules.filter(m => m.subject_id === activeSubjectEnriched.id);
            const subjectPercent = calculateSubjectPercent(activeSubjectEnriched.id, gradeModules, grades);
            const subjectGrade = percentToGrade(subjectPercent);

            return (
              <>
                {/* NAGŁÓWEK SZCZEGÓŁÓW */}
                <div className="px-6 py-4 border-b border-gray-800 bg-[#2b2b2b] shrink-0">
                  <div className="flex items-center gap-3 mb-2 md:hidden">
                    <button onClick={() => setSelectedSubject(null)} className="flex items-center text-[#3498db] font-medium p-1 -ml-1">
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
                      Back
                    </button>
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeSubjectEnriched.color || '#3498db' }}></div>
                        {activeSubjectEnriched.name}
                      </h2>
                      <div className="text-gray-400 text-sm">
                        Average: <span className="text-white font-bold">{subjectPercent !== null ? `${subjectPercent.toFixed(1)}%` : '--'}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-3xl font-black ${subjectGrade ? (subjectGrade >= 4.0 ? 'text-green-500' : (subjectGrade >= 3.0 ? 'text-orange-400' : 'text-red-500')) : 'text-gray-500'}`}>
                        {subjectGrade ? subjectGrade.toFixed(1) : '--'}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Grade</div>
                    </div>
                  </div>
                </div>

                {/* PRZYCISKI AKCJI */}
                <div className="p-4 flex gap-2 border-b border-gray-800 bg-[#1c1c1e] shrink-0 overflow-x-auto scrollbar-hide">
                  <button onClick={() => setShowModuleForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                    <svg className="w-4 h-4 text-[#3498db]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
                    + Module
                  </button>
                  <button onClick={() => { setGradeToEdit(null); setShowGradeForm(true); }} disabled={subjectModules.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    + Grade
                  </button>
                  <div className="w-px bg-gray-700 mx-1"></div>
                  <button onClick={() => setShowSimulator(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f39c12]/10 hover:bg-[#f39c12]/20 text-[#f39c12] rounded-lg text-sm font-bold transition-colors whitespace-nowrap ml-auto">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                    Simulator
                  </button>
                </div>

                {/* ZAWARTOŚĆ (MODUŁY) */}
                <div className="flex-1 overflow-y-auto p-4 pb-32">
                  <div className="max-w-3xl mx-auto space-y-6">
                    {subjectModules.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-gray-700 rounded-2xl">
                        <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                        <h3 className="text-lg font-bold text-gray-400">No modules yet</h3>
                        <p className="text-sm text-gray-500 mt-1">In Advanced Mode, add at least one module (e.g. Exams 60%) before adding grades.</p>
                      </div>
                    ) : (
                      subjectModules.map(mod => {
                        const modGrades = grades.filter(g => g.module_id === mod.id);
                        const avg = calculateModuleAvg(modGrades);

                        return (
                          <div key={mod.id} className="bg-[#2b2b2b] rounded-2xl overflow-hidden shadow-lg border border-white/5">
                            <div className="px-4 py-3 bg-[#1c1c1e] border-b border-gray-800 flex items-center justify-between">
                              <h3 className="font-bold text-gray-200">
                                {mod.name} <span className="text-gray-500 font-normal">({mod.weight}%)</span>
                              </h3>
                              <div className="flex items-center gap-4">
                                <span className={`text-sm font-bold ${avg === 0 ? 'text-gray-500' : 'text-[#3498db]'}`}>
                                  Avg: {avg.toFixed(1)}%
                                </span>
                                <button onClick={(e) => handleContextMenu(e, mod, 'module')} className="text-gray-500 hover:text-white transition-colors">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                                </button>
                              </div>
                            </div>

                            {modGrades.length === 0 ? (
                              <div className="p-4 text-center text-sm text-gray-600 italic">No grades in this module.</div>
                            ) : (
                              <div className="divide-y divide-gray-800/50">
                                {modGrades.map(grade => (
                                  <div key={grade.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-200">{grade.desc || "Untitled"}</div>
                                      {grade.date && <div className="text-xs text-gray-500 mt-0.5">{grade.date}</div>}
                                    </div>
                                    <div className="flex items-center gap-6">
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-white">{grade.value.toFixed(1)}%</div>
                                        <div className="text-[10px] text-gray-500">W: {grade.weight}</div>
                                      </div>
                                      <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                        <button onClick={() => { setGradeToEdit(grade); setShowGradeForm(true); }} className="p-1.5 text-gray-400 hover:text-[#3498db] bg-white/5 rounded-md hover:bg-white/10">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        </button>
                                        <button onClick={() => { if(window.confirm('Delete grade?')) deleteGrade(grade.id); }} className="p-1.5 text-gray-400 hover:text-red-500 bg-white/5 rounded-md hover:bg-red-500/10">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                      </div>
                                      <button onClick={(e) => handleContextMenu(e, grade, 'grade')} className="md:hidden text-gray-500 p-2 -mr-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </main>

      {/* KONTEKSTOWE MENU */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#1c1c1e] border border-gray-800 rounded-xl shadow-2xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.type === 'module' && (
            <button onClick={() => { if(window.confirm('Delete module and ALL its grades?')) deleteGradeModule(contextMenu.item.id); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-white/10 transition-colors">
              Delete Module
            </button>
          )}
          {contextMenu.type === 'grade' && (
            <>
              <button onClick={() => { setGradeToEdit(contextMenu.item); setShowGradeForm(true); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
                Edit Grade
              </button>
              <button onClick={() => { if(window.confirm('Delete grade?')) deleteGrade(contextMenu.item.id); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-white/10 transition-colors">
                Delete Grade
              </button>
            </>
          )}
        </div>
      )}

      {/* MODALE */}
      <GradeModuleFormModal isOpen={showModuleForm} subjectId={selectedSubject?.id} onClose={() => setShowModuleForm(false)} />
      <GradeFormModal isOpen={showGradeForm} subjectId={selectedSubject?.id} gradeToEdit={gradeToEdit} onClose={() => setShowGradeForm(false)} />
      <GradeSimulatorModal isOpen={showSimulator} subjectId={selectedSubject?.id} onClose={() => setShowSimulator(false)} />

    </div>
  );
}