import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

const DataContext = createContext();

const generateId = (prefix) => {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
};

export function DataProvider({ children, session }) {
  const [isLoading, setIsLoading] = useState(true);
  
  const [dailyTasks, setDailyTasks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [exams, setExams] = useState([]);
  const [globalStats, setGlobalStats] = useState([]);
  
  const [subjects, setSubjects] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [eventLists, setEventLists] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [gradeModules, setGradeModules] = useState([]);
  const [grades, setGrades] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);

  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        tasksRes, topicsRes, examsRes, statsRes, 
        subjectsRes, scheduleRes, cancellationsRes, 
        customEventsRes, eventListsRes, semestersRes,
        gradeModulesRes, gradesRes, blockedRes
      ] = await Promise.all([
        supabase.from('daily_tasks').select('*'),
        supabase.from('topics').select('*'),
        supabase.from('exams').select('*'),
        supabase.from('global_stats').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('schedule_entries').select('*'),
        supabase.from('schedule_cancellations').select('*'),
        supabase.from('custom_events').select('*'),
        supabase.from('event_lists').select('*'),
        supabase.from('semesters').select('*'),
        supabase.from('grade_modules').select('*'),
        supabase.from('grades').select('*'),
        supabase.from('blocked_dates').select('*') // Oczekiwana struktura: { date: "YYYY-MM-DD" }
      ]);

      if (tasksRes.data) setDailyTasks(tasksRes.data);
      if (topicsRes.data) setTopics(topicsRes.data);
      if (examsRes.data) setExams(examsRes.data);
      if (statsRes.data) setGlobalStats(statsRes.data);
      
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (scheduleRes.data) setScheduleEntries(scheduleRes.data);
      if (cancellationsRes.data) setCancellations(cancellationsRes.data);
      if (customEventsRes.data) setCustomEvents(customEventsRes.data);
      if (eventListsRes.data) setEventLists(eventListsRes.data);
      if (semestersRes.data) setSemesters(semestersRes.data);
      if (gradeModulesRes.data) setGradeModules(gradeModulesRes.data);
      if (gradesRes.data) setGrades(gradesRes.data);
      if (blockedRes.data) setBlockedDates(blockedRes.data);

    } catch (error) {
      console.error("Błąd pobierania Dashboardu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNKCJE CRUD (Z poprzednich kroków) ---
  const saveExam = async (examData, isEditMode) => {
    try {
      const examId = isEditMode ? examData.id : generateId('exam');
      
      const payload = {
        title: examData.title,
        subject_id: examData.subjectId,
        subject: examData.subjectName,
        date: examData.date,
        time: examData.time,
        ignore_barrier: examData.ignoreBarrier,
        color: examData.color
      };

      if (isEditMode) {
        const { error } = await supabase.from('exams').update(payload).eq('id', examId);
        if (error) throw error;
      } else {
        payload.id = examId;
        payload.note = '';
        const { error } = await supabase.from('exams').insert([payload]);
        if (error) throw error;
      }

      if (examData.topicsRaw !== undefined) {
        const newNames = examData.topicsRaw.split('\n')
          .map(t => t.replace(/^\d+\.\s*/, '').trim())
          .filter(t => t.length > 0);
        
        const currentExamTopics = topics.filter(t => t.exam_id === examId);
        const existingMap = {};
        currentExamTopics.forEach(t => existingMap[t.name] = t);

        const keptIds = [];
        const topicsToInsert = [];

        newNames.forEach(name => {
          if (existingMap[name]) {
            keptIds.push(existingMap[name].id);
          } else {
            topicsToInsert.push({
              id: generateId('topic'),
              exam_id: examId,
              name: name,
              status: 'todo',
              locked: false,
              note: ''
            });
          }
        });

        const topicsToDelete = currentExamTopics
          .filter(t => !keptIds.includes(t.id))
          .map(t => t.id);

        if (topicsToInsert.length > 0) await supabase.from('topics').insert(topicsToInsert);
        if (topicsToDelete.length > 0) await supabase.from('topics').delete().in('id', topicsToDelete);
      }

      await fetchDashboardData();
    } catch (error) {
      console.error("Błąd zapisu egzaminu:", error);
      alert("Wystąpił błąd podczas zapisu egzaminu.");
    }
  };

  const deleteExam = async (id) => {
    try {
      await supabase.from('exams').delete().eq('id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const saveExamNote = async (examId, note) => {
    try {
      await supabase.from('exams').update({ note }).eq('id', examId);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const saveTopic = async (topicData) => {
    try {
      const { error } = await supabase.from('topics').update({
        name: topicData.name,
        scheduled_date: topicData.scheduled_date || null,
        locked: topicData.locked,
        note: topicData.note || ''
      }).eq('id', topicData.id);
      
      if (error) throw error;
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const deleteTopic = async (id) => {
    try {
      await supabase.from('topics').delete().eq('id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const toggleTopicStatus = async (topicId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      const { error } = await supabase.from('topics').update({ status: newStatus }).eq('id', topicId);
      if (error) throw error;
      
      if (newStatus === 'done') {
        const stats = globalStats || [];
        const doneStat = stats.find(s => s.key === 'topics_done');
        if (doneStat) {
          await supabase.from('global_stats')
            .update({ value: parseInt(doneStat.value || 0) + 1 })
            .eq('key', 'topics_done');
        }
      }
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const saveCustomEvent = async (eventData, isEditMode) => {
    try {
      const payload = {
        title: eventData.title,
        list_id: eventData.listId,
        color: eventData.color,
        is_recurring: eventData.isRecurring,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        date: eventData.date || null,
        start_date: eventData.startDate || null,
        end_date: eventData.endDate || null,
        day_of_week: eventData.dayOfWeek !== undefined ? eventData.dayOfWeek : null
      };

      if (isEditMode) {
        const { error } = await supabase.from('custom_events').update(payload).eq('id', eventData.id);
        if (error) throw error;
      } else {
        payload.id = generateId('ev');
        await supabase.from('custom_events').insert([payload]);
      }
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const deleteCustomEvent = async (id) => {
    try {
      await supabase.from('custom_events').delete().eq('id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const saveSubject = async (subjectData, entries, isEditMode) => {
    try {
      let subId = subjectData.id;
      const payload = {
        semester_id: subjectData.semester_id,
        name: subjectData.name,
        short_name: subjectData.short_name,
        color: subjectData.color,
        weight: subjectData.weight,
        start_datetime: subjectData.start_datetime ? `${subjectData.start_datetime} 00:00:00` : null,
        end_datetime: subjectData.end_datetime ? `${subjectData.end_datetime} 23:59:59` : null
      };

      if (isEditMode) {
        await supabase.from('subjects').update(payload).eq('id', subId);
      } else {
        subId = generateId('sub');
        payload.id = subId;
        await supabase.from('subjects').insert([payload]);
      }

      await supabase.from('schedule_entries').delete().eq('subject_id', subId);

      if (entries && entries.length > 0) {
        const entriesToInsert = entries.map(e => ({
          id: generateId('sch'),
          subject_id: subId,
          day_of_week: e.day_of_week,
          start_time: e.start_time,
          end_time: e.end_time,
          room: e.room,
          type: e.type,
          period_start: null,
          period_end: null
        }));
        await supabase.from('schedule_entries').insert(entriesToInsert);
      }

      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  // ==========================================
  // ALGORYTM PLANUJĄCY (Przeniesiony 1:1 z Pythona)
  // ==========================================
  const runPlanner = async (onlyUnscheduled = false) => {
    console.log(`Uruchamiam Planner (onlyUnscheduled: ${onlyUnscheduled})...`);
    
    // 1. Inicjalizacja Dat i Danych
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    const todayStr = today.toISOString().split('T')[0];
    const todayNum = new Date(todayStr).getTime(); // Używamy czasu 00:00 w lokalnej strefie do porównań
    
    const blockedSet = new Set((blockedDates || []).map(b => b.date));
    const calendar = {};

    // Szukamy najdalszej daty egzaminu
    let maxDateNum = todayNum;
    exams.forEach(ex => {
      if (!ex.date) return;
      const exDateNum = new Date(ex.date).getTime();
      if (exDateNum > maxDateNum) maxDateNum = exDateNum;
    });

    // 2. Wypełniamy kalendarz pustymi tablicami od dzisiaj do maxDate
    let currNum = maxDateNum;
    while (currNum >= todayNum) {
      const dStr = new Date(currNum).toISOString().split('T')[0];
      calendar[dStr] = [];
      currNum -= 86400000; // minus 1 dzień (w milisekundach)
    }

    // 3. Wstawiamy znaczniki "E" (Bariery Egzaminacyjne)
    exams.forEach(ex => {
      if (ex.ignore_barrier || !ex.date) return;
      if (new Date(ex.date).getTime() >= todayNum) {
        if (calendar[ex.date]) calendar[ex.date].push("E");
      }
    });

    // 4. Główna pętla po Egzaminach
    exams.forEach(exam => {
      if (!exam.date) return;
      const examDateNum = new Date(exam.date).getTime();
      if (examDateNum <= todayNum) return;

      const endStudyNum = examDateNum - 86400000;
      if (endStudyNum < todayNum) return;

      // Szukamy startu okna nauki (skanowanie wstecz aż do bariery "E" lub dzisiaj)
      let scanNum = endStudyNum;
      while (scanNum > todayNum) {
        const scanStr = new Date(scanNum).toISOString().split('T')[0];
        if (calendar[scanStr] && calendar[scanStr].includes("E")) {
          break; // Odbijamy się od bariery
        }
        scanNum -= 86400000;
      }
      const startStudyNum = scanNum;

      // Zbieramy tematy dla tego egzaminu (odrzucamy Locked i zrobione)
      let tList = topics.filter(t => t.exam_id === exam.id && t.status === "todo" && !t.locked);
      if (onlyUnscheduled) {
        tList = tList.filter(t => !t.scheduled_date);
      }
      
      if (tList.length === 0) return; // Brak tematów do rozłożenia

      // Zbieramy dni, które nadają się do nauki
      const validDays = [];
      let cNum = startStudyNum < todayNum ? todayNum : startStudyNum;
      
      while (cNum <= endStudyNum) {
        const curStr = new Date(cNum).toISOString().split('T')[0];
        const hasExam = calendar[curStr] && calendar[curStr].includes("E");

        // Dzień poprawny: nie zablokowany ORAZ (nie ma Egzaminu LUB jest to dzień startowy-odbicie)
        if (!blockedSet.has(curStr)) {
          if (!hasExam || (hasExam && cNum === startStudyNum)) {
            validDays.push(curStr);
          }
        }
        cNum += 86400000;
      }

      validDays.sort();
      if (validDays.length === 0) return;

      // ALGORYTM ROZKŁADANIA (Back-loading / Offset)
      const daysTotal = validDays.length;
      const tasksTotal = tList.length;
      let startIndex = 0;

      if (tasksTotal <= daysTotal) {
        startIndex = daysTotal - tasksTotal; // Przyklej do egzaminu (przesuń w prawo)
      }

      for (let i = startIndex; i < daysTotal; i++) {
        if (tList.length === 0) break;
        
        const currentDayStr = validDays[i];
        const daysRemaining = daysTotal - i;
        const tasksRemaining = tList.length;
        
        const perDay = daysRemaining > 0 ? Math.ceil(tasksRemaining / daysRemaining) : tasksRemaining;

        for (let j = 0; j < perDay; j++) {
          if (tList.length > 0) {
            const task = tList.shift();
            if (calendar[currentDayStr]) {
              calendar[currentDayStr].push(task.id);
            }
          }
        }
      }
    });

    // 5. Zapisanie wyników
    const topicsMap = {};
    topics.forEach(t => topicsMap[t.id] = { ...t });

    // A. Resetowanie starych dat
    if (!onlyUnscheduled) {
      Object.values(topicsMap).forEach(topic => {
        if (topic.status === "todo" && !topic.locked) {
          topic.scheduled_date = null;
        }
      });
    }

    // B. Przypisywanie wyliczonych dat
    Object.entries(calendar).forEach(([dateStr, items]) => {
      items.forEach(itemId => {
        if (itemId === "E") return;
        if (topicsMap[itemId]) {
          topicsMap[itemId].scheduled_date = dateStr;
        }
      });
    });

    // C. Bulk Update do Supabase
    const topicsToUpdate = Object.values(topicsMap).map(t => ({
      id: t.id,
      exam_id: t.exam_id,
      name: t.name,
      status: t.status,
      scheduled_date: t.scheduled_date,
      locked: t.locked,
      note: t.note
    }));

    try {
      const { error } = await supabase.from('topics').upsert(topicsToUpdate);
      if (error) throw error;
      await fetchDashboardData();
      // Opcjonalnie powiadomienie
      console.log("Plan wygenerowany pomyślnie!");
    } catch (err) {
      console.error("Błąd podczas zapisywania wygenerowanego planu:", err);
      alert("Failed to save the generated plan.");
    }
  };

  return (
    <DataContext.Provider value={{ 
      isLoading, dailyTasks, topics, exams, globalStats,
      subjects, scheduleEntries, cancellations, customEvents,
      eventLists, semesters, gradeModules, grades,
      fetchDashboardData, saveExam, deleteExam, saveCustomEvent, deleteCustomEvent, saveSubject,
      toggleTopicStatus, saveExamNote, saveTopic, deleteTopic,
      runPlanner // <--- NOWOŚĆ: Wyeksportowany planer
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    console.error("⚠️ BŁĄD: useData musi być użyte wewnątrz <DataProvider>!");
    return { isLoading: true }; 
  }
  return context;
};