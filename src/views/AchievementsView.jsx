import { useState } from 'react';
import { useData } from '../context/DataContext';
import { ACHIEVEMENT_GROUPS } from '../data/achievements';

export default function AchievementsView({ onBack }) {
  // Pobieramy wszystkie tablice z bazy potrzebne do kalkulacji z achievements.js
  const { 
    achievements, 
    dailyTasks, 
    topics, 
    exams, 
    subjects, 
    grades, 
    gradeModules, 
    blockedDates, 
    globalStats 
  } = useData();
  
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (baseId) => {
    setExpandedGroups(prev => ({ ...prev, [baseId]: !prev[baseId] }));
  };

  // Formatowanie liczb (np. żeby GPA nie miało miliona miejsc po przecinku)
  const formatValue = (val) => {
    if (Number.isInteger(val)) return val;
    return Number(val).toFixed(2);
  };

  // ------------------------------------------------------------------
  // Wierna replika logiki zliczeniowej z achievements.js
  // ------------------------------------------------------------------
  const getCurrentValue = (baseId) => {
    const getStat = (key) => {
      const s = (globalStats || []).find(x => x.key === key);
      return s ? parseFloat(s.value) : 0;
    };

    switch (baseId) {
      case 'limit_breaker':
        return Math.max(0, ...(grades || []).map(g => g.value));
        
      case 'hours_daily':
        return getStat('daily_study_time') / 3600;
        
      case 'hours_total':
        return getStat('total_study_time') / 3600;
        
      case 'balance':
        return (blockedDates || []).length;
        
      case 'scribe':
        return (topics || []).filter(t => t.note && t.note.trim().length > 0).length + 
               (exams || []).filter(e => e.note && e.note.trim().length > 0).length +
               (dailyTasks || []).filter(t => t.note && t.note.trim().length > 0).length;
               
      case 'encyclopedia':
        return (topics || []).filter(t => t.status === 'done').length;
        
      case 'time_lord':
        return getStat('total_sessions');
        
      case 'session_master': {
        const examCompletion = {};
        (topics || []).forEach(t => {
          if (!examCompletion[t.exam_id]) examCompletion[t.exam_id] = { total: 0, done: 0 };
          examCompletion[t.exam_id].total++;
          if (t.status === 'done') examCompletion[t.exam_id].done++;
        });
        return (exams || []).filter(e => {
          const comp = examCompletion[e.id];
          return comp && comp.total > 0 && comp.total === comp.done;
        }).length;
      }
        
      case 'polyglot':
        return (subjects || []).length;
        
      case 'strategist': {
        let maxAdvanceDays = 0;
        const today = new Date();
        today.setHours(0,0,0,0);
        (exams || []).forEach(e => {
          if (e.date) {
            const eDate = new Date(e.date);
            const diff = Math.ceil((eDate - today) / (1000 * 60 * 60 * 24));
            if (diff > maxAdvanceDays) maxAdvanceDays = diff;
          }
        });
        return maxAdvanceDays;
      }
        
      case 'busy_day': {
        const dailyCounts = {};
        (dailyTasks || []).filter(t => t.status === 'done').forEach(t => {
           if (t.date) dailyCounts[t.date] = (dailyCounts[t.date] || 0) + 1;
        });
        return Object.keys(dailyCounts).length > 0 ? Math.max(...Object.values(dailyCounts)) : 0;
      }
        
      case 'gpa': {
        let totalWeightedScore = 0.0;
        let totalECTS = 0.0;
        const thresholds = [
          { grade: 5.0, minPercent: 90.0 }, { grade: 4.5, minPercent: 80.0 },
          { grade: 4.0, minPercent: 70.0 }, { grade: 3.5, minPercent: 60.0 }, { grade: 3.0, minPercent: 50.0 }
        ];
        (subjects || []).forEach(sub => {
          const modules = (gradeModules || []).filter(m => m.subject_id === sub.id);
          const subGrades = (grades || []).filter(g => g.subject_id === sub.id);
          let subTotalWeighted = 0.0;
          let subTotalGradedWeight = 0.0;
          modules.forEach(mod => {
            const modGrades = subGrades.filter(g => g.module_id === mod.id);
            const modWeightFactor = (mod.weight || 0.0) / 100.0;
            subTotalGradedWeight += modWeightFactor;
            let sumW = 0.0, weightedSum = 0.0;
            modGrades.forEach(g => {
              const w = g.weight || 0.0;
              sumW += w;
              weightedSum += g.value * w;
            });
            if (sumW > 0) subTotalWeighted += (weightedSum / sumW) * modWeightFactor;
          });
          if (subTotalGradedWeight > 0) {
            const percent = subTotalWeighted / subTotalGradedWeight;
            let finalGrade = 2.0;
            for (let t of thresholds) {
              if (percent >= t.minPercent) { finalGrade = t.grade; break; }
            }
            const ects = sub.weight || 0.0;
            if (ects > 0) {
              totalWeightedScore += finalGrade * ects;
              totalECTS += ects;
            }
          }
        });
        return totalECTS === 0 ? 0 : (totalWeightedScore / totalECTS);
      }
        
      default:
        return 0; // Osiągnięcia bez logiki progresywnej (np. pojedyncze eventy boolowskie)
    }
  };

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto flex flex-col h-full bg-[#1c1c1e] text-white">
      {/* HEADER */}
      <header className="flex flex-col px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-800 shrink-0 bg-[#1c1c1e]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-[#3498db]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="text-xl md:text-2xl font-bold">🏆 Achievements</h1>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-8">
        <div className="max-w-3xl mx-auto space-y-4">
          
          {ACHIEVEMENT_GROUPS.map(group => {
            const highestUnlockedIdx = group.items.map(i => achievements.includes(i.id)).lastIndexOf(true);
            const isAnyUnlocked = highestUnlockedIdx >= 0;
            const isExpanded = expandedGroups[group.baseId];

            let displayTitle = group.title;
            if (isAnyUnlocked && group.isGroup) {
              displayTitle = group.items[highestUnlockedIdx].title;
            }

            // Aktualny postęp z naszej nowej funkcji
            const currentValue = getCurrentValue(group.baseId);
            const nextLockedItem = group.items.find(i => !achievements.includes(i.id));
            
            let nextThreshold = nextLockedItem ? nextLockedItem.threshold : null;

            // Flaga, czy gracz odblokował wszystkie osiągnięcia z danej grupy
            const isFullyUnlocked = isAnyUnlocked && !nextLockedItem;
            
            // Decydujemy czy w ogóle pokazywać pasek x/y (ukrywamy dla boolowskich jednorazowych, z wyjątkiem GPA/limit_breaker)
            const showTracker = group.isGroup || group.baseId === 'limit_breaker';

            return (
              <div key={group.baseId} className="bg-[#2b2b2b] rounded-2xl overflow-hidden shadow-sm border border-white/5 transition-all">
                
                {/* Wiersz Grupy (Główna Karta) */}
                <button 
                  onClick={() => group.isGroup ? toggleGroup(group.baseId) : null} 
                  className={`w-full flex items-center p-4 gap-4 text-left transition-colors ${group.isGroup && isAnyUnlocked ? 'active:bg-white/5' : ''} ${!isAnyUnlocked ? 'opacity-60 grayscale' : ''}`}
                >
                  <div className="text-4xl drop-shadow-md">{group.icon}</div>
                  
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className={`font-bold text-lg leading-tight ${isAnyUnlocked ? 'text-white' : 'text-gray-400'}`}>
                      {displayTitle}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {isAnyUnlocked ? (group.isGroup ? "Tap to view details" : group.items[0].desc) : "Locked"}
                    </p>
                  </div>
                  
                  {/* Prawa strona - Wskaźniki postępu i kłódki */}
                  <div className="flex items-center gap-3 pr-2">
                    
                    {/* Wskaźnik "x/y" albo "MAX" */}
                    {isFullyUnlocked ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-500 uppercase tracking-wider">
                        MAX
                      </span>
                    ) : (showTracker && nextThreshold) ? (
                      <span className="text-xs font-bold text-gray-400 bg-gray-800/80 px-2 py-1 rounded-lg">
                        {formatValue(Math.min(currentValue, nextThreshold))} / {formatValue(nextThreshold)}
                      </span>
                    ) : null}

                    {/* Checkmark lub kłódka dla pojedynczego achievementu */}
                    {!group.isGroup && (
                      <div>
                        {isAnyUnlocked ? (
                          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
                        )}
                      </div>
                    )}

                    {/* Strzałka rozwijania w grupach */}
                    {group.isGroup && isAnyUnlocked && (
                      <svg className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    )}
                  </div>
                </button>

                {/* Rozwijana sekcja dla grup wielopoziomowych */}
                {group.isGroup && isExpanded && isAnyUnlocked && (
                  <div className="bg-[#121212] px-4 py-2 border-t border-gray-800">
                    {group.items.map(item => {
                      const itemUnlocked = achievements.includes(item.id);
                      const itemThreshold = item.threshold;

                      return (
                        <div key={item.id} className="flex flex-col py-3 border-b border-gray-800/50 last:border-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-bold text-sm ${itemUnlocked ? 'text-green-500' : 'text-gray-500'}`}>
                              {itemUnlocked ? "✅" : "🔒"} {item.title}
                            </span>
                            {!itemUnlocked && itemThreshold && showTracker && (
                               <span className="text-[10px] font-medium text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded">
                                 {formatValue(Math.min(currentValue, itemThreshold))} / {formatValue(itemThreshold)}
                               </span>
                            )}
                          </div>
                          <span className={`text-xs ml-6 ${itemUnlocked ? 'text-gray-300' : 'text-gray-600'}`}>{item.desc}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                
              </div>
            )
          })}

        </div>
      </main>
    </div>
  );
}