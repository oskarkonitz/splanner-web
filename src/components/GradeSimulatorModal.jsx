import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { calculateModuleAvg, calculateSubjectPercent } from '../views/GradesView';

// Subkomponent wiersza oceny - pozwala na trzymanie lokalnego stanu punktów (Got/Max)
const SimGradeRow = ({ grade, updateGrade, removeGrade }) => {
  const [ptsGot, setPtsGot] = useState('');
  const [ptsMax, setPtsMax] = useState('');

  const handlePtsChange = (field, val) => {
    if (field === 'got') setPtsGot(val);
    if (field === 'max') setPtsMax(val);

    const got = field === 'got' ? parseFloat(val.replace(',', '.')) : parseFloat(ptsGot.replace(',', '.'));
    const max = field === 'max' ? parseFloat(val.replace(',', '.')) : parseFloat(ptsMax.replace(',', '.'));

    if (max > 0 && !isNaN(got)) {
      updateGrade(grade.id, 'value', ((got / max) * 100).toFixed(1));
    }
  };

  return (
    <div className="flex flex-col p-3 bg-[#1c1c1e] rounded-xl border border-white/5 gap-2">
      {/* GÓRNY RZĄD: Opis i główne inputy */}
      <div className="flex items-center justify-between gap-2">
        <div className={`text-sm font-medium ${grade.isVirtual ? 'text-[#f39c12]' : 'text-gray-300'} truncate`}>
          {grade.desc}
        </div>
        
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="flex items-center gap-1 bg-black/20 px-2 py-1.5 rounded-lg border border-gray-700">
            <span className="text-gray-500 text-xs font-bold">W:</span>
            {/* Poszerzony input wagi */}
            <input type="number" step="0.1" value={grade.weight} onChange={(e) => updateGrade(grade.id, 'weight', e.target.value)} className="w-12 bg-transparent text-center text-white focus:outline-none text-sm" />
          </div>
          <div className="flex items-center gap-1 bg-black/20 px-2 py-1.5 rounded-lg border border-green-500/30">
            <span className="text-gray-500 text-xs font-bold">Val:</span>
            {/* Poszerzony input wartości */}
            <input type="number" step="0.1" value={grade.value} onChange={(e) => updateGrade(grade.id, 'value', e.target.value)} className="w-16 bg-transparent text-center text-green-500 font-bold focus:outline-none text-sm" />
          </div>
          <button onClick={() => removeGrade(grade.id)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/20 transition-colors ml-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      {/* DOLNY RZĄD: Przelicznik punktowy */}
      <div className="flex items-center justify-end gap-2 pr-10 text-sm mt-1">
         <span className="text-gray-500 text-xs font-bold mr-1">Pts ➡ %:</span>
         <input type="number" placeholder="Got" value={ptsGot} onChange={(e) => handlePtsChange('got', e.target.value)} className="w-14 bg-[#2b2b2b] text-center text-white py-1 px-2 rounded-md border border-gray-700 focus:outline-none text-xs" />
         <span className="text-gray-500 font-bold">/</span>
         <input type="number" placeholder="Max" value={ptsMax} onChange={(e) => handlePtsChange('max', e.target.value)} className="w-14 bg-[#2b2b2b] text-center text-white py-1 px-2 rounded-md border border-gray-700 focus:outline-none text-xs" />
      </div>
    </div>
  );
};

export default function GradeSimulatorModal({ isOpen, subjectId, onClose }) {
  const { gradeModules, grades } = useData();

  const [simModules, setSimModules] = useState([]);
  const [simGrades, setSimGrades] = useState([]);

  useEffect(() => {
    if (isOpen && subjectId) {
      setSimModules(gradeModules.filter(m => m.subject_id === subjectId).map(m => ({ ...m })));
      setSimGrades(grades.filter(g => g.subject_id === subjectId).map(g => ({ ...g })));
    }
  }, [isOpen, subjectId, gradeModules, grades]);

  if (!isOpen) return null;

  const realAvg = calculateSubjectPercent(subjectId, gradeModules, grades);
  const simAvg = calculateSubjectPercent(subjectId, simModules, simGrades);

  const addVirtualModule = () => {
    setSimModules([...simModules, { id: `vmod_${Date.now()}`, subject_id: subjectId, name: 'Virtual Module', weight: 20, isVirtual: true }]);
  };

  const removeModule = (id) => {
    setSimModules(simModules.filter(m => m.id !== id));
    setSimGrades(simGrades.filter(g => g.module_id !== id));
  };

  const addVirtualGrade = (modId) => {
    setSimGrades([...simGrades, { id: `vgrd_${Date.now()}`, subject_id: subjectId, module_id: modId, value: 100, weight: 1, desc: 'Simulated', isVirtual: true }]);
  };

  const removeGrade = (id) => {
    setSimGrades(simGrades.filter(g => g.id !== id));
  };

  const updateModWeight = (id, val) => {
    setSimModules(simModules.map(m => m.id === id ? { ...m, weight: parseFloat(val) || 0 } : m));
  };

  const updateGrade = (id, field, val) => {
    setSimGrades(simGrades.map(g => g.id === id ? { ...g, [field]: parseFloat(val) || 0 } : g));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-[85vh] md:w-full md:max-w-2xl flex flex-col md:rounded-3xl md:border md:border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        
        <header className="flex items-center justify-between p-4 px-6 border-b border-gray-800 shrink-0 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-[#f39c12]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            Interactive Simulator
          </h1>
          <button onClick={onClose} className="text-[#3498db] font-medium px-3 py-1 bg-[#3498db]/10 rounded-lg">Done</button>
        </header>

        <div className="p-4 bg-[#1c1c1e] border-b border-gray-800 flex justify-around items-center shrink-0">
          <div className="text-center">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Real Avg</div>
            <div className="text-2xl font-bold text-white">{realAvg !== null ? `${realAvg.toFixed(1)}%` : '--'}</div>
          </div>
          <div className="w-px h-10 bg-gray-700"></div>
          <div className="text-center">
            <div className="text-xs text-[#f39c12] font-bold uppercase tracking-wider">Simulated Avg</div>
            <div className={`text-3xl font-black ${simAvg !== null ? 'text-green-500' : 'text-gray-500'}`}>{simAvg !== null ? `${simAvg.toFixed(1)}%` : '--'}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 space-y-6">
          {simModules.map(mod => {
            const mGrades = simGrades.filter(g => g.module_id === mod.id);
            const mAvg = calculateModuleAvg(mGrades);

            return (
              <div key={mod.id} className="bg-[#2b2b2b] rounded-2xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-[#1c1c1e] border-b border-gray-800 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mod.isVirtual && (
                      <button onClick={() => removeModule(mod.id)} className="w-6 h-6 flex items-center justify-center rounded-full border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold transition-colors">X</button>
                    )}
                    <h3 className={`font-bold ${mod.isVirtual ? 'text-[#f39c12]' : 'text-white'}`}>{mod.name}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#3498db] whitespace-nowrap">Avg: {mAvg.toFixed(1)}%</span>
                    <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg border border-gray-700">
                      {/* Poszerzony input wagi modułu */}
                      <input type="number" step="0.1" value={mod.weight} onChange={(e) => updateModWeight(mod.id, e.target.value)} className="w-14 bg-transparent text-right text-white font-bold focus:outline-none" />
                      <span className="text-gray-500 text-sm font-bold">%</span>
                    </div>
                  </div>
                </div>

                <div className="p-2 space-y-2">
                  {mGrades.map(g => (
                    <SimGradeRow 
                      key={g.id} 
                      grade={g} 
                      updateGrade={updateGrade} 
                      removeGrade={removeGrade} 
                    />
                  ))}
                  
                  <button onClick={() => addVirtualGrade(mod.id)} className="w-full mt-2 py-2 border border-dashed border-[#f39c12]/50 text-[#f39c12] rounded-xl text-sm font-bold hover:bg-[#f39c12]/10 transition-colors">
                    + Virtual Grade
                  </button>
                </div>
              </div>
            );
          })}

          <button onClick={addVirtualModule} className="w-full py-4 border border-dashed border-[#8e44ad] text-[#8e44ad] rounded-2xl font-bold hover:bg-[#8e44ad]/10 transition-colors">
            + Add Virtual Module
          </button>
        </div>
      </div>
    </div>
  );
}