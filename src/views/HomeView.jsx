import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../api/supabase'
import { useData } from '../context/DataContext'
import SettingsView from './SettingsView'
import ScheduleView from './ScheduleView'
import ArchiveView from './ArchiveView'
import PlanView from './PlanView'
import TodoView from './TodoView'
import SubjectsView from './SubjectsView'
import GradesView from './GradesView'
import SubscriptionsView from './SubscriptionsView'
import AchievementsView from './AchievementsView'

// --- FUNKCJE POMOCNICZE DLA SUBSKRYPCJI ---
const getNextBillingDate = (billingDateStr, cycle) => {
  if (!billingDateStr) return null;
  const d = new Date(billingDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (d >= today) return d;

  if (cycle === 'monthly') {
    while (d < today) d.setMonth(d.getMonth() + 1);
  } else if (cycle === 'yearly') {
    while (d < today) d.setFullYear(d.getFullYear() + 1);
  } else if (cycle === 'weekly') {
    while (d < today) d.setDate(d.getDate() + 7);
  }
  return d;
};

const getDaysUntil = (targetDate) => {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const today = new Date();
  target.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};


export default function HomeView() {
  const [activeTab, setActiveTab] = useState("Dashboard")
  const [targetTodoList, setTargetTodoList] = useState('all') // <--- NOWY STAN
  const [currentTime, setCurrentTime] = useState(new Date())

  const { 
    isLoading, dailyTasks, topics, exams, globalStats,
    subjects, scheduleEntries, cancellations, customEvents, 
    eventLists, semesters, gradeModules, grades,
    taskLists, subscriptions, settings
  } = useData()

  const [todayProgress, setTodayProgress] = useState({ done: 0, total: 0 })
  const [totalProgress, setTotalProgress] = useState({ done: 0, total: 0 })
  const [nextExam, setNextExam] = useState(null)
  const [nowNextItem, setNowNextItem] = useState(null)
  const [focusTime, setFocusTime] = useState(0)
  const [gpa, setGpa] = useState(0.0)

  const [isStandalone, setIsStandalone] = useState(false);
  
  // --- STANY DLA POWIADOMIENIA WINDOWS ---
  const [showWindowsToast, setShowWindowsToast] = useState(false);
  const [isWindows, setIsWindows] = useState(false);

  const mainTabs = ["Dashboard", "Plan", "Todo", "Schedule"];
  const moreTabs = ["Exam Database & Archive", "Achievements", "Subjects & Semesters", "Grades", "Subscriptions"];

  // --- WYKRYWANIE TRYBU APLIKACJI (PWA) ---
  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(!!isPWA);
  }, []);

  // --- WYKRYWANIE WINDOWS & LOGIKA TOASTA ---
  useEffect(() => {
    const checkIsWindows = /Win/i.test(navigator.userAgent);
    setIsWindows(checkIsWindows);

    if (checkIsWindows) {
      const isHidden = localStorage.getItem('hideSPlannerWindowsToast');
      if (!isHidden) {
        // Opóźnienie 3.5 sekundy przed pokazaniem toasta
        const timer = setTimeout(() => {
          setShowWindowsToast(true);
        }, 3500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const closeWindowsToast = () => {
    setShowWindowsToast(false);
    localStorage.setItem('hideSPlannerWindowsToast', 'true');
  };

  // --- ZEGAR ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // --- GŁÓWNA LOGIKA KALKULACYJNA ---
  useEffect(() => {
    if (isLoading || !dailyTasks) return;

    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().substring(0, 5);

    // 1. Czas Skupienia
    const timeStat = globalStats?.find(s => s.key === 'daily_study_time');
    if (timeStat) {
      const safeStringValue = String(timeStat.value).replace(/"/g, '');
      setFocusTime(parseInt(safeStringValue) || 0);
    }

    // 2. Postęp Dzisiejszy i Całkowity
    const todayTasks = dailyTasks?.filter(t => t.date === todayStr && t.list_id !== 'shopping') || [];
    const todayTopics = topics?.filter(t => t.scheduled_date === todayStr) || [];
    setTodayProgress({
      done: todayTasks.filter(t => t.status === 'done').length + todayTopics.filter(t => t.status === 'done').length,
      total: todayTasks.length + todayTopics.length
    });

    const futureExams = (exams || []).filter(e => e.date >= todayStr);
    const futureExamIDs = new Set(futureExams.map(e => e.id));
    
    const relevantTopics = (topics || []).filter(t => 
      futureExamIDs.has(t.exam_id) || t.status !== 'done'
    );
    
    const relevantTasks = (dailyTasks || []).filter(t => 
      (t.date && t.date >= todayStr) || t.status !== 'done'
    );

    setTotalProgress({
      done: relevantTopics.filter(t => t.status === 'done').length + relevantTasks.filter(t => t.status === 'done').length,
      total: relevantTopics.length + relevantTasks.length
    });

    // 3. Najbliższy Egzamin
    const upcomingExams = (exams || [])
      .filter(e => e.date >= todayStr)
      .sort((a, b) => {
        if (a.date === b.date) return (a.time || "00:00").localeCompare(b.time || "00:00");
        return a.date.localeCompare(b.date);
      });
    setNextExam(upcomingExams.length > 0 ? upcomingExams[0] : null);

    // 4. Now / Next (Zajęcia/Wydarzenia)
    let foundNext = null;
    const selectedSemesterID = "ALL";

    for (let offset = 0; offset < 7; offset++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + offset);
      const checkDateStr = new Date(checkDate.getTime() - (checkDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const weekday = (checkDate.getDay() + 6) % 7; 
      
      let dailyItems = [];
      
      const dayClasses = (scheduleEntries || []).filter(entry => {
        if (entry.day_of_week !== weekday) return false;
        const subject = (subjects || []).find(s => s.id === entry.subject_id);
        if (!subject) return false;
        if (selectedSemesterID !== "ALL" && subject.semester_id !== selectedSemesterID) return false;
        if (subject.start_datetime && subject.start_datetime.substring(0, 10) > checkDateStr) return false;
        if (subject.end_datetime && subject.end_datetime.substring(0, 10) < checkDateStr) return false;
        const isCancelled = (cancellations || []).some(c => c.entry_id === entry.id && c.date === checkDateStr);
        if (isCancelled) return false;
        if (offset === 0 && entry.end_time <= currentTimeStr) return false;
        return true;
      });
      
      for (const entry of dayClasses) {
        const subject = subjects.find(s => s.id === entry.subject_id);
        const roomStr = entry.room ? `Room ${entry.room}` : "";
        const typeStr = entry.type ? entry.type : "Class";
        dailyItems.push({ 
          title: subject.name, subtitle: roomStr, 
          startTime: entry.start_time, endTime: entry.end_time, 
          typeStr, hexColor: subject.color || "#3498db", dateStr: checkDateStr 
        });
      }
      
      const dayEvents = (customEvents || []).filter(event => {
        const isRec = event.is_recurring;
        const sDate = event.date || event.start_date || "";
        const eDate = event.end_date || sDate;
        
        if (!isRec) {
          if (!sDate || checkDateStr < sDate || checkDateStr > eDate) return false;
        } else {
          if (event.day_of_week !== weekday) return false;
          if (event.start_date && event.start_date > checkDateStr) return false;
          if (event.end_date && event.end_date < checkDateStr) return false;
        }
        
        let effectiveEnd = event.end_time;
        if (checkDateStr < eDate) effectiveEnd = "23:59";
        if (offset === 0 && effectiveEnd <= currentTimeStr) return false;
        return true;
      });
      
      for (const event of dayEvents) {
        let listName = "Event";
        if (event.list_id) {
          const list = (eventLists || []).find(l => l.id === event.list_id);
          if (list) listName = list.name;
        }
        
        const sDate = event.date || event.start_date || "";
        const eDate = event.end_date || sDate;
        let effectiveStart = event.start_time;
        let effectiveEnd = event.end_time;
        
        if (checkDateStr > sDate) effectiveStart = "00:00";
        if (checkDateStr < eDate) effectiveEnd = "23:59";
        
        dailyItems.push({ 
          title: event.title, subtitle: "", 
          startTime: effectiveStart, endTime: effectiveEnd, 
          typeStr: listName, hexColor: event.color || "#3498db", dateStr: checkDateStr 
        });
      }
      
      if (dailyItems.length > 0) {
        dailyItems.sort((a, b) => a.startTime.localeCompare(b.startTime));
        foundNext = dailyItems[0];
        break; 
      }
    }
    setNowNextItem(foundNext);

    // 5. Kalkulator GPA
    const convertToGradeScale = (val) => {
      if (val <= 5.0) return val;
      if (val >= 90) return 5.0;
      if (val >= 80) return 4.5;
      if (val >= 70) return 4.0;
      if (val >= 60) return 3.5;
      if (val >= 50) return 3.0;
      return 2.0;
    };
    
    const currentSem = (semesters || []).find(s => s.is_current);
    const filteredSubjects = currentSem ? (subjects || []).filter(s => s.semester_id === currentSem.id) : (subjects || []);
    let totalECTS = 0.0;
    let weightedSum = 0.0;
    
    for (const sub of filteredSubjects) {
      const modules = (gradeModules || []).filter(m => m.subject_id === sub.id);
      const allGrades = (grades || []).filter(g => g.subject_id === sub.id);
      let subWeightedScore = 0.0;
      let subGradedWeight = 0.0;
      
      for (const mod of modules) {
        const modGrades = allGrades.filter(g => g.module_id === mod.id);
        if (modGrades.length > 0) {
          let sumW = 0.0;
          let wSum = 0.0;
          for (const g of modGrades) {
            const w = g.weight || 0.0;
            sumW += w;
            wSum += g.value * w;
          }
          if (sumW > 0) {
            const modAvg = wSum / sumW;
            const modFactor = (mod.weight || 0.0) / 100.0;
            subWeightedScore += modAvg * modFactor;
            subGradedWeight += modFactor;
          }
        }
      }
      if (subGradedWeight > 0) {
        const percent = subWeightedScore / subGradedWeight;
        const scale = convertToGradeScale(percent);
        const ects = sub.weight || 0.0;
        weightedSum += scale * ects;
        totalECTS += ects;
      }
    }
    setGpa(totalECTS === 0 ? 0 : (weightedSum / totalECTS));

  }, [isLoading, dailyTasks, topics, exams, globalStats, subjects, scheduleEntries, cancellations, customEvents, eventLists, semesters, gradeModules, grades]);

  // --- DANE DLA NOWYCH WIDGETÓW ---
  
  // Widget: Tasks for Today
  const todayTasksList = useMemo(() => {
    if (!dailyTasks || !topics) return [];
    const todayStr = new Date(currentTime.getTime() - (currentTime.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    const shoppingListIDs = new Set((taskLists || []).filter(l => l.list_type === 'shopping').map(l => l.id));
    
    const tTasks = dailyTasks.filter(t => t.date === todayStr && t.status === 'todo' && !shoppingListIDs.has(t.list_id));
    const tTopics = topics.filter(t => t.scheduled_date === todayStr && t.status === 'todo');

    const combined = [
      ...tTasks.map(t => ({ id: t.id, title: t.content, color: t.color || '#3498db', type: 'task' })),
      ...tTopics.map(t => {
        const ex = exams?.find(e => e.id === t.exam_id);
        const subj = subjects?.find(s => s.id === ex?.subject_id);
        return { id: t.id, title: t.name, color: subj?.color || '#9b59b6', type: 'topic' };
      })
    ];
    return combined;
  }, [dailyTasks, topics, taskLists, exams, subjects, currentTime]);

  // Widget: Shopping List
  const shoppingItemsList = useMemo(() => {
    if (!dailyTasks || !taskLists) return [];
    
    const mainListId = settings?.main_shopping_list_id;
    if (!mainListId) return [];

    const mainList = taskLists.find(l => l.id === mainListId && l.list_type === 'shopping');
    if (!mainList) return [];

    return dailyTasks
      .filter(t => t.list_id === mainListId && t.status === 'todo')
      .map(t => ({ id: t.id, name: t.content, listName: mainList.name }));
  }, [dailyTasks, taskLists, settings]);

  // Widget: Upcoming Subscription
  const nextSubscription = useMemo(() => {
    if (!subscriptions || subscriptions.length === 0) return null;
    const today = new Date();
    today.setHours(0,0,0,0);

    let upcoming = [];
    subscriptions.forEach(sub => {
      if (!sub.is_active) return;
      let isExp = false;
      if (sub.expiry_date) {
        const exp = new Date(sub.expiry_date);
        exp.setHours(0,0,0,0);
        if (exp < today) isExp = true;
      }
      if (isExp) return;

      const nDate = getNextBillingDate(sub.billing_date, sub.billing_cycle);
      if (nDate) {
        upcoming.push({ ...sub, nextDate: nDate });
      }
    });

    if (upcoming.length === 0) return null;
    upcoming.sort((a, b) => a.nextDate - b.nextDate);
    
    const target = upcoming[0];
    const days = getDaysUntil(target.nextDate);
    const subj = subjects?.find(s => s.id === target.subject_id);
    
    return { ...target, daysLeft: days, subjColor: subj?.color || '#8e44ad' };
  }, [subscriptions, subjects]);

  // --- LOGIKA ODZNAK W MENU BOCZNYM ---
  const renderMenuBadge = (tabName) => {
    const mode = settings?.badge_mode || 'default';
    if (mode === 'off') return null;

    const todayStr = new Date(currentTime.getTime() - (currentTime.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    if (tabName === 'Todo') {
      const shoppingListIDs = new Set((taskLists || []).filter(l => l.list_type === 'shopping').map(l => l.id));
      const allTodo = dailyTasks.filter(t => !shoppingListIDs.has(t.list_id));
      
      const overdue = allTodo.filter(t => t.status === 'todo' && t.date && t.date < todayStr).length;
      const todayPending = allTodo.filter(t => t.status === 'todo' && t.date === todayStr).length;
      const todayDone = allTodo.filter(t => t.status === 'done' && t.date === todayStr).length;
      const totalToday = todayPending + todayDone;

      if (totalToday === 0 && overdue === 0) return null;

      if (mode === 'dot') {
        if (overdue > 0) return <div className="w-2 h-2 rounded-full bg-red-500"></div>;
        if (todayPending === 0 && totalToday > 0) return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
        return <div className="w-2 h-2 rounded-full bg-orange-400"></div>;
      }

      if (overdue > 0) {
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-500">{todayPending + overdue}</span>;
      }
      if (todayPending === 0 && totalToday > 0) {
        return (
          <span className="text-green-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </span>
        );
      }
      return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400">{todayPending}</span>;
    }

    if (tabName === 'Plan') {
      const overdue = topics.filter(t => t.status === 'todo' && t.scheduled_date && t.scheduled_date < todayStr).length;
      const todayPending = topics.filter(t => t.status === 'todo' && t.scheduled_date === todayStr).length;
      const todayDone = topics.filter(t => t.status === 'done' && t.scheduled_date === todayStr).length;
      const totalToday = todayPending + todayDone;

      if (totalToday === 0 && overdue === 0) return null;

      if (mode === 'dot') {
        if (overdue > 0) return <div className="w-2 h-2 rounded-full bg-red-500"></div>;
        if (todayPending === 0 && totalToday > 0) return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
        return <div className="w-2 h-2 rounded-full bg-orange-400"></div>;
      }

      if (overdue > 0) {
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-500">{todayPending + overdue}</span>;
      }
      if (todayPending === 0 && totalToday > 0) {
        return (
          <span className="text-green-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </span>
        );
      }
      return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400">{todayPending}</span>;
    }

    return null;
  };

  // --- FORMATERY ZEGARA / WIDGETÓW ---
  const getNowNextState = () => {
    if (!nowNextItem) return { isNow: false, isStartingSoon: false, progress: 0, isToday: false, countdownStr: "" };
    
    const todayStr = new Date(currentTime.getTime() - (currentTime.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const isToday = nowNextItem.dateStr === todayStr;
    
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
    const startMins = parseInt(nowNextItem.startTime.split(':')[0]) * 60 + parseInt(nowNextItem.startTime.split(':')[1]);
    let endMins = parseInt(nowNextItem.endTime.split(':')[0]) * 60 + parseInt(nowNextItem.endTime.split(':')[1]);
    if (nowNextItem.endTime === "23:59") endMins = 24 * 60;

    let isNow = false;
    let isStartingSoon = false;
    let progress = 0;
    let countdownStr = "";

    if (isToday) {
      if (currentMins >= startMins && currentMins < endMins) {
        isNow = true;
        progress = Math.max(0, Math.min(1, (currentMins - startMins) / (endMins - startMins)));
        
        const diff = endMins - currentMins;
        const h = Math.floor(diff / 60);
        const m = Math.floor(diff % 60);
        countdownStr = h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
      } else if (currentMins < startMins) {
        if ((startMins - currentMins) <= 5 && (startMins - currentMins) > 0) {
          isStartingSoon = true;
        }
        const diff = startMins - currentMins;
        const h = Math.floor(diff / 60);
        const m = Math.floor(diff % 60);
        countdownStr = h > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${m}m`;
      }
    } else {
      countdownStr = "Upcoming";
    }

    return { isNow, isStartingSoon, progress, isToday, countdownStr };
  }

  const getNextExamState = () => {
    if (!nextExam) return { countdownStr: "No upcoming exams", hexColor: "#e74c3c" };

    const todayStr = new Date(currentTime.getTime() - (currentTime.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const isToday = nextExam.date === todayStr;
    const subj = subjects?.find(s => s.id === nextExam.subject_id);
    const hexColor = subj?.color || "#e74c3c";

    let countdownStr = "";

    if (isToday) {
      const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
      const startMins = parseInt((nextExam.time || "08:00").split(':')[0]) * 60 + parseInt((nextExam.time || "08:00").split(':')[1]);
      
      if (currentMins < startMins) {
        const diff = startMins - currentMins;
        const h = Math.floor(diff / 60);
        const m = Math.floor(diff % 60);
        countdownStr = h > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${m}m`;
      } else if (currentMins >= startMins && currentMins <= startMins + 90) { // zakładamy 1.5h
        countdownStr = "In Progress";
      } else {
        countdownStr = "Finished";
      }
    } else {
      const days = getDaysUntil(nextExam.date);
      countdownStr = days === 1 ? "Tomorrow" : `In ${days} days`;
    }

    return { countdownStr, hexColor };
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const getTabIcon = (tabName, isActive) => {
    const stroke = isActive ? "#3498db" : "currentColor";
    switch(tabName) {
      case "Dashboard":
        return <svg className="w-6 h-6" fill="none" stroke={stroke} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>;
      case "Plan":
        return <svg className="w-6 h-6" fill="none" stroke={stroke} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>;
      case "Todo":
        return <svg className="w-6 h-6" fill="none" stroke={stroke} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>;
      case "Schedule":
        return <svg className="w-6 h-6" fill="none" stroke={stroke} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>;
      case "More":
        return <svg className="w-6 h-6" fill="none" stroke={stroke} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>;
      default: return null;
    }
  }

  const renderDashboardWidgets = () => {
    const { isNow, isStartingSoon, progress, isToday, countdownStr } = getNowNextState();
    const examState = getNextExamState();
    
    return (
      <div className="flex flex-col gap-6">
        <style>{`
          @keyframes pulseRing {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.05); opacity: 0; }
          }
          .animate-pulse-ring {
            animation: pulseRing 1.2s ease-out infinite;
          }
        `}</style>

        {/* WIDGETY PROGRESU (MOBILE) */}
        <div className="grid grid-cols-2 gap-4 md:hidden">
          <div className="bg-[#1c1c1e] p-5 rounded-3xl shadow-lg border border-white/5 flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today</span>
            <div className="text-2xl font-bold text-white">{todayProgress.done}/{todayProgress.total}</div>
            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${todayProgress.total > 0 ? (todayProgress.done/todayProgress.total)*100 : 0}%` }}></div>
            </div>
          </div>
          <div className="bg-[#1c1c1e] p-5 rounded-3xl shadow-lg border border-white/5 flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overall</span>
            <div className="text-2xl font-bold text-white">{totalProgress.done}/{totalProgress.total}</div>
            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${totalProgress.total > 0 ? (totalProgress.done/totalProgress.total)*100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* GŁÓWNA SIATKA WIDGETÓW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* 1. NOW / NEXT WIDGET */}
          {nowNextItem ? (
            <div 
              onClick={() => setActiveTab("Schedule")} 
              className="relative bg-[#1c1c1e] rounded-3xl shadow-lg border border-white/5 flex flex-col min-h-[140px] cursor-pointer hover:bg-white/5 transition-colors"
            >
              {isStartingSoon && (
                <>
                  <div className="absolute inset-0 rounded-3xl border-2 pointer-events-none" style={{ borderColor: nowNextItem.hexColor }}></div>
                  <div className="absolute inset-0 rounded-3xl border-[3px] animate-pulse-ring pointer-events-none" style={{ borderColor: nowNextItem.hexColor }}></div>
                </>
              )}
              {isNow && (
                <>
                  <div className="absolute inset-0 rounded-3xl border-[4px] pointer-events-none opacity-15" style={{ borderColor: nowNextItem.hexColor }}></div>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <rect 
                      x="2" y="2" 
                      width="calc(100% - 4px)" height="calc(100% - 4px)" 
                      rx="22" ry="22" 
                      fill="none" 
                      stroke={nowNextItem.hexColor} 
                      strokeWidth="4" 
                      strokeLinecap="round"
                      pathLength="100"
                      strokeDasharray="100"
                      strokeDashoffset={100 - (progress * 100)}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                </>
              )}
              <div className="p-6 flex flex-col gap-4 relative z-10 h-full">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: nowNextItem.hexColor }}>
                    {isNow ? "Now" : "Next"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: `${nowNextItem.hexColor}20`, color: nowNextItem.hexColor }}>
                    {countdownStr}
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-xl font-bold text-white truncate">{nowNextItem.title}</span>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>{isToday ? "Today" : nowNextItem.dateStr} • {nowNextItem.startTime} - {nowNextItem.endTime === "23:59" ? "End of day" : nowNextItem.endTime}</span>
                  </div>
                  <span className="text-gray-500 text-sm mt-1 truncate">
                    {nowNextItem.typeStr} {nowNextItem.subtitle ? `• ${nowNextItem.subtitle}` : ""}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setActiveTab("Schedule")} 
              className="bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col gap-4 min-h-[140px] cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Now / Next</span>
              <div className="flex-1 flex items-center justify-center text-green-400 font-semibold text-lg">
                {isLoading ? "Loading..." : "No events ahead"}
              </div>
            </div>
          )}

          {/* 2. NEXT EXAM WIDGET */}
          <div 
            onClick={() => setActiveTab("Plan")} 
            className="bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col min-h-[140px] cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: examState.hexColor }}>Next Exam</span>
              {nextExam && (
                <span className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: `${examState.hexColor}20`, color: examState.hexColor }}>
                  {examState.countdownStr}
                </span>
              )}
            </div>
            
            <div className="flex-1 flex items-center justify-center text-center">
              {isLoading ? (
                <span className="text-gray-400 font-medium">Loading...</span>
              ) : (
                nextExam ? (
                  <div className="flex flex-col items-center justify-center w-full">
                    <span className="text-xl font-bold text-white w-full truncate px-2">{nextExam.title}</span>
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <span>{nextExam.date} • {nextExam.time?.substring(0, 5) || "TBA"}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400 font-medium">No upcoming exams</span>
                )
              )}
            </div>
          </div>

          {/* 3. TASKS FOR TODAY WIDGET */}
          <div 
            onClick={() => { 
              if(todayTasksList.length > 0) {
                setTargetTodoList('all'); 
                setActiveTab('Todo');
              }
            }}
            className={`bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col min-h-[140px] max-h-[180px] ${todayTasksList.length > 0 ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tasks for Today</span>
              {todayTasksList.length > 0 && <span className="text-xs bg-blue-500/20 text-[#3498db] px-2 py-0.5 rounded-full font-bold">{todayTasksList.length}</span>}
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col gap-2">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 font-medium">Loading...</div>
              ) : todayTasksList.length > 0 ? (
                <>
                  {todayTasksList.slice(0, 4).map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-sm truncate">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color }}></div>
                      <span className="text-gray-200 truncate">{t.title}</span>
                    </div>
                  ))}
                  {todayTasksList.length > 4 && (
                    <div className="text-xs text-gray-500 font-medium mt-1 ml-3">
                      +{todayTasksList.length - 4} more items...
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <svg className="w-8 h-8 mb-1 text-green-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span className="text-sm font-medium">All done for today!</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. SHOPPING LIST WIDGET */}
          <div 
            onClick={() => { 
              setTargetTodoList(settings?.main_shopping_list_id || 'all'); 
              setActiveTab('Todo');
            }} 
            className="bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col min-h-[140px] max-h-[180px] cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shopping List</span>
              {shoppingItemsList.length > 0 && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">{shoppingItemsList.length}</span>}
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col gap-2">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 font-medium">Loading...</div>
              ) : !settings?.main_shopping_list_id ? ( 
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center">
                  <span className="text-2xl mb-1 opacity-50">🛒</span>
                  <span className="text-xs font-medium">Set main list in Settings</span>
                </div>
              ) : shoppingItemsList.length > 0 ? (
                <>
                  {shoppingItemsList.slice(0, 4).map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm truncate">
                      <span className="text-orange-400 shrink-0 text-xs">•</span>
                      <span className="text-gray-200 truncate">{item.name}</span>
                    </div>
                  ))}
                  {shoppingItemsList.length > 4 && (
                    <div className="text-xs text-gray-500 font-medium mt-1 ml-3">
                      +{shoppingItemsList.length - 4} more items...
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <span className="text-2xl mb-1 opacity-50">🛒</span>
                  <span className="text-sm font-medium">Cart is empty</span>
                </div>
              )}
            </div>
          </div>

          {/* 5. NEXT SUBSCRIPTION WIDGET */}
          <div 
            onClick={() => { if(nextSubscription) setActiveTab('Subscriptions') }}
            className={`bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col min-h-[140px] ${nextSubscription ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Next Payment</span>
              {nextSubscription && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${nextSubscription.daysLeft === 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                  {nextSubscription.daysLeft === 0 ? 'Today' : `In ${nextSubscription.daysLeft} days`}
                </span>
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {isLoading ? (
                <div className="flex items-center justify-center text-gray-400 font-medium h-full">Loading...</div>
              ) : nextSubscription ? (
                <div className="flex justify-between items-center w-full gap-4">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: nextSubscription.subjColor }}></div>
                      <span className="font-bold text-lg text-white truncate">{nextSubscription.name}</span>
                    </div>
                    {nextSubscription.provider && <span className="text-xs text-gray-500 ml-4 truncate">{nextSubscription.provider}</span>}
                  </div>
                  
                  {nextSubscription.cost && (
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-xl font-black text-gray-200">{nextSubscription.cost}</span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{nextSubscription.currency}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center text-gray-500 font-medium h-full">
                  No upcoming payments
                </div>
              )}
            </div>
          </div>

          {/* 6. TODAY'S FOCUS WIDGET */}
          <div className="bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col justify-between min-h-[140px]">
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Today's Focus</span>
            <div className="text-5xl font-bold text-indigo-400 mt-2">
              {isLoading ? "--:--" : formatTime(focusTime)}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#2b2b2b] text-white overflow-hidden relative">
      
      {/* PASEK BOCZNY Z MARGINESEM U GÓRY DLA NOTCHA */}
      <aside className="hidden md:flex flex-col w-72 bg-[#1c1c1e] border-r border-gray-800 px-6 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] overflow-y-auto">
        <div 
          className="flex items-center gap-3 mb-10 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setActiveTab("Dashboard")}
        >
          <img src="/icon.png" alt="Splanner Logo" className="w-10 h-10 rounded-xl shadow-[0_2px_5px_rgba(0,0,0,0.5)]" />
          <h1 className="text-2xl font-bold tracking-tight">Splanner</h1>
        </div>

        <div className="mb-10 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-gray-400 font-semibold">
              <span>Today's progress:</span>
              <span>{todayProgress.done}/{todayProgress.total}</span>
            </div>
            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-1000" 
                style={{ width: `${todayProgress.total > 0 ? (todayProgress.done/todayProgress.total)*100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-gray-400 font-semibold">
              <span>Total Progress:</span>
              <span>{totalProgress.done}/{totalProgress.total}</span>
            </div>
            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${totalProgress.total > 0 ? (totalProgress.done/totalProgress.total)*100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 mt-2">
          <div className="text-xs text-gray-500 font-bold uppercase mb-2">Main Menu</div>
          {[...mainTabs, ...moreTabs].filter(t => t !== "Dashboard").map((item) => (
            <button 
              key={item}
              onClick={() => {
                if (item === "Todo") setTargetTodoList('all');
                setActiveTab(item);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === item ? 'bg-[#3498db] text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
            >
              <span>{item}</span>
              {/* RENDEROWANIE ODZNAKI */}
              {renderMenuBadge(item)}
            </button>
          ))}
        </nav>
      </aside>

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <div className="flex-1 flex flex-col relative">
        
        {activeTab === "Settings" ? (
          <SettingsView onBack={() => setActiveTab("Dashboard")} />
        ) : activeTab === "Schedule" ? (
          <ScheduleView onBack={() => setActiveTab("Dashboard")} />
        ) : activeTab === "Exam Database & Archive" ? (
          <ArchiveView onBack={() => setActiveTab("More")} />
        ) : activeTab === "Plan" ? (
          <PlanView onBack={() => setActiveTab("Dashboard")} />
        ) : activeTab === "Todo" ? (
          <TodoView onBack={() => setActiveTab("Dashboard")} initialListId={targetTodoList} />
        ) : activeTab === "Subjects & Semesters" ? (
          <SubjectsView onBack={() => setActiveTab("More")} />
        ) : activeTab === "Grades" ? (
          <GradesView onBack={() => setActiveTab("More")} />
        ) : activeTab === "Subscriptions" ? (
          <SubscriptionsView onBack={() => setActiveTab("More")} />
        ) : activeTab === "Achievements" ? (
          <AchievementsView onBack={() => setActiveTab("More")} />
        ) : (
          <main className="flex-1 overflow-y-auto px-6 pb-24 md:p-10 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
            
            <header className="flex justify-between items-start mb-10">
              <div>
                <h1 className="text-3xl font-bold">{activeTab}</h1>
                {activeTab === "Dashboard" && <p className="hidden md:block text-gray-400 mt-1">Welcome back! Here is your overview.</p>}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setActiveTab("Settings")} className="p-2.5 text-gray-400 hover:text-white bg-[#1c1c1e] hover:bg-gray-800 rounded-full transition-colors border border-gray-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </button>
                
                <button 
                  onClick={() => supabase.auth.signOut()} 
                  className={`${isStandalone ? 'hidden md:block' : 'block'} p-2.5 text-gray-400 hover:text-red-400 bg-[#1c1c1e] hover:bg-red-500/10 rounded-full transition-colors border border-gray-800`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
              </div>
            </header>

            {activeTab === "Dashboard" && renderDashboardWidgets()}
            
            {activeTab === "More" && (
              <div className="flex flex-col gap-3">
                {moreTabs.map(item => (
                  <button 
                    key={item}
                    onClick={() => setActiveTab(item)}
                    className="bg-[#1c1c1e] p-4 rounded-2xl flex justify-between items-center active:scale-95 transition-transform"
                  >
                    <span className="font-medium text-gray-200">{item}</span>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                ))}
              </div>
            )}

            {activeTab !== "Dashboard" && activeTab !== "More" && activeTab !== "Settings" && activeTab !== "Schedule" && activeTab !== "Exam Database & Archive" && activeTab !== "Plan" && activeTab !== "Subjects & Semesters" && activeTab !== "Grades" && activeTab !== "Subscriptions" && activeTab !== "Achievements" &&(
              <div className="bg-[#1c1c1e] p-10 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
                <span className="text-4xl mb-4">🚧</span>
                <p>Widok <strong>{activeTab}</strong> jest w budowie...</p>
              </div>
            )}

          </main>
        )}

        {/* TOAST DLA WINDOWS */}
        <div 
          className={`fixed bottom-24 md:bottom-10 right-6 z-50 bg-[#1c1c1e] border border-gray-700 rounded-2xl shadow-2xl p-5 w-72 md:w-80 transform transition-all duration-500 ease-in-out ${showWindowsToast ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'}`}
        >
          <button 
            onClick={closeWindowsToast}
            className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <div className="flex items-start gap-4">
            <div className="bg-[#3498db]/20 p-2.5 rounded-xl text-[#3498db] shrink-0 mt-0.5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-1">Splanner for Windows</h4>
              <p className="text-gray-400 text-[11px] leading-relaxed mb-3 pr-2">Install the dedicated desktop app for better performance and more features.</p>
              <a 
                href="https://github.com/oskarkonitz/SPlanner/releases/latest/download/SPlanner_Installer.exe"
                onClick={closeWindowsToast}
                className="inline-flex items-center gap-2 bg-[#3498db] hover:bg-[#2980b9] text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
              >
                <span>Download now</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              </a>
            </div>
          </div>
        </div>

        {/* DOLNY PASEK NAWIGACJI */}
        <nav className="md:hidden absolute bottom-0 w-full bg-[#1c1c1e]/90 backdrop-blur-md border-t border-gray-800">
          <div className="flex justify-around items-center h-20 px-2">
            {[...mainTabs, "More"].map((tab) => {
              const isSelected = activeTab === tab || (tab === "More" && moreTabs.includes(activeTab));
              return (
                <button 
                  key={tab}
                  onClick={() => {
                    if (tab === "Todo") setTargetTodoList('all');
                    setActiveTab(tab);
                  }}
                  className="flex flex-col items-center justify-center w-full h-full gap-1"
                >
                  {getTabIcon(tab, isSelected)}
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-[#3498db]' : 'text-gray-500'}`}>
                    {tab}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}