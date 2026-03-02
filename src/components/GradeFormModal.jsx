import { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';

export default function GradeFormModal({ isOpen, subjectId, gradeToEdit, onClose }) {
  const { gradeModules, saveGrade } = useData();
  
  const [isCounter, setIsCounter] = useState(false);
  const [desc, setDesc] = useState('');
  const [moduleId, setModuleId] = useState('');
  
  // Pola punktowe
  const [ptsGot, setPtsGot] = useState('');
  const [ptsMax, setPtsMax] = useState('');
  const [ptsMultiplier, setPtsMultiplier] = useState('1');
  
  const [val, setVal] = useState('');
  const [weight, setWeight] = useState('1');
  const [date, setDate] = useState('');

  const subjectModules = useMemo(() => {
    return gradeModules.filter(m => m.subject_id === subjectId);
  }, [gradeModules, subjectId]);

  useEffect(() => {
    if (isOpen) {
      if (gradeToEdit) {
        setIsCounter(gradeToEdit.is_counter || false);
        setDesc(gradeToEdit.desc || '');
        setModuleId(gradeToEdit.module_id || '');
        setVal(gradeToEdit.value?.toString() || '');
        
        const initialWeight = gradeToEdit.weight !== undefined && gradeToEdit.weight !== null 
          ? gradeToEdit.weight.toString() 
          : '1';
        setWeight(initialWeight);
        
        setDate(gradeToEdit.date || '');
        
        if (gradeToEdit.is_counter) {
          setPtsGot(gradeToEdit.points?.toString() || '0');
          setPtsMax(gradeToEdit.points_max?.toString() || '');
          // NAPRAWA: Jeśli mnożnik wynosił 0, to prawidłowo załaduje "0"
          const mult = gradeToEdit.points_multiplier !== undefined && gradeToEdit.points_multiplier !== null
            ? gradeToEdit.points_multiplier.toString()
            : '1';
          setPtsMultiplier(mult);
        } else {
          setPtsGot(gradeToEdit.points?.toString() || ''); 
          setPtsMax(gradeToEdit.points_max?.toString() || '');
          setPtsMultiplier('1');
        }
      } else {
        setIsCounter(false);
        setDesc('');
        setModuleId(subjectModules.length > 0 ? subjectModules[0].id : '');
        setVal(''); setWeight('1'); setPtsGot(''); setPtsMax(''); setPtsMultiplier('1');
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, gradeToEdit, subjectModules]);

  useEffect(() => {
    if (!isCounter) {
      const got = parseFloat(String(ptsGot).replace(',', '.'));
      const max = parseFloat(String(ptsMax).replace(',', '.'));
      if (max > 0 && !isNaN(got)) {
        setVal(((got / max) * 100).toFixed(1));
      }
    } else {
      const got = parseFloat(String(ptsGot).replace(',', '.')) || 0;
      
      // NAPRAWA ZEROWEGO MNOŻNIKA: Bezpośrednio używamy the parsed value, if it's not NaN
      const parsedMult = parseFloat(String(ptsMultiplier).replace(',', '.'));
      const mult = isNaN(parsedMult) ? 1 : parsedMult;
      
      setVal((got * mult).toFixed(1));
    }
  }, [ptsGot, ptsMax, ptsMultiplier, isCounter]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!desc || !moduleId || (!isCounter && val === '')) return;
    
    await saveGrade({
      id: gradeToEdit?.id,
      subject_id: subjectId,
      module_id: moduleId,
      value: val, 
      weight,
      desc,
      date,
      is_counter: isCounter,
      points: ptsGot || 0,
      points_max: ptsMax || null,
      points_multiplier: isCounter ? ptsMultiplier : 1
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:w-full md:max-w-sm flex flex-col md:rounded-3xl md:border md:border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        <header className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
          <button onClick={onClose} className="text-[#3498db] font-medium">Cancel</button>
          <h1 className="text-lg font-bold text-white">{gradeToEdit ? 'Edit Grade' : 'New Grade'}</h1>
          <button onClick={handleSave} disabled={!desc || !moduleId || (!isCounter && val === '')} className="text-[#3498db] font-bold disabled:opacity-50">Save</button>
        </header>

        <div className="p-4 space-y-6 overflow-y-auto pb-20">
          
          <div className="flex bg-[#2b2b2b] rounded-xl p-1 border border-white/5">
            <button 
              onClick={() => setIsCounter(false)} 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${!isCounter ? 'bg-[#3498db] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              Standard Grade
            </button>
            <button 
              onClick={() => setIsCounter(true)} 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${isCounter ? 'bg-[#3498db] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              Points Counter
            </button>
          </div>

          <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <span className="text-gray-400">Title</span>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder={isCounter ? "e.g. Class Activity" : "e.g. Midterm"} className="bg-transparent text-right text-white focus:outline-none" />
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-gray-400">Module</span>
              <select value={moduleId} onChange={e => setModuleId(e.target.value)} className="bg-transparent text-right text-[#3498db] focus:outline-none appearance-none" dir="rtl">
                {subjectModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {!isCounter && (
            <>
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-4">Points Calculator</h2>
                <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 p-4 flex items-center justify-center gap-4">
                  <input type="number" placeholder="Got" value={ptsGot} onChange={e => setPtsGot(e.target.value)} className="w-20 bg-[#2b2b2b] text-center text-white p-2 rounded-lg border border-gray-700 focus:outline-none" />
                  <span className="text-xl font-bold text-gray-500">/</span>
                  <input type="number" placeholder="Max" value={ptsMax} onChange={e => setPtsMax(e.target.value)} className="w-20 bg-[#2b2b2b] text-center text-white p-2 rounded-lg border border-gray-700 focus:outline-none" />
                </div>
              </div>

              <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <span className="text-gray-400">Grade (%)</span>
                  <input type="number" step="0.1" value={val} onChange={e => setVal(e.target.value)} placeholder="e.g. 85.5" className="bg-transparent text-right text-white font-bold focus:outline-none" />
                </div>
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <span className="text-gray-400">Weight</span>
                  <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="1" className="bg-transparent text-right text-white focus:outline-none" />
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-gray-400">Date</span>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" />
                </div>
              </div>
            </>
          )}

          {isCounter && (
            <>
              <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <span className="text-gray-400">Starting Pts</span>
                  <input type="number" step="0.5" value={ptsGot} onChange={e => setPtsGot(e.target.value)} placeholder="0" className="bg-transparent text-right text-[#3498db] font-bold focus:outline-none" />
                </div>
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <span className="text-gray-400">Max Pts (Opt)</span>
                  <input type="number" step="0.5" value={ptsMax} onChange={e => setPtsMax(e.target.value)} placeholder="No limit" className="bg-transparent text-right text-white focus:outline-none" />
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-gray-400">Multiplier (%/pt)</span>
                  <input type="number" step="0.1" value={ptsMultiplier} onChange={e => setPtsMultiplier(e.target.value)} placeholder="1" className="bg-transparent text-right text-white focus:outline-none" />
                </div>
              </div>

              <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-white/5">
                  <span className="text-gray-400">Current Value</span>
                  <span className="text-green-500 font-bold">{val ? `${val}%` : '0%'}</span>
                </div>
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <span className="text-gray-400">Weight</span>
                  <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="1" className="bg-transparent text-right text-white focus:outline-none" />
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-gray-400">Date</span>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" />
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}