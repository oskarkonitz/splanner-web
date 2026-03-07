import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const FormSection = ({ title, children, overflowVisible = false }) => (
  <div className="mb-6">
    {title && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-4">{title}</h2>}
    <div className={`bg-[#1c1c1e] rounded-2xl border border-white/5 ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}>
      {children}
    </div>
  </div>
);

const FormRow = ({ label, children, border = true }) => (
  <div className={`flex items-center justify-between p-4 ${border ? 'border-b border-gray-800' : ''}`}>
    <span className="font-medium text-white shrink-0">{label}</span>
    <div className="flex items-center text-right justify-end flex-1 min-w-0 ml-4">
      {children}
    </div>
  </div>
);

export default function HomeworkFormModal({ isOpen, onClose, initialData = null }) {
  const { subjects, saveAssignment, topics, semesters, scheduleEntries } = useData();
  
  const isEditMode = !!initialData;

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('23:59');
  const [userModified, setUserModified] = useState(false);
  const [ignoreBarrier, setIgnoreBarrier] = useState(true); 
  const [note, setNote] = useState('');
  const [topicsRaw, setTopicsRaw] = useState('');

  const [selectedSemester, setSelectedSemester] = useState('all');
  const [showSemesters, setShowSemesters] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setSubjectId(initialData.subject_id || '');
        setDate(initialData.date || '');
        setTime(initialData.time || '23:59');
        setUserModified(true); // Jeśli edytujemy, nie chcemy by system sam mu nadpisywał
        setIgnoreBarrier(initialData.ignore_barrier !== undefined ? initialData.ignore_barrier : true);
        setNote(initialData.note || '');

        const hwTopics = topics.filter(t => t.assignment_id === initialData.id);
        const formattedTopics = hwTopics.map((t, idx) => `${idx + 1}. ${t.name}`).join('\n');
        setTopicsRaw(formattedTopics);

        const subject = subjects?.find(s => s.id === initialData.subject_id);
        if (subject) {
          setSelectedSemester(subject.semester_id);
        } else if (semesters?.length > 0) {
          const current = semesters.find(s => s.is_current);
          setSelectedSemester(current ? current.id : 'all');
        }
      } else {
        setTitle('');
        setSubjectId('');
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        setDate(today.toISOString().split('T')[0]);
        setTime('23:59');
        setUserModified(false); // Zerujemy przy nowym oknie
        setIgnoreBarrier(true);
        setNote('');
        setTopicsRaw('');

        if (semesters?.length > 0) {
          const current = semesters.find(s => s.is_current);
          setSelectedSemester(current ? current.id : 'all');
        } else {
          setSelectedSemester('all');
        }
      }
      setShowSemesters(false);
    }
  }, [isOpen, initialData, topics, semesters, subjects]);

  // LOGIKA AUTO-GODZINY
  useEffect(() => {
    if (isOpen && !isEditMode && !userModified && date && subjectId && scheduleEntries) {
      const selectedDate = new Date(date);
      // Przesunięcie dni tak, aby Poniedziałek = 0, ... Niedziela = 6 (zgodnie z logiką planera)
      const dayOfWeek = (selectedDate.getDay() + 6) % 7; 
      
      const entriesForDay = scheduleEntries.filter(
        e => e.subject_id === subjectId && e.day_of_week === dayOfWeek
      );

      if (entriesForDay.length > 0) {
        // Jeśli jest więcej zajęć danego dnia, bierzemy najwcześniejsze
        entriesForDay.sort((a, b) => a.start_time.localeCompare(b.start_time));
        setTime(entriesForDay[0].start_time);
      } else {
        setTime('23:59');
      }
    }
  }, [date, subjectId, isEditMode, userModified, scheduleEntries, isOpen]);

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
      color: subject?.color || '#2ecc71',
      date, 
      time, 
      note,
      ignoreBarrier,
      type: 'homework',
      topicsRaw
    };
    
    await saveAssignment(payload, isEditMode);
    onClose();
  };

  const handleSemesterChange = (semId) => {
    setSelectedSemester(semId);
    setShowSemesters(false);
    
    if (semId !== 'all' && subjectId) {
      const subjectStillValid = subjects.find(s => s.id === subjectId && s.semester_id === semId);
      if (!subjectStillValid) {
        setSubjectId('');
      }
    }
  };

  const filteredSubjects = selectedSemester === 'all' 
    ? subjects 
    : subjects?.filter(s => s.semester_id === selectedSemester);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:max-h-[85vh] md:w-full md:max-w-md flex flex-col md:rounded-3xl md:border md:border-white/10 md:shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        
        <header className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 bg-[#1c1c1e] md:bg-transparent border-b border-gray-800 shrink-0">
          <button onClick={onClose} className="text-[#2ecc71] text-lg font-medium active:opacity-70">
            Cancel
          </button>
          <h1 className="text-lg font-bold text-white">
            {isEditMode ? 'Edit Homework' : 'New Homework'}
          </h1>
          <button onClick={handleSave} className="text-[#2ecc71] text-lg font-bold active:opacity-70">
            Save
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-20">
          <FormSection title="Assignment Info" overflowVisible={true}>
            <FormRow label="Title">
              <input 
                type="text" 
                placeholder="e.g. Essay 1" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-right text-gray-300 placeholder-gray-600 focus:outline-none"
              />
            </FormRow>
            
            <FormRow label="Subject" border={false}>
              <div className="flex items-center justify-end w-full gap-3 relative">
                <button 
                  onClick={() => setShowSemesters(!showSemesters)}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${selectedSemester !== 'all' ? 'text-[#2ecc71] bg-[#2ecc71]/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                  title="Filter by semester"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                </button>

                {showSemesters && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#2b2b2b] border border-gray-700 rounded-xl shadow-2xl z-50 p-2 flex flex-col gap-1">
                    <button 
                      onClick={() => handleSemesterChange('all')}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${selectedSemester === 'all' ? 'bg-[#2ecc71]/20 text-[#2ecc71] font-bold' : 'text-gray-300 hover:bg-white/5'}`}
                    >
                      All Semesters
                    </button>
                    {semesters?.map(sem => (
                      <button 
                        key={sem.id}
                        onClick={() => handleSemesterChange(sem.id)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg truncate transition-colors ${selectedSemester === sem.id ? 'bg-[#2ecc71]/20 text-[#2ecc71] font-bold' : 'text-gray-300 hover:bg-white/5'}`}
                      >
                        {sem.name} {sem.is_current ? '(Current)' : ''}
                      </button>
                    ))}
                  </div>
                )}

                <div className="h-5 w-px bg-gray-700 shrink-0"></div>

                <select 
                  value={subjectId} 
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="bg-transparent text-right text-[#2ecc71] focus:outline-none appearance-none cursor-pointer flex-1 min-w-0"
                  dir="rtl"
                >
                  <option value="" disabled>Select Subject</option>
                  {filteredSubjects?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </FormRow>
          </FormSection>

          <FormSection title="Deadline & Options">
            <FormRow label="Deadline Date">
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-[#2ecc71] focus:outline-none text-right [color-scheme:dark]"
              />
            </FormRow>
            
            <FormRow label="Deadline Time">
              <input 
                type="time" 
                value={time} 
                onChange={(e) => {
                  setTime(e.target.value);
                  setUserModified(true); // Wyłączenie automatyki po ręcznej zmianie
                }}
                className="bg-transparent text-[#2ecc71] focus:outline-none text-right [color-scheme:dark]"
              />
            </FormRow>
            
            <FormRow label="Shadow Barrier" border={false}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={ignoreBarrier} onChange={(e) => setIgnoreBarrier(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </FormRow>
          </FormSection>

          <FormSection title="Topics (one per line)">
            <div className="p-4">
              <textarea 
                value={topicsRaw}
                onChange={(e) => setTopicsRaw(e.target.value)}
                placeholder="1. Read chapter 2&#10;2. Answer questions&#10;3. Format document"
                className="w-full h-40 bg-transparent text-gray-300 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </FormSection>

          <FormSection title="Details">
            <div className="p-4">
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Link to moodle, requirements..."
                className="w-full h-32 bg-transparent text-gray-300 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </FormSection>

        </div>
      </div>
    </div>
  );
}