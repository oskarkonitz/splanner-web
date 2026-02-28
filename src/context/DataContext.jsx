import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

// 1. Tworzymy kontekst
const DataContext = createContext();

// Pomocnicza funkcja do generowania ID
const generateId = (prefix) => {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
};

// 2. Provider
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
        gradeModulesRes, gradesRes
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
        supabase.from('grades').select('*')
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

    } catch (error) {
      console.error("Błąd pobierania Dashboardu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNKCJE ZAPISU I USUWANIA ---

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

      // --- LOGIKA TEMATÓW (JAK W PYTHONIE) ---
      if (examData.topicsRaw !== undefined) {
        // Czyścimy i parsujemy string z tematami
        const newNames = examData.topicsRaw.split('\n')
          .map(t => t.replace(/^\d+\.\s*/, '').trim())
          .filter(t => t.length > 0);
        
        // Pobieramy aktualne tematy dla tego egzaminu (ze stanu)
        const currentExamTopics = topics.filter(t => t.exam_id === examId);
        
        const existingMap = {};
        currentExamTopics.forEach(t => existingMap[t.name] = t);

        const keptIds = [];
        const topicsToInsert = [];

        newNames.forEach(name => {
          if (existingMap[name]) {
            keptIds.push(existingMap[name].id); // Temat już istnieje - zachowujemy
          } else {
            topicsToInsert.push({ // Nowy temat
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

        if (topicsToInsert.length > 0) {
          await supabase.from('topics').insert(topicsToInsert);
        }
        
        if (topicsToDelete.length > 0) {
          await supabase.from('topics').delete().in('id', topicsToDelete);
        }
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
    } catch (error) {
      console.error("Błąd usuwania egzaminu:", error);
    }
  };

  // NOWE: NOTATKI DLA EGZAMINU
  const saveExamNote = async (examId, note) => {
    try {
      await supabase.from('exams').update({ note }).eq('id', examId);
      await fetchDashboardData();
    } catch (error) {
      console.error("Błąd zapisu notatki:", error);
    }
  };

  // NOWE: OBSŁUGA POJEDYNCZEGO TEMATU
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
    } catch (error) {
      console.error("Błąd zapisu tematu:", error);
    }
  };

  const deleteTopic = async (id) => {
    try {
      await supabase.from('topics').delete().eq('id', id);
      await fetchDashboardData();
    } catch (error) {
      console.error("Błąd usuwania tematu:", error);
    }
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
    } catch (error) {
      console.error("Błąd zmiany statusu tematu:", error);
    }
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
        const { error } = await supabase.from('custom_events').insert([payload]);
        if (error) throw error;
      }
      await fetchDashboardData();
    } catch (error) {
      console.error("Błąd zapisu wydarzenia:", error);
      alert("Wystąpił błąd podczas zapisu wydarzenia.");
    }
  };

  const deleteCustomEvent = async (id) => {
    try {
      await supabase.from('custom_events').delete().eq('id', id);
      await fetchDashboardData();
    } catch (error) {
      console.error("Błąd usuwania wydarzenia:", error);
    }
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
        const { error } = await supabase.from('subjects').update(payload).eq('id', subId);
        if (error) throw error;
      } else {
        subId = generateId('sub');
        payload.id = subId;
        const { error } = await supabase.from('subjects').insert([payload]);
        if (error) throw error;
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
    } catch (error) {
      console.error("Błąd zapisu przedmiotu:", error);
      alert("Wystąpił błąd podczas zapisu przedmiotu.");
    }
  };

  return (
    <DataContext.Provider value={{ 
      isLoading, dailyTasks, topics, exams, globalStats,
      subjects, scheduleEntries, cancellations, customEvents,
      eventLists, semesters, gradeModules, grades,
      fetchDashboardData, saveExam, deleteExam, saveCustomEvent, deleteCustomEvent, saveSubject,
      toggleTopicStatus, saveExamNote, saveTopic, deleteTopic
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