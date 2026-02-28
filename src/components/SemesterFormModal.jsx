import { useState, useEffect } from 'react';

const FormSection = ({ title, children }) => (
  <div className="mb-6">
    {title && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-4">{title}</h2>}
    <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5">
      {children}
    </div>
  </div>
);

const FormRow = ({ label, children, border = true }) => (
  <div className={`flex items-center justify-between p-4 ${border ? 'border-b border-gray-800' : ''}`}>
    <span className="font-medium text-white">{label}</span>
    <div className="flex items-center text-right justify-end w-1/2">
      {children}
    </div>
  </div>
);

export default function SemesterFormModal({ isOpen, onClose, initialData, onSave }) {
  const isEditMode = !!initialData;

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setStartDate(initialData.start_date || '');
        setEndDate(initialData.end_date || '');
        setIsCurrent(initialData.is_current || false);
      } else {
        setName('');
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
        setIsCurrent(false);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name) {
      alert("Semester name is required.");
      return;
    }
    onSave({ id: initialData?.id, name, startDate, endDate, isCurrent }, isEditMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:max-h-[85vh] md:w-full md:max-w-md flex flex-col md:rounded-3xl md:border md:border-white/10 md:shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        
        <header className="flex items-center justify-between p-4 bg-[#1c1c1e] md:bg-transparent border-b border-gray-800 shrink-0">
          <button onClick={onClose} className="text-[#3498db] text-lg font-medium active:opacity-70">Cancel</button>
          <h1 className="text-lg font-bold text-white">{isEditMode ? 'Edit Semester' : 'New Semester'}</h1>
          <button onClick={handleSave} className="text-[#3498db] text-lg font-bold active:opacity-70">Save</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-20">
          <FormSection title="Details">
            <FormRow label="Name">
              <input type="text" placeholder="e.g. Fall 2026" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-right text-gray-300 focus:outline-none" />
            </FormRow>
            <FormRow label="Start Date">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" />
            </FormRow>
            <FormRow label="End Date" border={false}>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" />
            </FormRow>
          </FormSection>

          <FormSection title="Status">
            <FormRow label="Set as Current Semester" border={false}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </FormRow>
          </FormSection>
        </div>
      </div>
    </div>
  );
}