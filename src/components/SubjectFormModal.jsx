import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const FormSection = ({ title, footer, children }) => (
  <div className="mb-6">
    {title && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-4">{title}</h2>}
    <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5">
      {children}
    </div>
    {footer && <p className="text-xs text-gray-500 mt-2 ml-4 mr-4">{footer}</p>}
  </div>
);

const FormRow = ({ label, children, border = true, onClick = null }) => (
  <div 
    onClick={onClick}
    className={`flex flex-wrap items-center justify-between p-4 ${border ? 'border-b border-gray-800' : ''} ${onClick ? 'cursor-pointer active:bg-white/5' : ''}`}
  >
    <span className="font-medium text-white">{label}</span>
    <div className="flex items-center text-right justify-end min-w-[50%]">
      {children}
    </div>
  </div>
);

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SubjectFormModal({ isOpen, onClose, initialData = null }) {
  const { semesters, scheduleEntries, saveSubject } = useData();
  const isEditMode = !!initialData;

  // Stany Głównego Formularza
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [weight, setWeight] = useState('1.0');
  const [color, setColor] = useState('#3498db');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Lista slotów (wpisów w planie)
  const [slots, setSlots] = useState([]);

  // Stany Edytora Slotu
  const [activeSlotIndex, setActiveSlotIndex] = useState(null); // null = ukryty, -1 = nowy, >=0 = edycja
  const [slotDay, setSlotDay] = useState(0);
  const [slotStart, setSlotStart] = useState('08:00');
  const [slotEnd, setSlotEnd] = useState('09:30');
  const [slotRoom, setSlotRoom] = useState('');
  const [slotType, setSlotType] = useState('Lecture'); // Domyślny tekst

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setShortName(initialData.short_name || '');
        setSemesterId(initialData.semester_id || '');
        setWeight((initialData.weight || 1.0).toString());
        setColor(initialData.color || '#3498db');
        setStartDate(initialData.start_datetime?.substring(0, 10) || '');
        setEndDate(initialData.end_datetime?.substring(0, 10) || '');
        
        const existingSlots = scheduleEntries.filter(e => e.subject_id === initialData.id);
        setSlots(existingSlots);
      } else {
        setName('');
        setShortName('');
        const curSem = semesters?.find(s => s.is_current);
        setSemesterId(curSem ? curSem.id : (semesters?.[0]?.id || ''));
        setWeight('1.0');
        setColor('#3498db');
        setStartDate(curSem?.start_date || '');
        setEndDate(curSem?.end_date || '');
        setSlots([]);
      }
      setActiveSlotIndex(null);
    }
  }, [isOpen, initialData, scheduleEntries, semesters]);

  if (!isOpen) return null;

  const handleSaveMain = async () => {
    if (!name || !semesterId) {
      alert("Please provide at least a Subject Name and Semester.");
      return;
    }

    const payload = {
      id: initialData?.id,
      name,
      short_name: shortName || name.substring(0, 3).toUpperCase(),
      semester_id: semesterId,
      weight: parseFloat(weight) || 1.0,
      color,
      start_datetime: startDate || null,
      end_datetime: endDate || null
    };

    await saveSubject(payload, slots, isEditMode);
    onClose();
  };

  const openSlotEditor = (index) => {
    if (index === -1) {
      setSlotDay(0);
      setSlotStart('08:00');
      setSlotEnd('09:30');
      setSlotRoom('');
      setSlotType('Lecture'); // Domyślnie proponuje słowo, można je skasować
    } else {
      const s = slots[index];
      setSlotDay(s.day_of_week);
      setSlotStart(s.start_time);
      setSlotEnd(s.end_time);
      setSlotRoom(s.room || '');
      setSlotType(s.type || '');
    }
    setActiveSlotIndex(index);
  };

  const saveSlot = () => {
    const newSlot = {
      day_of_week: parseInt(slotDay),
      start_time: slotStart,
      end_time: slotEnd,
      room: slotRoom,
      type: slotType
    };

    if (activeSlotIndex === -1) {
      setSlots([...slots, newSlot]);
    } else {
      const updated = [...slots];
      updated[activeSlotIndex] = newSlot;
      setSlots(updated);
    }
    setActiveSlotIndex(null);
  };

  const removeSlot = (index) => {
    const updated = [...slots];
    updated.splice(index, 1);
    setSlots(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-[650px] md:max-h-[85vh] md:w-full md:max-w-md flex flex-col md:rounded-3xl md:border md:border-white/10 md:shadow-2xl overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        
        {/* WIDOK GŁÓWNY */}
        <div className={`absolute inset-0 flex flex-col bg-[#121212] md:bg-[#1c1c1e] transition-transform duration-300 ${activeSlotIndex !== null ? '-translate-x-full' : 'translate-x-0'}`}>
          <header className="flex items-center justify-between p-4 bg-[#1c1c1e] md:bg-transparent border-b border-gray-800 shrink-0">
            <button onClick={onClose} className="text-[#3498db] text-lg font-medium active:opacity-70">Cancel</button>
            <h1 className="text-lg font-bold text-white">{isEditMode ? 'Edit Subject' : 'New Subject'}</h1>
            <button onClick={handleSaveMain} className="text-[#3498db] text-lg font-bold active:opacity-70">Save</button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 pb-20">
            <FormSection title="Details">
              <FormRow label="Name">
                <input type="text" placeholder="e.g. Mathematics" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-right text-gray-300 focus:outline-none" />
              </FormRow>
              <FormRow label="Semester">
                <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} className="w-full bg-transparent text-right text-[#3498db] focus:outline-none cursor-pointer" dir="rtl">
                  {semesters?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </FormRow>
              <FormRow label="Short Name">
                <input type="text" placeholder="MATH" value={shortName} onChange={(e) => setShortName(e.target.value)} className="w-full bg-transparent text-right text-gray-300 focus:outline-none" />
              </FormRow>
              <FormRow label="ECTS Weight" border={false}>
                <input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-transparent text-right text-gray-300 focus:outline-none" />
              </FormRow>
            </FormSection>

            <FormSection title="Appearance & Validity">
              <FormRow label="Color">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" />
              </FormRow>
              <FormRow label="Start Date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" /></FormRow>
              <FormRow label="End Date" border={false}><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" /></FormRow>
            </FormSection>

            <FormSection title="Class Schedule (Slots)">
              {slots.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 border-b border-gray-800">No classes scheduled yet.</div>
              ) : (
                slots.map((slot, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border-b border-gray-800 last:border-b-0 group">
                    <div className="flex-1 cursor-pointer py-1" onClick={() => openSlotEditor(idx)}>
                      <div className="font-medium text-white text-sm">{DAYS[slot.day_of_week]}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{slot.start_time} - {slot.end_time} • {slot.type} {slot.room ? `(${slot.room})` : ''}</div>
                    </div>
                    <button onClick={() => removeSlot(idx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))
              )}
              <button onClick={() => openSlotEditor(-1)} className="w-full p-4 text-center text-[#3498db] font-medium active:bg-white/5 transition-colors">
                + Add Class Slot
              </button>
            </FormSection>
          </div>
        </div>

        {/* WIDOK EDYTORA SLOTU */}
        <div className={`absolute inset-0 flex flex-col bg-[#121212] md:bg-[#1c1c1e] z-10 transition-transform duration-300 ${activeSlotIndex !== null ? 'translate-x-0' : 'translate-x-full'}`}>
          <header className="flex items-center justify-between p-4 bg-[#1c1c1e] md:bg-transparent border-b border-gray-800 shrink-0">
            <button onClick={() => setActiveSlotIndex(null)} className="flex items-center text-[#3498db] font-medium active:opacity-70">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
              Back
            </button>
            <h1 className="text-lg font-bold text-white">Slot Details</h1>
            <button onClick={saveSlot} className="text-[#3498db] font-bold active:opacity-70">Done</button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 pb-20">
            <FormSection>
              <FormRow label="Day of Week">
                <select value={slotDay} onChange={(e) => setSlotDay(e.target.value)} className="bg-transparent text-right text-[#3498db] focus:outline-none appearance-none cursor-pointer" dir="rtl">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </FormRow>
              <FormRow label="Start Time"><input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" /></FormRow>
              <FormRow label="End Time"><input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" /></FormRow>
              <FormRow label="Room">
                <input type="text" placeholder="e.g. A-101" value={slotRoom} onChange={(e) => setSlotRoom(e.target.value)} className="w-full bg-transparent text-right text-gray-300 placeholder-gray-600 focus:outline-none" />
              </FormRow>
              
              {/* ZMIANA: Pole "Type" jest teraz dającym się edytować polem tekstowym */}
              <FormRow label="Type" border={false}>
                <input 
                  type="text" 
                  placeholder="e.g. Lecture, Lab, Seminar" 
                  value={slotType} 
                  onChange={(e) => setSlotType(e.target.value)} 
                  className="w-full bg-transparent text-right text-gray-300 placeholder-gray-600 focus:outline-none" 
                />
              </FormRow>

            </FormSection>
          </div>
        </div>

      </div>
    </div>
  );
}