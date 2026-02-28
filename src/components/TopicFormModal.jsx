import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

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
    <div className="flex items-center text-right justify-end w-2/3">
      {children}
    </div>
  </div>
);

export default function TopicFormModal({ isOpen, onClose, topic }) {
  const { saveTopic, deleteTopic } = useData();

  const [name, setName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [locked, setLocked] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen && topic) {
      setName(topic.name || '');
      setScheduledDate(topic.scheduled_date || '');
      setLocked(topic.locked || false);
      setNote(topic.note || '');
    }
  }, [isOpen, topic]);

  if (!isOpen || !topic) return null;

  const handleSave = async () => {
    if (!name) {
      alert("Topic name is required");
      return;
    }

    // Automatycznie blokujemy, jeśli zmieniono datę (logika z Pythona)
    let isLocked = locked;
    if (scheduledDate && scheduledDate !== topic.scheduled_date) {
      isLocked = true;
    }

    await saveTopic({
      ...topic,
      name,
      scheduled_date: scheduledDate,
      locked: isLocked,
      note
    });
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this topic?")) {
      await deleteTopic(topic.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:max-h-[85vh] md:w-full md:max-w-md flex flex-col md:rounded-3xl md:border md:border-white/10 md:shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        
        {/* ZMIANA: Dodano pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 oraz shrink-0 */}
        <header className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 bg-[#1c1c1e] md:bg-transparent border-b border-gray-800 shrink-0">
          <button onClick={onClose} className="text-[#3498db] text-lg font-medium active:opacity-70">
            Cancel
          </button>
          <h1 className="text-lg font-bold text-white">Edit Topic</h1>
          <button onClick={handleSave} className="text-[#3498db] text-lg font-bold active:opacity-70">
            Save
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-20">
          <FormSection title="Topic Details">
            <FormRow label="Name">
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-right text-gray-300 focus:outline-none"
              />
            </FormRow>
            
            <FormRow label="Plan Date">
              <input 
                type="date" 
                value={scheduledDate} 
                onChange={(e) => setScheduledDate(e.target.value)}
                className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]"
              />
            </FormRow>

            <FormRow label="Locked" border={false}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </FormRow>
          </FormSection>

          <FormSection title="Topic Note">
            <div className="p-4">
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Details, references, sub-topics..."
                className="w-full h-32 bg-transparent text-gray-300 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </FormSection>

          <button 
            onClick={handleDelete}
            className="w-full mt-4 p-4 text-red-500 font-bold bg-[#1c1c1e] rounded-2xl border border-white/5 active:bg-red-500/10 transition-colors"
          >
            Delete Topic
          </button>
        </div>
      </div>
    </div>
  );
}