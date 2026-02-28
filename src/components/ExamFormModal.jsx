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
    <div className="flex items-center text-right justify-end w-1/2">
      {children}
    </div>
  </div>
);

export default function ExamFormModal({ isOpen, onClose, initialData = null }) {
  const { subjects, saveExam, topics } = useData();
  
  const isEditMode = !!initialData;

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [ignoreBarrier, setIgnoreBarrier] = useState(false);
  const [topicsRaw, setTopicsRaw] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setSubjectId(initialData.subject_id || '');
        setDate(initialData.date || '');
        setTime(initialData.time || '09:00');
        setIgnoreBarrier(initialData.ignore_barrier || false);
        
        // Ładowanie istniejących tematów
        const examTopics = topics.filter(t => t.exam_id === initialData.id);
        const formattedTopics = examTopics.map((t, idx) => `${idx + 1}. ${t.name}`).join('\n');
        setTopicsRaw(formattedTopics);

      } else {
        setTitle('');
        setSubjectId('');
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        setDate(today.toISOString().split('T')[0]);
        setTime('09:00');
        setIgnoreBarrier(false);
        setTopicsRaw('');
      }
    }
  }, [isOpen, initialData, topics]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title || !subjectId || !date) {
      alert("Please fill in required fields (Title, Subject, Date).");
      return;
    }

    const subject = subjects.find(s => s.id === subjectId);

    const payload = { 
      id: initialData?.id,
      title, 
      subjectId, 
      subjectName: subject?.name,
      color: subject?.color || '#e74c3c',
      date, 
      time, 
      ignoreBarrier, 
      topicsRaw 
    };
    
    await saveExam(payload, isEditMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:max-h-[85vh] md:w-full md:max-w-md flex flex-col md:rounded-3xl md:border md:border-white/10 md:shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        
        <header className="flex items-center justify-between p-4 bg-[#1c1c1e] md:bg-transparent border-b border-gray-800">
          <button onClick={onClose} className="text-[#3498db] text-lg font-medium active:opacity-70">
            Cancel
          </button>
          <h1 className="text-lg font-bold text-white">
            {isEditMode ? 'Edit Exam' : 'New Exam'}
          </h1>
          <button onClick={handleSave} className="text-[#3498db] text-lg font-bold active:opacity-70">
            Save
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-20">
          <FormSection title="Exam Info">
            <FormRow label="Title">
              <input 
                type="text" 
                placeholder="e.g. Midterm" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-right text-gray-300 placeholder-gray-600 focus:outline-none"
              />
            </FormRow>
            
            <FormRow label="Subject" border={false}>
              <select 
                value={subjectId} 
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full bg-transparent text-right text-[#3498db] focus:outline-none appearance-none cursor-pointer"
                dir="rtl"
              >
                <option value="" disabled>Select Subject</option>
                {subjects?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FormRow>
          </FormSection>

          <FormSection title="Schedule">
            <FormRow label="Date">
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]"
              />
            </FormRow>
            
            <FormRow label="Time">
              <input 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)}
                className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]"
              />
            </FormRow>
            
            <FormRow label="Ignore barrier" border={false}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={ignoreBarrier} onChange={(e) => setIgnoreBarrier(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </FormRow>
          </FormSection>

          {/* Teraz tematy są widoczne także w Edit Mode */}
          <FormSection title="Topics (one per line)">
            <div className="p-4">
              <textarea 
                value={topicsRaw}
                onChange={(e) => setTopicsRaw(e.target.value)}
                placeholder="1. Math induction&#10;2. Integrals&#10;3. Limits"
                className="w-full h-40 bg-transparent text-gray-300 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </FormSection>

        </div>
      </div>
    </div>
  );
}