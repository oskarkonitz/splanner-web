import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useData } from '../context/DataContext'
import SettingsView from './SettingsView'
import ScheduleView from './ScheduleView'
import ArchiveView from './ArchiveView'
import PlanView from './PlanView'
import TodoView from './TodoView'
import SubjectsView from './SubjectsView'
import GradesView from './GradesView'

export default function HomeView() {
  const [activeTab, setActiveTab] = useState("Dashboard")

  const [currentTime, setCurrentTime] = useState(new Date())

  const { 
    isLoading, dailyTasks, topics, exams, globalStats,
    subjects, scheduleEntries, cancellations, customEvents, 
    eventLists, semesters, gradeModules, grades 
  } = useData()

  const [todayProgress, setTodayProgress] = useState({ done: 0, total: 0 })
  const [totalProgress, setTotalProgress] = useState({ done: 0, total: 0 })
  const [nextExam, setNextExam] = useState(null)
  const [nowNextItem, setNowNextItem] = useState(null)
  const [focusTime, setFocusTime] = useState(0)
  const [gpa, setGpa] = useState(0.0)

  const mainTabs = ["Dashboard", "Plan", "Todo", "Schedule"];
  const moreTabs = ["Exam Database & Archive", "Achievements", "Subjects & Semesters", "Grades", "Subscriptions"];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (isLoading || !dailyTasks) return;

    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().substring(0, 5);

    const timeStat = globalStats?.find(s => s.key === 'daily_study_time');
    if (timeStat) {
      const safeStringValue = String(timeStat.value).replace(/"/g, '');
      setFocusTime(parseInt(safeStringValue) || 0);
    }

    const todayTasks = dailyTasks?.filter(t => t.date === todayStr) || [];
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

    const upcomingExams = (exams || [])
      .filter(e => e.date >= todayStr)
      .sort((a, b) => {
        if (a.date === b.date) return (a.time || "00:00").localeCompare(b.time || "00:00");
        return a.date.localeCompare(b.date);
      });
    setNextExam(upcomingExams.length > 0 ? upcomingExams[0] : null);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {nowNextItem ? (
            <div className="relative bg-[#1c1c1e] rounded-3xl shadow-lg border border-white/5 flex flex-col min-h-[140px]">
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
                  <span className="text-gray-500 text-sm mt-1">
                    {nowNextItem.typeStr} {nowNextItem.subtitle ? `• ${nowNextItem.subtitle}` : ""}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col gap-4 min-h-[140px]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Now / Next</span>
              <div className="flex-1 flex items-center justify-center text-green-400 font-semibold text-lg">
                {isLoading ? "Loading..." : "No events ahead"}
              </div>
            </div>
          )}

          <div className="bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col gap-4 min-h-[140px]">
            <div className="flex items-center gap-2 text-orange-400">
              <span className="text-sm font-bold uppercase tracking-wider">Next Exam</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-400 font-medium text-center">
              {isLoading ? "Loading..." : (
                nextExam ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-white text-lg font-bold">{nextExam.title}</span>
                    <span className="text-orange-400 text-sm">{nextExam.date} o {nextExam.time?.substring(0, 5) || "TBA"}</span>
                  </div>
                ) : "No upcoming exams"
              )}
            </div>
          </div>

          <div className="bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col justify-between min-h-[140px]">
            <span className="text-sm font-semibold text-gray-400">Today's Focus</span>
            <div className="text-5xl font-bold text-indigo-400 mt-2">
              {isLoading ? "--:--" : formatTime(focusTime)}
            </div>
          </div>

          <div className="bg-[#1c1c1e] p-6 rounded-3xl shadow-lg border border-white/5 flex flex-col justify-between min-h-[140px]">
            <span className="text-sm font-semibold text-gray-400">Current Semester GPA</span>
            <div className="text-5xl font-bold text-blue-400 mt-2">
              {isLoading ? "-.--" : gpa.toFixed(2)}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#2b2b2b] text-white overflow-hidden">
      
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
              onClick={() => setActiveTab(item)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === item ? 'bg-[#3498db] text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
            >
              {item}
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
          <ArchiveView onBack={() => setActiveTab("Dashboard")} />
        ) : activeTab === "Plan" ? (
          <PlanView onBack={() => setActiveTab("Dashboard")} />
        ) : activeTab === "Todo" ? (
          <TodoView onBack={() => setActiveTab("Dashboard")} />
        ) : activeTab === "Subjects & Semesters" ? (
          <SubjectsView onBack={() => setActiveTab("Dashboard")} />
        ) : activeTab === "Grades" ? (
          <GradesView onBack={() => setActiveTab("Dashboard")} />
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
                <button onClick={() => supabase.auth.signOut()} className="p-2.5 text-gray-400 hover:text-red-400 bg-[#1c1c1e] hover:bg-red-500/10 rounded-full transition-colors border border-gray-800">
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

            {activeTab !== "Dashboard" && activeTab !== "More" && activeTab !== "Settings" && activeTab !== "Schedule" && activeTab !== "Exam Database & Archive" && activeTab !== "Plan" && activeTab !== "Subjects & Semesters" && activeTab !== "Grades" &&(
              <div className="bg-[#1c1c1e] p-10 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
                <span className="text-4xl mb-4">🚧</span>
                <p>Widok <strong>{activeTab}</strong> jest w budowie...</p>
              </div>
            )}

          </main>
        )}

        {/* DOLNY PASEK NAWIGACJI - Z PADDINGIEM BOTTOM */}
        <nav className="md:hidden absolute bottom-0 w-full bg-[#1c1c1e]/90 backdrop-blur-md border-t border-gray-800 pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-20 px-2">
            {[...mainTabs, "More"].map((tab) => {
              const isSelected = activeTab === tab || (tab === "More" && moreTabs.includes(activeTab));
              return (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
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