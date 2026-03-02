import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Uniwersalne komponenty dla spójności z resztą aplikacji
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

export default function BlockedDaysModal({ isOpen, onClose }) {
  const { blockedDates, runPlanner, saveBlockedDates } = useData();

  // Lokalna kopia zaznaczonych dat
  const [localBlocked, setLocalBlocked] = useState(new Set());
  
  // Inicjalizacja przy otwarciu modala
  useEffect(() => {
    if (isOpen && blockedDates) {
      setLocalBlocked(new Set(blockedDates.map(b => b.date)));
    }
  }, [isOpen, blockedDates]);

  // Stan nawigacji kalendarza
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Do przeciągania (Drag to select)
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null);

  const todayStr = useMemo(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  }, []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6;

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    for (let i = startDayIdx - 1; i >= 0; i--) {
       days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, dateStr: null });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(Date.UTC(year, month, i));
      const dateStr = d.toISOString().split('T')[0];
      days.push({ day: i, isCurrentMonth: true, dateStr });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
       days.push({ day: i, isCurrentMonth: false, dateStr: null });
    }

    return days;
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const toggleDay = (dateStr, forceMode = null) => {
    if (!dateStr) return;
    
    setLocalBlocked(prev => {
      const newSet = new Set(prev);
      const isCurrentlyBlocked = newSet.has(dateStr);
      
      if (forceMode === 'add') {
         newSet.add(dateStr);
      } else if (forceMode === 'remove') {
         newSet.delete(dateStr);
      } else {
         if (isCurrentlyBlocked) newSet.delete(dateStr);
         else newSet.add(dateStr);
      }
      return newSet;
    });
  };

  const handlePointerDown = (dateStr) => {
    if (!dateStr) return;
    setIsDragging(true);
    const willAdd = !localBlocked.has(dateStr);
    setDragMode(willAdd ? 'add' : 'remove');
    toggleDay(dateStr, willAdd ? 'add' : 'remove');
  };

  const handlePointerEnter = (dateStr) => {
    if (isDragging && dateStr && dragMode) {
      toggleDay(dateStr, dragMode);
    }
  };

  const stopDragging = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  useEffect(() => {
    window.addEventListener('pointerup', stopDragging);
    return () => window.removeEventListener('pointerup', stopDragging);
  }, []);

  const selectWeekends = () => {
    setLocalBlocked(prev => {
      const newSet = new Set(prev);
      calendarDays.forEach(dayObj => {
        if (dayObj.isCurrentMonth && dayObj.dateStr) {
          const d = new Date(dayObj.dateStr);
          const dayOfWeek = d.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
             newSet.add(dayObj.dateStr);
          }
        }
      });
      return newSet;
    });
  };

  const clearMonth = () => {
    setLocalBlocked(prev => {
      const newSet = new Set(prev);
      calendarDays.forEach(dayObj => {
        if (dayObj.isCurrentMonth && dayObj.dateStr) {
           newSet.delete(dayObj.dateStr);
        }
      });
      return newSet;
    });
  };

  const handleSave = async () => {
      const newBlockedArray = Array.from(localBlocked);
      await saveBlockedDates(newBlockedArray);
      onClose();
  };

  const handleSaveAndGenerate = async () => {
      const newBlockedArray = Array.from(localBlocked);
      await saveBlockedDates(newBlockedArray);
      
      if (runPlanner) {
          await runPlanner(false);
      }
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-md flex flex-col md:rounded-3xl md:border md:border-white/10 md:shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95">
        
        <header className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4 bg-[#1c1c1e] md:bg-transparent border-b border-gray-800 shrink-0">
          <button onClick={onClose} className="text-[#3498db] text-lg font-medium active:opacity-70">
            Cancel
          </button>
          <h1 className="text-lg font-bold text-white">
            Days Off
          </h1>
          <button onClick={handleSave} className="text-[#3498db] text-lg font-bold active:opacity-70">
            Save
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-20 touch-none">
            
            <FormSection title="Overview">
                <FormRow label="Total Selected Days" border={false}>
                     <span className="font-bold text-[#e74c3c]">{localBlocked.size} days</span>
                </FormRow>
            </FormSection>

            <FormSection title="Calendar">
                <div className="p-4 flex flex-col gap-4">
                    {/* Nawigacja Kalendarza */}
                    <div className="flex items-center justify-between">
                        <button onClick={prevMonth} className="p-2 text-gray-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <span className="font-bold text-white text-lg">
                            {MONTHS[month]} {year}
                        </span>
                        <button onClick={nextMonth} className="p-2 text-gray-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>

                    {/* Dni tygodnia */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-500 uppercase">
                        {DAYS_SHORT.map(day => <div key={day}>{day}</div>)}
                    </div>

                    {/* Siatka Dni */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((dayObj, idx) => {
                            const isBlocked = dayObj.dateStr && localBlocked.has(dayObj.dateStr);
                            const isToday = dayObj.dateStr === todayStr;

                            let btnClasses = "h-10 sm:h-12 flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer relative ";
                            
                            if (!dayObj.isCurrentMonth) {
                                btnClasses += "text-gray-700 pointer-events-none opacity-40 ";
                            } else if (isBlocked) {
                                btnClasses += "bg-[#e74c3c] text-white scale-[0.95] ";
                            } else if (isToday) {
                                btnClasses += "bg-transparent border border-[#3498db] text-[#3498db] ";
                            } else {
                                btnClasses += "bg-[#2b2b2b] text-gray-300 hover:bg-[#3b3b3b] ";
                            }

                            return (
                                <div 
                                    key={`${idx}-${dayObj.dateStr || 'empty'}`}
                                    className={btnClasses}
                                    onPointerDown={(e) => { e.preventDefault(); handlePointerDown(dayObj.dateStr); }}
                                    onPointerEnter={(e) => { e.preventDefault(); handlePointerEnter(dayObj.dateStr); }}
                                >
                                    {dayObj.day}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </FormSection>

            <FormSection title="Quick Actions">
                <FormRow label="Select Weekends">
                     <button onClick={selectWeekends} className="px-4 py-1.5 bg-[#2b2b2b] text-[#3498db] text-sm font-bold rounded-xl active:scale-95 transition-transform">Apply</button>
                </FormRow>
                <FormRow label="Clear Month" border={false}>
                     <button onClick={clearMonth} className="px-4 py-1.5 bg-[#2b2b2b] text-red-500 text-sm font-bold rounded-xl active:scale-95 transition-transform">Clear</button>
                </FormRow>
            </FormSection>

            <div className="mt-8 flex justify-center">
                <button onClick={handleSaveAndGenerate} className="w-full flex items-center justify-center gap-2 bg-[#3498db] hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-blue-900/20 active:scale-[0.98]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                    Save & Run Planner
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}