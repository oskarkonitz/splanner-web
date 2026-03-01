import { useState, useEffect, useMemo, useRef } from 'react'
import { useData } from '../context/DataContext'
import ExamFormModal from '../components/ExamFormModal'
import EventFormModal from '../components/EventFormModal'
import SubjectFormModal from '../components/SubjectFormModal'

const START_HOUR = 0;
const END_HOUR = 24;
const PX_PER_HOUR = 60;
const EXAM_DURATION_HOURS = 1.5;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toDateString = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay() || 7; 
  if (day !== 1) date.setHours(-24 * (day - 1));
  return date;
};

export default function ScheduleView({ onBack }) {
  const { 
    subjects, scheduleEntries, exams, customEvents, cancellations, 
    semesters, eventLists, deleteExam, deleteCustomEvent 
  } = useData();

  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMonday(new Date()));
  const [selectedSemesters, setSelectedSemesters] = useState(new Set());
  const [selectedLists, setSelectedLists] = useState(new Set());
  
  const [selectedDate, setSelectedDate] = useState(() => toDateString(new Date()));

  const [showFilters, setShowFilters] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  // Stany Modali
  const [showExamForm, setShowExamForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [formInitialData, setFormInitialData] = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    const closeMenu = () => { setContextMenu(null); setShowFilters(false); };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekMonday);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentWeekMonday]);

  const blocks = useMemo(() => {
    const result = [];
    if (!subjects) return result;

    const subjectsCache = subjects.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
    const weekEndStr = toDateString(weekDates[6]);
    const weekStartStr = toDateString(weekDates[0]);

    const cancels = new Set((cancellations || []).map(c => `${c.entry_id}_${c.date}`));

    (scheduleEntries || []).forEach(entry => {
      const subject = subjectsCache[entry.subject_id];
      if (!subject) return;
      if (selectedSemesters.size > 0 && !selectedSemesters.has(subject.semester_id)) return;

      const dayIdx = entry.day_of_week;
      const entryDate = weekDates[dayIdx];
      const entryDateStr = toDateString(entryDate);

      if (subject.start_datetime && entryDateStr < subject.start_datetime.substring(0, 10)) return;
      if (subject.end_datetime && entryDateStr > subject.end_datetime.substring(0, 10)) return;
      if (cancels.has(`${entry.id}_${entryDateStr}`)) return;

      const [sH, sM] = entry.start_time.split(':').map(Number);
      const [eH, eM] = entry.end_time.split(':').map(Number);
      const startVal = sH + sM / 60.0;
      const endVal = eH + eM / 60.0;

      result.push({
        id: `class_${entry.id}_${entryDateStr}`,
        type: 'class',
        dayIdx,
        startVal,
        duration: endVal - startVal,
        color: subject.color || "#3498db",
        title: subject.name,
        timeStr: `${entry.start_time} \n ${entry.end_time}`,
        startTime: entry.start_time,
        endTime: entry.end_time,
        subtitle: [entry.type, entry.room ? `Room ${entry.room}` : ''].filter(Boolean).join(' • '),
        rawData: { entry, subject, dateStr: entryDateStr }
      });
    });

    (exams || []).forEach(exam => {
      const subject = subjectsCache[exam.subject_id];
      if (!subject) return;
      if (selectedSemesters.size > 0 && !selectedSemesters.has(subject.semester_id)) return;

      if (exam.date >= weekStartStr && exam.date <= weekEndStr) {
        const examDate = new Date(exam.date);
        const dayIdx = (examDate.getDay() + 6) % 7;
        
        const timeStr = exam.time || "08:00";
        const [sH, sM] = timeStr.split(':').map(Number);
        const startVal = sH + sM / 60.0;

        result.push({
          id: `exam_${exam.id}`,
          type: 'exam',
          dayIdx,
          startVal,
          duration: EXAM_DURATION_HOURS,
          color: "#e74c3c", 
          title: subject.name,
          timeStr: timeStr,
          startTime: timeStr,
          endTime: "",
          subtitle: `EXAM: ${exam.title}`,
          rawData: { exam, subject }
        });
      }
    });

    (customEvents || []).forEach(ev => {
      if (selectedLists.size > 0 && !selectedLists.has(ev.list_id)) return;

      const isRec = ev.is_recurring;
      
      const processEventForDate = (dateStr, dayIdx) => {
        const evStartStr = ev.date || ev.start_date || "";
        const evEndStr = ev.end_date || evStartStr;

        const [sH, sM] = (ev.start_time || "00:00").split(':').map(Number);
        const [eH, eM] = (ev.end_time || "00:00").split(':').map(Number);
        const eventStartVal = sH + sM / 60.0;
        const eventEndVal = eH + eM / 60.0;

        const isStartDay = (dateStr === evStartStr);
        const isEndDay = (dateStr === evEndStr);
        const isMiddleDay = (dateStr > evStartStr && dateStr < evEndStr);

        let drawStartVal = START_HOUR;
        let drawEndVal = END_HOUR;

        if (isStartDay) {
          drawStartVal = Math.max(START_HOUR, eventStartVal);
          if (isEndDay) drawEndVal = Math.min(END_HOUR, eventEndVal);
        } else if (isEndDay) {
          drawEndVal = Math.min(END_HOUR, eventEndVal);
        } else if (!isMiddleDay) {
          return null;
        }

        const duration = drawEndVal - drawStartVal;
        if (duration <= 0) return null;

        let timeText = "All day";
        const displayEnd = ev.end_time === "23:59" || ev.end_time === "00:00" ? "End of day" : ev.end_time;
        
        if (isStartDay && isEndDay) timeText = `${ev.start_time} \n ${displayEnd}`;
        else if (isStartDay) timeText = `${ev.start_time} \n ...`;
        else if (isEndDay) timeText = `... \n ${displayEnd}`;

        return {
          id: `ev_${ev.id}_${dateStr}`,
          type: 'event',
          dayIdx,
          startVal: drawStartVal,
          duration,
          color: ev.color || "#e67e22",
          title: ev.title || "Event",
          timeStr: timeText,
          startTime: isStartDay ? ev.start_time : "...",
          endTime: isEndDay ? displayEnd : "...",
          isCutTop: !isStartDay,
          isCutBottom: !isEndDay,
          rawData: { ev }
        };
      };

      if (!isRec) {
        const sDateStr = ev.date || ev.start_date;
        const eDateStr = ev.end_date || sDateStr;
        if (sDateStr) {
          let curr = new Date(sDateStr);
          const end = new Date(eDateStr);
          while (curr <= end) {
            const cStr = toDateString(curr);
            if (cStr >= weekStartStr && cStr <= weekEndStr) {
              const dayIdx = (curr.getDay() + 6) % 7;
              const block = processEventForDate(cStr, dayIdx);
              if (block) result.push(block);
            }
            curr.setDate(curr.getDate() + 1);
          }
        }
      } else {
        const evDay = ev.day_of_week;
        if (evDay >= 0 && evDay <= 6) {
          const targetDate = new Date(currentWeekMonday);
          targetDate.setDate(targetDate.getDate() + evDay);
          const targetStr = toDateString(targetDate);
          
          let valid = true;
          if (ev.start_date && targetStr < ev.start_date) valid = false;
          if (ev.end_date && targetStr > ev.end_date) valid = false;
          
          if (valid) {
            const block = processEventForDate(targetStr, evDay);
            if (block) result.push(block);
          }
        }
      }
    });

    const classBlocks = result.filter(b => b.type === 'class');
    result.filter(b => b.type === 'exam').forEach(examBlock => {
      const ex = examBlock.rawData.exam;
      const exTime = (ex.time || "08:00").substring(0, 5);
      
      const matchingClass = classBlocks.find(c => 
        c.rawData.entry.subject_id === ex.subject_id &&
        c.rawData.dateStr === ex.date &&
        c.startTime.substring(0, 5) === exTime
      );
      
      if (matchingClass) {
        examBlock.isMerged = true;
        matchingClass.associatedExam = examBlock;
      }
    });

    return result;
  }, [subjects, scheduleEntries, exams, customEvents, cancellations, currentWeekMonday, weekDates, selectedSemesters, selectedLists]);

  const agendaItems = useMemo(() => {
    const selectedDayIdx = weekDates.findIndex(d => toDateString(d) === selectedDate);
    if (selectedDayIdx === -1) return [];
    
    return blocks
      .filter(b => b.dayIdx === selectedDayIdx)
      .sort((a, b) => a.startVal - b.startVal); 
  }, [blocks, selectedDate, weekDates]);

  useEffect(() => {
    if (!scrollRef.current) return;

    let earliestHour = 24.0;
    let hasEvents = false;

    for (const block of blocks) {
      if (block.isCutTop) continue; 
      if (block.startVal < earliestHour) {
        earliestHour = block.startVal;
        hasEvents = true;
      }
    }

    const targetHour = hasEvents ? Math.max(START_HOUR, earliestHour - 1) : 8;
    const targetScrollY = (targetHour - START_HOUR) * PX_PER_HOUR;

    const timeoutId = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: targetScrollY,
          behavior: 'smooth'
        });
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [blocks, currentWeekMonday]); 

  const now = new Date();
  const todayStr = toDateString(now);
  const isCurrentWeek = weekDates.some(d => toDateString(d) === todayStr);
  const currentDayIdx = (now.getDay() + 6) % 7;
  const currentHourVal = now.getHours() + now.getMinutes() / 60.0;

  const prevWeek = () => { 
    const d = new Date(currentWeekMonday); d.setDate(d.getDate() - 7); setCurrentWeekMonday(d); 
    const sd = new Date(selectedDate); sd.setDate(sd.getDate() - 7); setSelectedDate(toDateString(sd));
  };
  const nextWeek = () => { 
    const d = new Date(currentWeekMonday); d.setDate(d.getDate() + 7); setCurrentWeekMonday(d); 
    const sd = new Date(selectedDate); sd.setDate(sd.getDate() + 7); setSelectedDate(toDateString(sd));
  };
  const goToToday = () => {
    const today = new Date();
    setCurrentWeekMonday(getMonday(today));
    setSelectedDate(toDateString(today));
  };

  const handleBlockClick = (e, block) => {
    e.stopPropagation();
    
    let items = [];
    if (block.type === 'class') {
      items = [
        { label: `Edit: ${block.rawData.subject.name}`, action: () => { setFormInitialData(block.rawData.subject); setShowSubjectForm(true); } },
        { label: "Cancel class (this week only)", action: () => alert("Cancel Class Placeholder"), destructive: true }
      ];
    } else if (block.type === 'exam') {
      items = [
        { label: "Edit Exam", action: () => { setFormInitialData(block.rawData.exam); setShowExamForm(true); } },
        { label: "Delete", action: () => { 
          if(window.confirm("Are you sure you want to delete this exam?")) deleteExam(block.rawData.exam.id); 
        }, destructive: true }
      ];
    } else if (block.type === 'event') {
      items = [
        { label: "Edit Event", action: () => { setFormInitialData(block.rawData.ev); setShowEventForm(true); } },
        { label: "Delete", action: () => { 
          if(window.confirm("Are you sure you want to delete this event?")) deleteCustomEvent(block.rawData.ev.id); 
        }, destructive: true }
      ];
    }

    setContextMenu({
      // ZMIANA: Zwiększony margines, aby menu nigdy nie wychodziło poza krawędź ekranu
      x: Math.min(e.clientX, window.innerWidth - 240),
      y: Math.min(e.clientY, window.innerHeight - 150),
      items
    });
  };

  const toggleFilter = (set, id) => {
    const newSet = new Set(set);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    return newSet;
  };

  return (
    <div className="flex flex-col h-full bg-[#2b2b2b] text-white">
      
      {/* ZMIANA: Dodano pt-[calc(env(safe-area-inset-top)+1rem)] na notcha oraz zmniejszono gap-4 na gap-2 sm:gap-4 dla małych ekranów */}
      <header className="flex flex-wrap items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-800 gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <h1 className="text-xl md:text-3xl font-bold hidden md:block truncate">Schedule</h1>
          
          <div className="relative shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); setContextMenu(null); }}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${(selectedSemesters.size > 0 || selectedLists.size > 0) ? 'bg-[#3498db] border-[#3498db] text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
            >
              Filters {(selectedSemesters.size > 0 || selectedLists.size > 0) && '•'}
            </button>
            
            {showFilters && (
              <div className="absolute top-full mt-2 left-0 w-64 bg-[#1c1c1e] border border-gray-800 rounded-xl shadow-2xl z-50 p-2" onClick={e => e.stopPropagation()}>
                <div className="text-xs font-bold text-gray-500 mb-2 px-2 uppercase tracking-wider">Semesters</div>
                {semesters?.map(sem => (
                  <label key={sem.id} className="flex items-center gap-3 px-2 py-2 hover:bg-white/5 rounded-lg cursor-pointer">
                    <input type="checkbox" className="accent-[#3498db]" checked={selectedSemesters.has(sem.id)} onChange={() => setSelectedSemesters(toggleFilter(selectedSemesters, sem.id))} />
                    <span className="text-sm">{sem.name}</span>
                  </label>
                ))}
                <div className="text-xs font-bold text-gray-500 mt-4 mb-2 px-2 uppercase tracking-wider">Categories (Lists)</div>
                {eventLists?.map(lst => (
                  <label key={lst.id} className="flex items-center gap-3 px-2 py-2 hover:bg-white/5 rounded-lg cursor-pointer">
                    <input type="checkbox" className="accent-[#3498db]" checked={selectedLists.has(lst.id)} onChange={() => setSelectedLists(toggleFilter(selectedLists, lst.id))} />
                    <span className="text-sm">{lst.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ZMIANA: Optymalizacja prawej sekcji nagłówka pod małe ekrany */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
          <button 
            onClick={() => { setFormInitialData(null); setShowEventForm(true); }} 
            className="p-1.5 text-gray-400 hover:text-[#3498db] transition-colors md:mr-2 shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
          </button>

          <div className="flex items-center gap-0.5 sm:gap-2 bg-[#1c1c1e] p-1 rounded-xl border border-gray-800 min-w-0">
            <button onClick={prevWeek} className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div className="text-xs sm:text-sm font-bold min-w-[105px] sm:min-w-[130px] text-center truncate">
              {weekDates[0].toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit'})} - {weekDates[6].toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit'})}
            </div>
            <button onClick={nextWeek} className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
            <div className="w-px h-5 bg-gray-700 mx-0.5 sm:mx-1 shrink-0"></div>
            <button onClick={goToToday} className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors shrink-0">Today</button>
          </div>
        </div>
      </header>

      <div className="md:hidden flex flex-col flex-1 overflow-hidden bg-[#121212]">
        {/* ZMIANA: Użycie flex-1 na elementach dni zamiast sztywnych szerokości, zapobiega to scrollowi/ucinaniu */}
        <div className="flex justify-between sm:justify-start overflow-x-auto gap-1 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-[#1c1c1e] border-b border-gray-800 scrollbar-hide shrink-0">
          {weekDates.map((date, i) => {
            const dateStr = toDateString(date);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            return (
              <button 
                key={i} 
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center justify-center flex-1 sm:flex-none sm:min-w-[50px] py-1.5 sm:py-2 rounded-xl transition-colors ${isSelected ? 'bg-[#3498db] text-white shadow-md' : 'bg-transparent text-gray-400'}`}
              >
                <span className={`text-[10px] sm:text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-500'}`}>{DAYS[i].toUpperCase()}</span>
                <span className={`text-lg sm:text-xl font-bold mt-0.5 sm:mt-1 ${isSelected ? 'text-white' : (isToday ? 'text-[#3498db]' : 'text-gray-300')}`}>
                  {date.getDate()}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {agendaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 opacity-50">
              <svg className="w-12 h-12 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="text-gray-400 font-medium">No schedule for today.</span>
            </div>
          ) : (
            agendaItems.map(block => (
              <div 
                key={block.id} 
                onClick={(e) => handleBlockClick(e, block)}
                className={`relative bg-[#1c1c1e] rounded-xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform p-4 flex gap-4 h-auto ${block.type === 'exam' ? 'border border-red-500/30 bg-red-500/5' : ''}`}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: block.color }}></div>
                <div className="w-14 sm:w-16 flex-shrink-0 flex flex-col text-right justify-start mt-0.5">
                  <span className={`text-sm font-bold ${block.type === 'exam' ? 'text-red-500' : 'text-white'}`}>{block.startTime}</span>
                  {block.endTime && <span className="text-xs text-gray-500 font-medium">{block.endTime}</span>}
                </div>
                <div className="w-px bg-gray-800"></div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  {block.type === 'exam' && <span className="text-[10px] font-bold text-red-500 mb-0.5">{block.subtitle}</span>}
                  
                  {/* ZMIANA: Usunięto 'truncate' na rzecz zawijania wierszy. Ograniczam do 2/3 linii by nie robiło się zbyt długie */}
                  <span className="font-bold text-white text-base leading-tight mb-1 line-clamp-3 break-words whitespace-normal">
                    {block.title}
                  </span>
                  
                  {block.type !== 'exam' && block.subtitle && (
                    <span className="text-xs text-gray-400 flex items-start gap-1.5 mt-0.5 leading-tight">
                      {block.type === 'class' && <svg className="w-3.5 h-3.5 shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 8.56l-1.222.524a1 1 0 000 1.838l7 3a1 1 0 00.788 0l7-3a1 1 0 000-1.838H16.8l-6.4 2.743a1 1 0 01-.8 0L3.31 8.56z"/></svg>}
                      <span className="break-words line-clamp-2">{block.subtitle}</span>
                    </span>
                  )}
                  {(block.isCutTop || block.isCutBottom) && <span className="text-xs text-[#3498db] mt-1 font-medium">Multi-day event</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <main className="hidden md:flex flex-1 overflow-auto bg-white dark:bg-[#1c1c1e]" ref={scrollRef}>
        <div className="min-w-[800px] flex flex-col h-full w-full">
          <div className="flex border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20 bg-white dark:bg-[#1c1c1e]">
            <div className="w-16 flex-shrink-0"></div>
            {weekDates.map((date, i) => {
              const isToday = toDateString(date) === todayStr;
              return (
                <div key={i} className="flex-1 flex flex-col items-center py-2 border-l border-gray-100 dark:border-gray-800/50">
                  <span className={`text-xs font-bold uppercase ${isToday ? 'text-[#3498db]' : 'text-gray-500'}`}>{DAYS[i]}</span>
                  <span className={`text-xl font-bold ${isToday ? 'text-white bg-[#3498db] w-8 h-8 rounded-full flex items-center justify-center' : 'text-gray-800 dark:text-gray-200 mt-1'}`}>
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex relative w-full" style={{ height: `${(END_HOUR - START_HOUR) * PX_PER_HOUR}px` }}>
            <div className="w-16 flex-shrink-0 relative border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1c1c1e] z-10">
              {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
                <div key={i} className="absolute w-full text-right pr-2 text-xs text-gray-500 font-medium -translate-y-1/2" style={{ top: i * PX_PER_HOUR }}>
                  {`${String(START_HOUR + i).padStart(2, '0')}:00`}
                </div>
              ))}
            </div>

            <div className="flex-1 flex relative">
              {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                <div key={i} className="absolute w-full border-t border-gray-100 dark:border-gray-800 pointer-events-none" style={{ top: (i + 1) * PX_PER_HOUR }}></div>
              ))}

              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 border-l border-gray-100 dark:border-gray-800/50 relative"></div>
              ))}

              {blocks.filter(b => !b.isMerged).map(block => {
                const top = (block.startVal - START_HOUR) * PX_PER_HOUR;
                let height = block.duration * PX_PER_HOUR;
                let topOffset = 0;

                if (block.isCutTop) { topOffset = -6; height += 6; }
                if (block.isCutBottom) height += 30;

                return (
                  <div
                    key={block.id}
                    onClick={(e) => handleBlockClick(e, block)}
                    className="absolute cursor-pointer overflow-hidden transition-transform hover:scale-[1.02] shadow-sm hover:shadow-md z-10 group"
                    style={{
                      left: `${(block.dayIdx / 7) * 100}%`,
                      width: `${100 / 7}%`,
                      top: top + topOffset,
                      height: height,
                      padding: '1px 2px'
                    }}
                  >
                    <div 
                      className="w-full h-full rounded-md border-l-4 flex flex-col p-1.5 opacity-90 group-hover:opacity-100 relative"
                      style={{
                        backgroundColor: `${block.color}40`, 
                        borderColor: block.color,
                        borderTopLeftRadius: block.isCutTop ? '0' : undefined,
                        borderTopRightRadius: block.isCutTop ? '0' : undefined,
                        borderBottomLeftRadius: block.isCutBottom ? '0' : undefined,
                        borderBottomRightRadius: block.isCutBottom ? '0' : undefined,
                      }}
                    >
                      <span className="text-[10px] font-bold text-gray-900 dark:text-white leading-tight mb-0.5 line-clamp-2">{block.title}</span>
                      <span className="text-[9px] font-medium text-gray-800 dark:text-gray-300 leading-tight whitespace-pre-line">{block.timeStr}</span>
                      {block.subtitle && <span className="text-[9px] text-gray-700 dark:text-gray-400 truncate mt-0.5">{block.subtitle}</span>}
                      
                      {block.associatedExam && (
                        <div className="absolute inset-0 z-20 pointer-events-none group/exam">
                          <div 
                            onClick={(e) => handleBlockClick(e, block.associatedExam)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded border border-white flex items-center justify-center shadow-md transition-all duration-300 ease-in-out cursor-pointer pointer-events-auto group-hover/exam:opacity-0 group-hover/exam:scale-50"
                          >
                            <span className="text-white font-bold text-xs">!</span>
                          </div>

                          <div 
                            onClick={(e) => handleBlockClick(e, block.associatedExam)}
                            className="absolute top-1 right-1 w-5 h-5 opacity-0 rounded-md border-l-4 border-red-700 bg-[#e74c3c] shadow-lg flex flex-col overflow-hidden pointer-events-none transition-all duration-300 ease-out group-hover/exam:top-0 group-hover/exam:right-0 group-hover/exam:w-full group-hover/exam:h-full group-hover/exam:opacity-100 group-hover/exam:pointer-events-auto p-1.5"
                          >
                            <div className="w-max min-w-[120px]">
                              <span className="text-[10px] font-bold text-white leading-tight mb-0.5 block line-clamp-2">{block.associatedExam.title}</span>
                              <span className="text-[9px] font-medium text-white/90 leading-tight block whitespace-pre-line">{block.associatedExam.timeStr}</span>
                              <span className="text-[9px] font-bold text-red-200 truncate mt-0.5 block">{block.associatedExam.subtitle}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isCurrentWeek && currentHourVal >= START_HOUR && currentHourVal <= END_HOUR && (
                <div 
                  className="absolute z-20 flex items-center pointer-events-none"
                  style={{
                    left: `${(currentDayIdx / 7) * 100}%`,
                    width: `${100 / 7}%`,
                    top: (currentHourVal - START_HOUR) * PX_PER_HOUR,
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                  <div className="h-[2px] w-full bg-red-500"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#1c1c1e] border border-gray-800 rounded-xl shadow-2xl py-1 w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => { item.action(); setContextMenu(null); }}
              className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/10 transition-colors ${item.destructive ? 'text-red-500' : 'text-gray-200'} border-b border-gray-800 last:border-0`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* --- MODALE --- */}
      <ExamFormModal 
        isOpen={showExamForm} 
        initialData={formInitialData} 
        onClose={() => setShowExamForm(false)} 
      />

      <EventFormModal 
        isOpen={showEventForm} 
        initialData={formInitialData} 
        onClose={() => setShowEventForm(false)} 
      />

      <SubjectFormModal 
        isOpen={showSubjectForm} 
        initialData={formInitialData} 
        onClose={() => setShowSubjectForm(false)} 
      />

    </div>
  );
}