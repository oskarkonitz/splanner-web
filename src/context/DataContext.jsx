import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { evaluateAchievements } from '../data/achievements';
import GlobalPopups from '../components/GlobalPopups';

const DataContext = createContext();

const generateId = (prefix) => {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
};

export function DataProvider({ children, session }) {
  const [isLoading, setIsLoading] = useState(true);
  
  const [dailyTasks, setDailyTasks] = useState([]);
  const [taskLists, setTaskLists] = useState([]);
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
  const [subscriptions, setSubscriptions] = useState([]); 
  
  // --- SYSTEM OSIĄGNIĘĆ ---
  const [achievements, setAchievements] = useState([]); 
  const [popupQueue, setPopupQueue] = useState([]); 

  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        tasksRes, taskListsRes, topicsRes, examsRes, statsRes, 
        subjectsRes, scheduleRes, cancellationsRes, 
        customEventsRes, eventListsRes, semestersRes,
        gradeModulesRes, gradesRes, blockedRes, subscriptionsRes,
        achievementsRes 
      ] = await Promise.all([
        supabase.from('daily_tasks').select('*'),
        supabase.from('task_lists').select('*'),
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
        supabase.from('blocked_dates').select('*'),
        supabase.from('subscriptions').select('*'),
        supabase.from('achievements').select('*') 
      ]);

      if (tasksRes.data) setDailyTasks(tasksRes.data);
      if (taskListsRes.data) setTaskLists(taskListsRes.data);
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
      if (subscriptionsRes.data) setSubscriptions(subscriptionsRes.data);
      
      if (achievementsRes.data) {
        setAchievements(achievementsRes.data.map(a => a.achievement_id));
      }

      if (gradesRes.data) {
        const mappedGrades = gradesRes.data.map(g => {
          const newG = { ...g };
          if (newG.desc_text !== undefined) newG.desc = newG.desc_text;
          return newG;
        });
        setGrades(mappedGrades);
      }
      
      if (blockedRes.data) setBlockedDates(blockedRes.data);

    } catch (error) {
      console.error("Błąd pobierania Dashboardu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ENGINE OSIĄGNIĘĆ ---
  const saveAchievement = async (id) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('achievements').upsert({ achievement_id: id, date_earned: today });
      setAchievements(prev => [...prev, id]);
      setPopupQueue(prev => [...prev, { type: 'achievement', id }]);
    } catch (err) { console.error("Error saving achievement:", err); }
  };

  useEffect(() => {
    if (isLoading) return;
    
    // Ewaluacja wszystkich Osiągnięć z pliku logicznego
    const newlyUnlocked = evaluateAchievements({ 
      topics, exams, subjects, grades, gradeModules, blockedDates, globalStats, dailyTasks 
    }, achievements);
    
    newlyUnlocked.forEach(id => saveAchievement(id));

    // Sprawdzanie "All Tasks Done Today"
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = dailyTasks.filter(t => t.date === today);
    
    if (todayTasks.length > 0 && todayTasks.every(t => t.status === 'done')) {
      if (!achievements.includes('clean_sheet')) saveAchievement('clean_sheet');
      
      const lastCongrats = localStorage.getItem('last_congrats_date');
      if (lastCongrats !== today) {
        setPopupQueue(prev => [...prev, { type: 'congrats' }]);
        localStorage.setItem('last_congrats_date', today);
      }
    }
  }, [dailyTasks, topics, exams, subjects, grades, gradeModules, blockedDates, globalStats, isLoading]);

  const saveTask = async (taskData, isEditMode) => {
    try {
      const payload = {
        content: taskData.content,
        date: taskData.date || null,
        color: taskData.color || '#3498db',
        list_id: taskData.list_id || null,
        note: taskData.note || '',
        status: taskData.status || 'todo'
      };
      
      if (isEditMode) {
        await supabase.from('daily_tasks').update(payload).eq('id', taskData.id);
      } else {
        payload.id = generateId('task');
        payload.created_at = new Date().toISOString();
        await supabase.from('daily_tasks').insert([payload]);
      }
      await fetchDashboardData();
    } catch (error) { console.error("Błąd zapisu zadania:", error); }
  };

  const deleteTask = async (id) => {
    try {
      await supabase.from('daily_tasks').delete().eq('id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const toggleTaskStatus = async (task) => {
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await supabase.from('daily_tasks').update({ status: newStatus }).eq('id', task.id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const sweepCompletedTasks = async (listId) => {
    try {
      let query = supabase.from('daily_tasks').delete().eq('status', 'done');
      if (listId) query = query.eq('list_id', listId);
      await query;
      await fetchDashboardData();
    } catch (error) { console.error("Błąd czyszczenia listy:", error); }
  };

  const saveTaskList = async (listData, isEditMode) => {
    try {
      const payload = {
        name: listData.name,
        list_type: listData.list_type || '',
        icon: listData.icon || ''
      };
      if (isEditMode) {
        await supabase.from('task_lists').update(payload).eq('id', listData.id);
      } else {
        payload.id = generateId('list');
        await supabase.from('task_lists').insert([payload]);
      }
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

  const deleteTaskList = async (id) => {
    try {
      await supabase.from('task_lists').delete().eq('id', id);
      await supabase.from('daily_tasks').delete().eq('list_id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd:", error); }
  };

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
        await supabase.from('exams').update(payload).eq('id', examId);
      } else {
        payload.id = examId;
        payload.note = '';
        await supabase.from('exams').insert([payload]);
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
    } catch (error) { console.error("Błąd:", error); }
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
      await supabase.from('topics').update({
        name: topicData.name,
        scheduled_date: topicData.scheduled_date || null,
        locked: topicData.locked,
        note: topicData.note || ''
      }).eq('id', topicData.id);
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
      await supabase.from('topics').update({ status: newStatus }).eq('id', topicId);
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
        await supabase.from('custom_events').update(payload).eq('id', eventData.id);
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

  const deleteSubject = async (id) => {
    try {
      await supabase.from('subjects').delete().eq('id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd usuwania przedmiotu:", error); }
  };

  const saveSemester = async (semData, isEditMode) => {
    try {
      const payload = {
        name: semData.name,
        start_date: semData.startDate,
        end_date: semData.endDate,
        is_current: semData.isCurrent
      };
      
      let newId = semData.id;
      if (isEditMode) {
        await supabase.from('semesters').update(payload).eq('id', newId);
      } else {
        newId = generateId('sem');
        payload.id = newId;
        await supabase.from('semesters').insert([payload]);
      }
      
      if (semData.isCurrent) {
        await supabase.from('semesters').update({ is_current: false }).neq('id', newId);
      }
      await fetchDashboardData();
    } catch (error) { console.error("Błąd zapisu semestru:", error); }
  };

  const deleteSemester = async (id) => {
    try {
      await supabase.from('semesters').delete().eq('id', id);
      await supabase.from('subjects').delete().eq('semester_id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd usuwania semestru:", error); }
  };

  const setCurrentSemester = async (id) => {
    try {
      await supabase.from('semesters').update({ is_current: false }).neq('id', '0');
      await supabase.from('semesters').update({ is_current: true }).eq('id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd zmiany aktualnego semestru:", error); }
  };

  const saveGradeModule = async (moduleData) => {
    try {
      const payload = {
        subject_id: moduleData.subject_id,
        name: moduleData.name,
        weight: parseFloat(moduleData.weight) || 0
      };
      if (moduleData.id) {
        await supabase.from('grade_modules').update(payload).eq('id', moduleData.id);
      } else {
        payload.id = generateId('mod');
        await supabase.from('grade_modules').insert([payload]);
      }
      await fetchDashboardData();
    } catch (error) { console.error("Błąd zapisu modułu ocen:", error); }
  };

  const deleteGradeModule = async (id) => {
    try {
      await supabase.from('grade_modules').delete().eq('id', id);
      await supabase.from('grades').delete().eq('module_id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd usuwania modułu ocen:", error); }
  };

  const saveGrade = async (gradeData) => {
    try {
      const payload = {
        subject_id: gradeData.subject_id,
        module_id: gradeData.module_id || null,
        value: parseFloat(gradeData.value) || 0,
        weight: parseFloat(gradeData.weight) || 1,
        desc_text: gradeData.desc || '',
        date: gradeData.date || null
      };
      if (gradeData.id) {
        await supabase.from('grades').update(payload).eq('id', gradeData.id);
      } else {
        payload.id = generateId('grd');
        await supabase.from('grades').insert([payload]);
      }
      await fetchDashboardData();
    } catch (error) { console.error("Błąd zapisu oceny:", error); }
  };

  const deleteGrade = async (id) => {
    try {
      await supabase.from('grades').delete().eq('id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd usuwania oceny:", error); }
  };

  const saveSubscription = async (subData) => {
    try {
      const payload = {
        subject_id: subData.subject_id || null,
        name: subData.name,
        provider: subData.provider || '',
        cost: parseFloat(subData.cost) || 0,
        currency: subData.currency || 'PLN',
        billing_cycle: subData.billing_cycle || 'monthly',
        billing_date: subData.billing_date || null,
        expiry_date: subData.expiry_date || null,
        note: subData.note || '',
        is_active: subData.is_active !== undefined ? subData.is_active : true
      };

      if (subData.id) {
        await supabase.from('subscriptions').update(payload).eq('id', subData.id);
      } else {
        payload.id = generateId('subscr');
        await supabase.from('subscriptions').insert([payload]);
      }
      await fetchDashboardData();
    } catch (error) { console.error("Błąd zapisu subskrypcji:", error); }
  };

  const deleteSubscription = async (id) => {
    try {
      await supabase.from('subscriptions').delete().eq('id', id);
      await fetchDashboardData();
    } catch (error) { console.error("Błąd usuwania subskrypcji:", error); }
  };

  const runPlanner = async (onlyUnscheduled = false) => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    const todayStr = today.toISOString().split('T')[0];
    const todayNum = new Date(todayStr).getTime(); 
    
    const blockedSet = new Set((blockedDates || []).map(b => b.date));
    const calendar = {};

    let maxDateNum = todayNum;
    exams.forEach(ex => {
      if (!ex.date) return;
      const exDateNum = new Date(ex.date).getTime();
      if (exDateNum > maxDateNum) maxDateNum = exDateNum;
    });

    let currNum = maxDateNum;
    while (currNum >= todayNum) {
      const dStr = new Date(currNum).toISOString().split('T')[0];
      calendar[dStr] = [];
      currNum -= 86400000;
    }

    exams.forEach(ex => {
      if (ex.ignore_barrier || !ex.date) return;
      if (new Date(ex.date).getTime() >= todayNum) {
        if (calendar[ex.date]) calendar[ex.date].push("E");
      }
    });

    exams.forEach(exam => {
      if (!exam.date) return;
      const examDateNum = new Date(exam.date).getTime();
      if (examDateNum <= todayNum) return;

      const endStudyNum = examDateNum - 86400000;
      if (endStudyNum < todayNum) return;

      let scanNum = endStudyNum;
      while (scanNum > todayNum) {
        const scanStr = new Date(scanNum).toISOString().split('T')[0];
        if (calendar[scanStr] && calendar[scanStr].includes("E")) break; 
        scanNum -= 86400000;
      }
      const startStudyNum = scanNum;

      let tList = topics.filter(t => t.exam_id === exam.id && t.status === "todo" && !t.locked);
      if (onlyUnscheduled) tList = tList.filter(t => !t.scheduled_date);
      
      if (tList.length === 0) return; 

      const validDays = [];
      let cNum = startStudyNum < todayNum ? todayNum : startStudyNum;
      
      while (cNum <= endStudyNum) {
        const curStr = new Date(cNum).toISOString().split('T')[0];
        const hasExam = calendar[curStr] && calendar[curStr].includes("E");

        if (!blockedSet.has(curStr)) {
          if (!hasExam || (hasExam && cNum === startStudyNum)) validDays.push(curStr);
        }
        cNum += 86400000;
      }

      validDays.sort();
      if (validDays.length === 0) return;

      const daysTotal = validDays.length;
      const tasksTotal = tList.length;
      let startIndex = 0;

      if (tasksTotal <= daysTotal) startIndex = daysTotal - tasksTotal; 

      for (let i = startIndex; i < daysTotal; i++) {
        if (tList.length === 0) break;
        
        const currentDayStr = validDays[i];
        const daysRemaining = daysTotal - i;
        const tasksRemaining = tList.length;
        
        const perDay = daysRemaining > 0 ? Math.ceil(tasksRemaining / daysRemaining) : tasksRemaining;

        for (let j = 0; j < perDay; j++) {
          if (tList.length > 0) {
            const task = tList.shift();
            if (calendar[currentDayStr]) calendar[currentDayStr].push(task.id);
          }
        }
      }
    });

    const topicsMap = {};
    topics.forEach(t => topicsMap[t.id] = { ...t });

    if (!onlyUnscheduled) {
      Object.values(topicsMap).forEach(topic => {
        if (topic.status === "todo" && !topic.locked) topic.scheduled_date = null;
      });
    }

    Object.entries(calendar).forEach(([dateStr, items]) => {
      items.forEach(itemId => {
        if (itemId === "E") return;
        if (topicsMap[itemId]) topicsMap[itemId].scheduled_date = dateStr;
      });
    });

    const topicsToUpdate = Object.values(topicsMap).map(t => ({
      id: t.id, exam_id: t.exam_id, name: t.name, status: t.status,
      scheduled_date: t.scheduled_date, locked: t.locked, note: t.note
    }));

    try {
      await supabase.from('topics').upsert(topicsToUpdate);
      await fetchDashboardData();
    } catch (err) { console.error("Błąd planera:", err); }
  };

  return (
    <DataContext.Provider value={{ 
      isLoading, dailyTasks, taskLists, topics, exams, globalStats,
      subjects, scheduleEntries, cancellations, customEvents,
      eventLists, semesters, gradeModules, grades,
      subscriptions, achievements, // <--- NOWE
      fetchDashboardData, saveExam, deleteExam, saveCustomEvent, deleteCustomEvent, saveSubject,
      toggleTopicStatus, saveExamNote, saveTopic, deleteTopic, runPlanner,
      saveTask, deleteTask, toggleTaskStatus, sweepCompletedTasks, saveTaskList, deleteTaskList,
      deleteSubject, saveSemester, deleteSemester, setCurrentSemester,
      saveGradeModule, deleteGradeModule, saveGrade, deleteGrade,
      saveSubscription, deleteSubscription 
    }}>
      {children}
      {/* GLOBALNE POPUPY */}
      <GlobalPopups popupData={popupQueue[0]} onClose={() => setPopupQueue(prev => prev.slice(1))} />
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