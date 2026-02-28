import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

export default function GradeFormModal({ isOpen, subjectId, gradeToEdit, onClose }) {
  const { gradeModules, saveGrade } = useData();
  
  const [desc, setDesc] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [ptsGot, setPtsGot] = useState('');
  const [ptsMax, setPtsMax] = useState('');
  const [val, setVal] = useState('');
  const [weight, setWeight] = useState('1');
  const [date, setDate] = useState('');

  const subjectModules = gradeModules.filter(m => m.subject_id === subjectId);

  useEffect(() => {
    if (isOpen) {
      if (gradeToEdit) {
        setDesc(gradeToEdit.desc || '');
        setModuleId(gradeToEdit.module_id || '');
        setVal(gradeToEdit.value.toString());
        setWeight((gradeToEdit.weight || 1).toString());
        setDate(gradeToEdit.date || '');
        setPtsGot(''); setPtsMax('');
      } else {
        setDesc('');
        setModuleId(subjectModules.length > 0 ? subjectModules[0].id : '');
        setVal(''); setWeight('1'); setPtsGot(''); setPtsMax('');
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, gradeToEdit, subjectModules]);

  useEffect(() => {
    const got = parseFloat(ptsGot.replace(',', '.'));
    const max = parseFloat(ptsMax.replace(',', '.'));
    if (max > 0 && !isNaN(got)) {
      setVal(((got / max) * 100).toFixed(1));
    }
  }, [ptsGot, ptsMax]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!desc || !moduleId || !val) return;
    await saveGrade({
      id: gradeToEdit?.id,
      subject_id: subjectId,
      module_id: moduleId,
      value: val,
      weight,
      desc,
      date
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:w-full md:max-w-sm flex flex-col md:rounded-3xl md:border md:border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        <header className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
          <button onClick={onClose} className="text-[#3498db] font-medium">Cancel</button>
          <h1 className="text-lg font-bold text-white">{gradeToEdit ? 'Edit Grade' : 'New Grade'}</h1>
          <button onClick={handleSave} disabled={!desc || !moduleId || !val} className="text-[#3498db] font-bold disabled:opacity-50">Save</button>
        </header>

        <div className="p-4 space-y-6 overflow-y-auto pb-20">
          
          <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <span className="text-gray-400">Title</span>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Midterm" className="bg-transparent text-right text-white focus:outline-none" />
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-gray-400">Module</span>
              <select value={moduleId} onChange={e => setModuleId(e.target.value)} className="bg-transparent text-right text-[#3498db] focus:outline-none appearance-none" dir="rtl">
                {subjectModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}