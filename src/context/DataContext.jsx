import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

// 1. Tworzymy kontekst (naszego Managera)
const DataContext = createContext();

// 2. Provider to komponent, który "owinie" naszą aplikację i będzie trzymał dane
export function DataProvider({ children, session }) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Zmienne trzymające stan aplikacji (odpowiednik @Published w Swifcie)
  const [dailyTasks, setDailyTasks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [exams, setExams] = useState([]);
  const [globalStats, setGlobalStats] = useState([]);
  
  // NOWE ZMIENNE DO NOW/NEXT I GPA
  const [subjects, setSubjects] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [eventLists, setEventLists] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [gradeModules, setGradeModules] = useState([]);
  const [grades, setGrades] = useState([]);

  // Pobierz dane automatycznie, gdy pojawi się sesja (użytkownik się zaloguje)
  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Pobieramy wszystkie wymagane tabele naraz (jak Promise.all w Swifcie)
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

      // Zapisujemy do lokalnego stanu
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

      console.log("Pomyślnie zsynchronizowano dane do Dashboardu (Web)!");
    } catch (error) {
      console.error("Błąd pobierania Dashboardu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Udostępniamy dane i funkcję odświeżającą wszystkim widokom wewnątrz
  return (
    <DataContext.Provider value={{ 
      isLoading, 
      dailyTasks, 
      topics, 
      exams, 
      globalStats,
      subjects,
      scheduleEntries,
      cancellations,
      customEvents,
      eventLists,
      semesters,
      gradeModules,
      grades,
      fetchDashboardData 
    }}>
      {children}
    </DataContext.Provider>
  );
}

// 4. Hook pomocniczy - to dzięki niemu widoki będą mogły łatwo wyciągać dane
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    console.error("⚠️ BŁĄD: useData musi być użyte wewnątrz <DataProvider>!");
    return { isLoading: true }; 
  }
  return context;
};