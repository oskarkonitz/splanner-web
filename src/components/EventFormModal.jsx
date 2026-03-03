import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

// Pomocnicze komponenty UI
const FormSection = ({ title, footer, children }) => (
  <div className="mb-6">
    {title && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-4">{title}</h2>}
    <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5">
      {children}
    </div>
    {footer && <p className="text-xs text-gray-500 mt-2 ml-4 mr-4">{footer}</p>}
  </div>
);

const FormRow = ({ label, children, border = true }) => (
  <div className={`flex flex-wrap items-center justify-between p-4 ${border ? 'border-b border-gray-800' : ''}`}>
    <span className="font-medium text-white">{label}</span>
    <div className="flex items-center text-right justify-end min-w-[50%]">
      {children}
    </div>
  </div>
);

export default function EventFormModal({ isOpen, onClose, initialData = null }) {
  const { eventLists, saveCustomEvent } = useData();
  
  const isEditMode = !!initialData;

  // Stany formularza
  const [title, setTitle] = useState('');
  const [listId, setListId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  
  // Daty jednorazowe
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showEndDate, setShowEndDate] = useState(false); // NOWE: Czy pokazywać pole daty końcowej
  
  // Daty i dzień dla cyklicznych
  const [dayOfWeek, setDayOfWeek] = useState('0'); 
  const [recStartDate, setRecStartDate] = useState('');
  const [recEndDate, setRecEndDate] = useState('');

  // Czas
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [isEndOfDay, setIsEndOfDay] = useState(false);
  const [endTimeManuallyChanged, setEndTimeManuallyChanged] = useState(false); // NOWE: Czy użytkownik sam ruszył godzinę

  // Pomocnik do dodawania dni
  const addDays = (dateStr, days) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (isOpen) {
      const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      if (initialData) {
        setTitle(initialData.title || '');
        setListId(initialData.list_id || '');
        setIsRecurring(initialData.is_recurring || false);
        setStartTime(initialData.start_time || '14:00');
        
        const eTime = initialData.end_time || '16:00';
        setEndTime(eTime);
        setIsEndOfDay(eTime === '23:59' || eTime === '00:00');
        
        const sD = initialData.date || initialData.start_date || todayStr;
        const eD = initialData.end_date || initialData.date || todayStr;
        
        setStartDate(sD);
        setEndDate(eD);
        setShowEndDate(sD !== eD); // Jeśli daty są różne, pokaż pole End Date
        
        setDayOfWeek(initialData.day_of_week?.toString() || '0');
        setRecStartDate(initialData.start_date || todayStr);
        setRecEndDate(initialData.end_date || todayStr);
        setEndTimeManuallyChanged(true); // Przy edycji nie chcemy auto-aktualizacji
      } else {
        setTitle('');
        setListId('');
        setIsRecurring(false);
        setStartDate(todayStr);
        setEndDate(todayStr);
        setShowEndDate(false);
        setRecStartDate(todayStr);
        
        const in3Months = new Date();
        in3Months.setMonth(in3Months.getMonth() + 3);
        setRecEndDate(in3Months.toISOString().split('T')[0]);
        
        setStartTime('14:00');
        setEndTime('16:00');
        setIsEndOfDay(false);
        setEndTimeManuallyChanged(false);
      }
    }
  }, [isOpen, initialData]);

  // Logika zmiany daty początkowej
  const handleStartDateChange = (newDate) => {
    setStartDate(newDate);
    if (showEndDate) {
      setEndDate(addDays(newDate, 1));
    } else {
      setEndDate(newDate);
    }
  };

  // Logika zmiany godziny początkowej
  const handleStartTimeChange = (newTime) => {
    setStartTime(newTime);
    if (!endTimeManuallyChanged) {
      setEndTime(newTime);
    }
  };

  const handleEndTimeChange = (newTime) => {
    setEndTime(newTime);
    setEndTimeManuallyChanged(true);
  };

  const incrementEndDate = () => {
    setEndDate(prev => addDays(prev, 1));
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    const list = eventLists?.find(l => l.id === listId);
    
    const payload = {
      id: initialData?.id,
      title: title || "Event",
      listId: listId || null,
      color: list?.color || '#e67e22',
      isRecurring,
      startTime,
      endTime: isEndOfDay ? '23:59' : endTime,
      ...(isRecurring ? {
        dayOfWeek: parseInt(dayOfWeek),
        startDate: recStartDate,
        endDate: recEndDate
      } : {
        date: startDate,
        endDate: showEndDate ? endDate : startDate
      })
    };

    await saveCustomEvent(payload, isEditMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:max-h-[85vh] md:w-full md:max-w-md flex flex-col md:rounded-3xl md:border md:border-white/10 md:shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        
        <header className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 bg-[#1c1c1e] md:bg-transparent border-b border-gray-800 shrink-0">
          <button onClick={onClose} className="text-[#3498db] text-lg font-medium active:opacity-70">Cancel</button>
          <h1 className="text-lg font-bold text-white">{isEditMode ? 'Edit Event' : 'New Event'}</h1>
          <button onClick={handleSave} className="text-[#3498db] text-lg font-bold active:opacity-70">Save</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-20">
          <FormSection title="Event Details">
            <FormRow label="Title">
              <input 
                type="text" placeholder="e.g. Morning Shift" 
                value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-right text-gray-300 placeholder-gray-600 focus:outline-none"
              />
            </FormRow>
            <FormRow label="Category" border={false}>
              <select 
                value={listId} onChange={(e) => setListId(e.target.value)}
                className="w-full bg-transparent text-right text-[#3498db] focus:outline-none appearance-none cursor-pointer" dir="rtl"
              >
                <option value="">None (Standalone)</option>
                {eventLists?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormRow>
          </FormSection>

          <FormSection 
            title="Timing" 
            footer={isRecurring ? "This event will repeat weekly between the selected dates." : "This event will only appear on the specific dates."}
          >
            <FormRow label="Repeats Weekly?">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </FormRow>

            {isRecurring ? (
              <>
                <FormRow label="Day of Week">
                  <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className="bg-transparent text-right text-[#3498db] focus:outline-none appearance-none cursor-pointer" dir="rtl">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label="Valid From"><input type="date" value={recStartDate} onChange={(e) => setRecStartDate(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" /></FormRow>
                <FormRow label="Valid Until" border={false}><input type="date" value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" /></FormRow>
              </>
            ) : (
              <>
                <FormRow label="Start Date">
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => handleStartDateChange(e.target.value)} 
                    className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" 
                  />
                </FormRow>
                
                {/* NOWE: Przełącznik daty końcowej */}
                <FormRow label="Multiple Days?">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={showEndDate} onChange={(e) => {
                      setShowEndDate(e.target.checked);
                      if(e.target.checked && endDate === startDate) setEndDate(addDays(startDate, 1));
                    }} />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3498db]"></div>
                  </label>
                </FormRow>

                {showEndDate && (
                  <>
                    <FormRow label="End Date">
                      <input 
                        min={startDate} 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" 
                      />
                    </FormRow>
                    <div className="bg-[#1c1c1e] px-4 pb-2 pt-1 flex justify-end border-b border-gray-800">
                      <button onClick={incrementEndDate} className="text-xs text-[#3498db] font-medium">+1 Day</button>
                    </div>
                  </>
                )}
              </>
            )}
          </FormSection>

          <FormSection title="Hours">
            <FormRow label="Start Time">
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => handleStartTimeChange(e.target.value)} 
                className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" 
              />
            </FormRow>
            
            {!isEndOfDay && (
              <FormRow label="End Time">
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => handleEndTimeChange(e.target.value)} 
                  className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" 
                />
              </FormRow>
            )}

            <FormRow label="Until End of the Day" border={false}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isEndOfDay} onChange={(e) => setIsEndOfDay(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3498db]"></div>
              </label>
            </FormRow>
          </FormSection>

        </div>
      </div>
    </div>
  );
}