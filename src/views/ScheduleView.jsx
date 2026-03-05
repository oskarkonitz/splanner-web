import { useState, useEffect, useMemo, useRef } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../api/supabase' 
import ExamFormModal from '../components/ExamFormModal'
import EventFormModal from '../components/EventFormModal'
import SubjectFormModal from '../components/SubjectFormModal'
import NoteEditorModal from '../components/NoteEditorModal' 
import MinecraftNotebook from '../components/MinecraftNotebook' 

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

const getWeekDiff = (startDateStr, currentDateStr) => {
  if (!startDateStr || !currentDateStr) return 0;
  const start = getMonday(new Date(startDateStr));
  const current = getMonday(new Date(currentDateStr));
  start.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  const diffInDays = Math.round((current - start) / (1000 * 60 * 60 * 24));
  return Math.floor(diffInDays / 7);
};

export default function ScheduleView({ onBack }) {
  const { 
    subjects, scheduleEntries, exams, customEvents, cancellations, 
    semesters, eventLists, deleteExam, deleteCustomEvent,
    scheduleNotes, saveScheduleNote, cancelClass, fetchDashboardData 
  } = useData();

  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMonday(new Date()));
  const [selectedSemesters, setSelectedSemesters] = useState(new Set());
  const [selectedLists, setSelectedLists] = useState(new Set());
  
  const [selectedDate, setSelectedDate] = useState(() => toDateString(new Date()));

  const [showFilters, setShowFilters] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const [showExamForm, setShowExamForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [formInitialData, setFormInitialData] = useState(null);
  
  const [noteModalData, setNoteModalData] = useState(null);
  const [notebookSubject, setNotebookSubject] = useState(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', color: '#3498db' });

  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    const closeMenu = () => { setContextMenu(null); setShowFilters(false); };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleOpenCreateCategory = (e) => {
    e.stopPropagation();
    setCategoryForm({ id: null, name: '', color: '#3498db' });
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (e, lst) => {
    e.stopPropagation();
    setCategoryForm({ id: lst.id, name: lst.name, color: lst.color || '#3498db' });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    try {
      if (categoryForm.id) {
        await supabase.from('event_lists')
          .update({ name: categoryForm.name.trim(), color: categoryForm.color })
          .eq('id', categoryForm.id);
      } else {
        const newId = `evl_${Math.random().toString(36).substring(2, 10)}`;
        await supabase.from('event_lists')
          .insert([{ id: newId, name: categoryForm.name.trim(), color: categoryForm.color }]);
      }
      if (fetchDashboardData) fetchDashboardData();
      setShowCategoryModal(false);
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleDeleteList = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this category? Events linked to it will remain but lose their category assignment.")) return;
    try {
      await supabase.from('event_lists').delete().eq('id', id);
      const newSelected = new Set(selectedLists);
      newSelected.delete(id);
      setSelectedLists(newSelected);
      if (fetchDashboardData) fetchDashboardData();
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

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
    const semestersCache = (semesters || []).reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
    
    const weekEndStr = toDateString(weekDates[6]);
    const weekStartStr = toDateString(weekDates[0]);

    const cancels = new Set((cancellations || []).map(c => `${c.entry_id}_${c.date}`));
    
    const notesMap = (scheduleNotes || []).reduce((acc, n) => ({
      ...acc,
      [`${n.entry_id}_${n.date}`]: n.content
    }), {});

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

      const frequency = entry.frequency || 'weekly';
      if (frequency !== 'weekly') {
        const semester = semestersCache[subject.semester_id];
        const anchorDate = semester?.start_date || subject.start_datetime?.substring(0, 10) || "2024-01-01";
        const weekIndex = Math.abs(getWeekDiff(anchorDate, entryDateStr));

        if (frequency === 'even' && weekIndex % 2 !== 0) return;
        if (frequency === 'odd' && weekIndex % 2 === 0) return;
        if (frequency === 'every_2_weeks' && weekIndex % 2 !== 0) return; 
      }

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
        timeStr: `${entry.start_time} - ${entry.end_time}`,
        startTime: entry.start_time,
        endTime: entry.end_time,
        subtitle: [entry.type, entry.room ? `Room ${entry.room}` : ''].filter(Boolean).join(' • '),
        note: notesMap[`${entry.id}_${entryDateStr}`], 
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
        
        if (isStartDay && isEndDay) timeText = `${ev.start_time} - ${displayEnd}`;
        else if (isStartDay) timeText = `${ev.start_time} - ...`;
        else if (isEndDay) timeText = `... - ${displayEnd}`;

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
  }, [subjects, scheduleEntries, exams, customEvents, cancellations, currentWeekMonday, weekDates, selectedSemesters, selectedLists, scheduleNotes, semesters]);

  const layoutBlocks = useMemo(() => {
    const visibleBlocks = blocks.filter(b => !b.isMerged);
    const blocksByDay = Array.from({ length: 7 }, () => []);
    
    visibleBlocks.forEach(b => blocksByDay[b.dayIdx].push(b));

    const processedSegments = [];

    blocksByDay.forEach(dayBlocks => {
      if (dayBlocks.length === 0) return;

      dayBlocks.sort((a, b) => {
        if (a.startVal !== b.startVal) return a.startVal - b.startVal;
        return b.duration - a.duration;
      });

      const columns = [];
      dayBlocks.forEach(block => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const lastInCol = col[col.length - 1];
          if (lastInCol.startVal + lastInCol.duration <= block.startVal + 0.001) {
            col.push(block);
            block.baseColIdx = i;
            placed = true;
            break;
          }
        }
        if (!placed) {
          block.baseColIdx = columns.length;
          columns.push([block]);
        }
      });

      const timePoints = new Set();
      dayBlocks.forEach(b => {
        timePoints.add(b.startVal);
        timePoints.add(b.startVal + b.duration);
      });
      const sortedPoints = Array.from(timePoints).sort((a, b) => a - b);

      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const slotStart = sortedPoints[i];
        const slotEnd = sortedPoints[i + 1];
        const slotDuration = slotEnd - slotStart;

        if (slotDuration <= 0) continue;

        const epsilon = 0.0001;
        const activeBlocks = dayBlocks.filter(b =>
          b.startVal < slotEnd - epsilon && (b.startVal + b.duration) > slotStart + epsilon
        );

        if (activeBlocks.length === 0) continue;

        activeBlocks.sort((a, b) => a.baseColIdx - b.baseColIdx);
        const colCount = activeBlocks.length;

        activeBlocks.forEach((block, index) => {
          const isFirstSegment = Math.abs(block.startVal - slotStart) < epsilon;
          const isLastSegment = Math.abs((block.startVal + block.duration) - slotEnd) < epsilon;

          processedSegments.push({
            segmentId: `${block.id}_${slotStart}`,
            blockId: block.id,
            dayIdx: block.dayIdx,
            startVal: slotStart,
            duration: slotDuration,
            colCount: colCount,
            colIdx: index, 
            isFirstSegment,
            isLastSegment,
            originalBlock: block,
          });
        });
      }
    });

    const segmentsByBlock = {};
    processedSegments.forEach(seg => {
      if (!segmentsByBlock[seg.blockId]) segmentsByBlock[seg.blockId] = [];
      segmentsByBlock[seg.blockId].push(seg);
    });

    Object.values(segmentsByBlock).forEach(blockSegments => {
      let bestSeg = blockSegments[0];
      for (let i = 1; i < blockSegments.length; i++) {
        const seg = blockSegments[i];
        if (seg.colCount < bestSeg.colCount) {
          bestSeg = seg;
        } else if (seg.colCount === bestSeg.colCount && seg.duration > bestSeg.duration) {
          bestSeg = seg;
        }
      }
      blockSegments.forEach(seg => seg.isTextSegment = (seg === bestSeg));
    });

    return processedSegments;
  }, [blocks]);

  const agendaItems = useMemo(() => {
    const selectedDayIdx = weekDates.findIndex(d => toDateString(d) === selectedDate);
    if (selectedDayIdx === -1) return [];
    
    return blocks
      .filter(b => b.dayIdx === selectedDayIdx && !b.isMerged)
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

  const isSelectedDateToday = selectedDate === todayStr;
  const nextBlockId = isSelectedDateToday 
    ? agendaItems.find(b => b.startVal > currentHourVal)?.id 
    : null;

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

  const handleOpenNote = (block) => {
    setNoteModalData({
      isOpen: true,
      entryId: block.rawData.entry.id,
      date: block.rawData.dateStr,
      content: block.note || '',
      title: `Note: ${block.title}`
    });
  };

  const onSaveNote = async (content) => {
    if (!noteModalData) return;
    await saveScheduleNote(noteModalData.entryId, noteModalData.date, content);
    setNoteModalData(null);
  };

  const handleBlockClick = (e, block) => {
    e.stopPropagation();
    
    let items = [];
    if (block.type === 'class') {
      items = [
        { label: "Open Notebook", action: () => setNotebookSubject(block.rawData.subject) }, 
        { label: "Add / Edit Note", action: () => handleOpenNote(block) }, 
        { label: `Edit: ${block.rawData.subject.name}`, action: () => { setFormInitialData(block.rawData.subject); setShowSubjectForm(true); } },
        { 
          label: "Cancel class (this week only)", 
          action: () => {
            if(window.confirm(`Cancel class for ${block.rawData.dateStr}?`)) {
              cancelClass(block.rawData.entry.id, block.rawData.dateStr);
            }
          }, 
          destructive: true 
        } 
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
    <div className="flex flex-col h-full bg-[#2b2b2b] text-white relative">
      
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
                
                <div className="flex items-center justify-between px-2 mt-4 mb-2">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categories (Lists)</div>
                  <button onClick={handleOpenCreateCategory} className="text-[#3498db] hover:text-white p-1 rounded transition-colors" title="Create new category">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  </button>
                </div>
                {eventLists?.map(lst => (
                  <div key={lst.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-lg group">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input type="checkbox" className="accent-[#3498db]" checked={selectedLists.has(lst.id)} onChange={() => setSelectedLists(toggleFilter(selectedLists, lst.id))} />
                      <div className="flex items-center gap-2">
                        {lst.color && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lst.color }}></div>}
                        <span className="text-sm">{lst.name}</span>
                      </div>
                    </label>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleOpenEditCategory(e, lst)} 
                        className="text-gray-500 hover:text-[#3498db] p-1"
                        title="Edit category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button 
                        onClick={(e) => handleDeleteList(e, lst.id)} 
                        className="text-gray-500 hover:text-red-500 p-1"
                        title="Delete category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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

      <div className="md:hidden flex flex-col flex-1 overflow-hidden bg-[#2b2b2b]">
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
            agendaItems.map(block => {
              const isNow = isSelectedDateToday && block.startVal <= currentHourVal && (block.startVal + block.duration) > currentHourVal;
              const isNext = block.id === nextBlockId;

              return (
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
                    
                    {isNow && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Now</span>
                      </div>
                    )}

                    {isNext && (
                      <div className="mb-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#3498db]/20 text-[#3498db] border border-[#3498db]/30 uppercase tracking-wider">
                          Next
                        </span>
                      </div>
                    )}

                    {block.type === 'exam' && <span className="text-[10px] font-bold text-red-500 mb-0.5">{block.subtitle}</span>}
                    
                    <span className="font-bold text-white text-base leading-tight mb-1 line-clamp-3 break-words whitespace-normal">
                      {block.title}
                    </span>
                    
                    {block.type !== 'exam' && block.subtitle && (
                      <span className="text-xs text-gray-400 flex items-start gap-1.5 mt-0.5 leading-tight">
                        {block.type === 'class' && <svg className="w-3.5 h-3.5 shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 8.56l-1.222.524a1 1 0 000 1.838l7 3a1 1 0 00.788 0l7-3a1 1 0 000-1.838H16.8l-6.4 2.743a1 1 0 01-.8 0L3.31 8.56z"/></svg>}
                        <span className="break-words line-clamp-2">{block.subtitle}</span>
                      </span>
                    )}

                    {block.note && (
                      <div className="mt-2 p-2 bg-[#f1c40f]/10 border border-[#f1c40f]/20 rounded-lg">
                        <span className="text-[11px] text-[#f1c40f] font-medium break-words whitespace-normal line-clamp-4 italic">
                          "{block.note}"
                        </span>
                      </div>
                    )}

                    {block.associatedExam && (
                      <div 
                        className="mt-2 p-2 bg-[#e74c3c]/10 border border-[#e74c3c]/30 rounded-lg cursor-pointer active:bg-[#e74c3c]/20 transition-colors"
                        onClick={(e) => handleBlockClick(e, block.associatedExam)}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-4 h-4 rounded bg-[#e74c3c] text-white text-[10px] font-bold flex items-center justify-center shrink-0">!</span>
                          <span className="text-[10px] font-bold text-[#e74c3c] uppercase tracking-wider">{block.associatedExam.subtitle}</span>
                        </div>
                        <span className="text-[11px] text-[#e74c3c] opacity-90 font-medium break-words whitespace-normal">
                          {block.associatedExam.timeStr}
                        </span>
                      </div>
                    )}

                    {(block.isCutTop || block.isCutBottom) && <span className="text-xs text-[#3498db] mt-1 font-medium">Multi-day event</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <main className="hidden md:flex flex-1 overflow-auto bg-[#2b2b2b]" ref={scrollRef}>
        <div className="min-w-[800px] flex flex-col h-full w-full">
          <div className="flex border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20 bg-[#2b2b2b]">
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
            <div className="w-16 flex-shrink-0 relative border-r border-gray-200 dark:border-gray-800 bg-[#2b2b2b] z-10">
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

              {(() => {
                const hoveredSegments = hoveredBlockId 
                  ? layoutBlocks.filter(s => s.blockId === hoveredBlockId)
                  : [];

                return layoutBlocks.map(segment => {
                  const block = segment.originalBlock;
                  
                  let topOffset = 0;
                  let height = segment.duration * PX_PER_HOUR;

                  if (segment.isFirstSegment && block.isCutTop) { topOffset = -6; height += 6; }
                  if (segment.isLastSegment && block.isCutBottom) { height += 30; }

                  const isHovered = hoveredBlockId === block.id;
                  const hoveredSegInSlot = hoveredSegments.find(s => 
                     s.dayIdx === segment.dayIdx && s.startVal === segment.startVal
                  );

                  let colWidthPct = 100 / segment.colCount;
                  let colLeftPct = (segment.colIdx / segment.colCount) * 100;
                  let zIndex = 10;
                  let opacity = 1;

                  // ROZPYCHANIE 100% - 0% oraz wypychanie najechanego segmentu na sam szczyt stosu Z-index
                  if (hoveredSegInSlot && segment.colCount > 1) {
                    if (isHovered) {
                      colWidthPct = 100;
                      colLeftPct = 0;
                      zIndex = hoveredSegmentId === segment.segmentId ? 50 : 40;
                    } else {
                      colWidthPct = 0;
                      colLeftPct = segment.colIdx === 0 ? 0 : 100;
                      zIndex = 0;
                      opacity = 0;
                    }
                  } else if (isHovered) {
                    colWidthPct = 100;
                    colLeftPct = 0;
                    zIndex = hoveredSegmentId === segment.segmentId ? 50 : 40;
                  }

                  const isConflict = segment.colCount > 1 && !isHovered;
                  const showLeftBorder = isHovered || segment.colIdx === 0 || segment.colCount === 1;

                  const finalWidthPct = (colWidthPct / 100) * (100 / 7);
                  const finalLeftPct = (segment.dayIdx / 7) * 100 + (colLeftPct / 100) * (100 / 7);
                  
                  const showText = isHovered ? segment.isFirstSegment : segment.isTextSegment;
                  const textHeight = isHovered 
                    ? `${block.duration * PX_PER_HOUR}px`
                    : `${(block.startVal + block.duration - segment.startVal) * PX_PER_HOUR}px`;

                  return (
                    <div
                      key={segment.segmentId}
                      onClick={(e) => handleBlockClick(e, block)}
                      onMouseEnter={() => { 
                        setHoveredBlockId(block.id); 
                        setHoveredSegmentId(segment.segmentId); 
                      }}
                      onMouseLeave={() => { 
                        setHoveredBlockId(null); 
                        setHoveredSegmentId(null); 
                      }}
                      className="absolute cursor-pointer group shadow-sm transition-all duration-300 ease-in-out"
                      style={{
                        left: `${finalLeftPct}%`,
                        width: `${finalWidthPct}%`,
                        top: (segment.startVal - START_HOUR) * PX_PER_HOUR + topOffset,
                        height: height,
                        padding: 0,
                        zIndex: zIndex,
                        opacity: opacity
                      }}
                    >
                      <div 
                        className="w-full h-full flex flex-col relative transition-colors"
                        style={{
                          backgroundColor: isHovered ? `${block.color}80` : `${block.color}40`, 
                          borderColor: block.color,
                          borderLeftWidth: showLeftBorder ? '4px' : '0px',
                          borderTopLeftRadius: segment.isFirstSegment && !block.isCutTop && !isConflict ? '0.375rem' : '0',
                          borderTopRightRadius: segment.isFirstSegment && !block.isCutTop && !isConflict ? '0.375rem' : '0',
                          borderBottomLeftRadius: segment.isLastSegment && !block.isCutBottom && !isConflict ? '0.375rem' : '0',
                          borderBottomRightRadius: segment.isLastSegment && !block.isCutBottom && !isConflict ? '0.375rem' : '0',
                        }}
                      >
                        {showText && ( 
                          <div 
                            className="absolute top-0 left-0 w-full p-1.5 flex flex-col pointer-events-none overflow-hidden z-30"
                            style={{ height: textHeight }}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold text-gray-900 dark:text-white leading-tight mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{block.title}</span>
                            </div>

                            <span className="text-[9px] font-medium text-gray-800 dark:text-gray-300 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{block.timeStr}</span>
                            {block.subtitle && <span className="text-[9px] font-medium text-gray-800 dark:text-gray-300 truncate mt-0.5">{block.subtitle}</span>}
                          </div>
                        )}
                        
                        {segment.isLastSegment && block.note && (
                          <div 
                            className="absolute inset-0 z-40 pointer-events-none group/note"
                            style={{ '--full-height': `${block.duration * PX_PER_HOUR}px` }}
                          >
                            <div 
                              onClick={(e) => { e.stopPropagation(); handleOpenNote(block); }}
                              className="absolute bottom-1 right-1 w-5 h-5 bg-[#f1c40f] rounded border border-white flex items-center justify-center shadow-md transition-all duration-300 ease-in-out cursor-pointer pointer-events-auto group-hover/note:opacity-0 group-hover/note:scale-50"
                            >
                              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                              </svg>
                            </div>

                            <div 
                              onClick={(e) => { e.stopPropagation(); handleOpenNote(block); }}
                              className="absolute bottom-0 right-0 w-5 h-5 opacity-0 rounded-md border-l-4 border-yellow-600 bg-[#f1c40f] shadow-lg flex flex-col overflow-hidden pointer-events-none transition-all duration-300 ease-out group-hover/note:w-full group-hover/note:h-[var(--full-height)] group-hover/note:opacity-100 group-hover/note:pointer-events-auto p-1.5 z-[60]"
                            >
                              <div className="w-full h-full flex flex-col">
                                <span className="text-[10px] font-bold text-black mb-1 shrink-0">Note:</span>
                                <span className="text-[9px] font-medium text-black leading-tight whitespace-pre-line italic overflow-y-auto pr-1 scrollbar-hide">
                                  {block.note}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {segment.isFirstSegment && block.associatedExam && (
                          <div 
                            className="absolute inset-0 z-40 pointer-events-none group/exam"
                            style={{ '--full-height': `${block.duration * PX_PER_HOUR}px` }}
                          >
                            <div 
                              onClick={(e) => handleBlockClick(e, block.associatedExam)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded border border-white flex items-center justify-center shadow-md transition-all duration-300 ease-in-out cursor-pointer pointer-events-auto group-hover/exam:opacity-0 group-hover/exam:scale-50"
                            >
                              <span className="text-white font-bold text-xs">!</span>
                            </div>

                            <div 
                              onClick={(e) => handleBlockClick(e, block.associatedExam)}
                              className="absolute top-0 right-0 w-5 h-5 opacity-0 rounded-md border-l-4 border-red-700 bg-[#e74c3c] shadow-lg flex flex-col overflow-hidden pointer-events-none transition-all duration-300 ease-out group-hover/exam:w-full group-hover/exam:h-[var(--full-height)] group-hover/exam:opacity-100 group-hover/exam:pointer-events-auto p-1.5 z-[60]"
                            >
                              <div className="w-max min-w-[120px]">
                                <span className="text-[10px] font-bold text-white leading-tight mb-0.5 block line-clamp-2">{block.associatedExam.title}</span>
                                <span className="text-[9px] font-medium text-white leading-tight block whitespace-pre-line">{block.associatedExam.timeStr}</span>
                                <span className="text-[9px] font-bold text-white truncate mt-0.5 block">{block.associatedExam.subtitle}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

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

      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={(e) => { e.stopPropagation(); setShowCategoryModal(false); }}>
          <div className="bg-[#1c1c1e] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{categoryForm.id ? 'Edit Category' : 'New Category'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                <input 
                  type="text" 
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full bg-[#2b2b2b] border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#3498db]"
                  placeholder="Category Name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={categoryForm.color}
                    onChange={e => setCategoryForm({...categoryForm, color: e.target.value})}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="text-sm text-gray-400 font-mono">{categoryForm.color}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCategory}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-[#3498db] hover:bg-[#2980b9] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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
      
      <NoteEditorModal 
        isOpen={noteModalData?.isOpen} 
        initialNote={noteModalData?.content} 
        title={noteModalData?.title}
        onClose={() => setNoteModalData(null)}
        onSave={onSaveNote}
      />

      <MinecraftNotebook 
        isOpen={!!notebookSubject} 
        onClose={() => setNotebookSubject(null)} 
        subject={notebookSubject} 
      />

    </div>
  );
}