import { useState } from 'react';
import { useData } from '../context/DataContext';

export default function GradeModuleFormModal({ isOpen, subjectId, onClose }) {
  const { saveGradeModule } = useData();
  
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name || !weight) return;
    await saveGradeModule({ subject_id: subjectId, name, weight });
    setName(''); setWeight('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:w-full md:max-w-sm flex flex-col md:rounded-3xl md:border md:border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        <header className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
          <button onClick={onClose} className="text-[#3498db] font-medium">Cancel</button>
          <h1 className="text-lg font-bold text-white">New Module</h1>
          <button onClick={handleSave} disabled={!name || !weight} className="text-[#3498db] font-bold disabled:opacity-50">Save</button>
        </header>
        <div className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Module Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Exams" className="w-full bg-[#2b2b2b] text-white px-4 py-3 rounded-xl focus:outline-none border border-gray-700 focus:border-[#3498db]" autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Weight %</label>
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 60" className="w-full bg-[#2b2b2b] text-white px-4 py-3 rounded-xl focus:outline-none border border-gray-700 focus:border-[#3498db]" />
          </div>
        </div>
      </div>
    </div>
  );
}