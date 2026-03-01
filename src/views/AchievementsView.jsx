import { useState } from 'react';
import { useData } from '../context/DataContext';
import { ACHIEVEMENT_GROUPS } from '../data/achievements';

export default function AchievementsView({ onBack }) {
  const { achievements } = useData();
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (baseId) => {
    setExpandedGroups(prev => ({ ...prev, [baseId]: !prev[baseId] }));
  };

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto flex flex-col h-full bg-[#2b2b2b] text-white">
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
            // Check if ANY item in group is unlocked
            const highestUnlockedIdx = group.items.map(i => achievements.includes(i.id)).lastIndexOf(true);
            const isAnyUnlocked = highestUnlockedIdx >= 0;
            const isExpanded = expandedGroups[group.baseId];

            // For dynamic group title (Level I, Level II...)
            let displayTitle = group.title;
            if (isAnyUnlocked && group.isGroup) {
              displayTitle = group.items[highestUnlockedIdx].title;
            }

            return (
              <div key={group.baseId} className="bg-[#1c1c1e] rounded-2xl overflow-hidden shadow-sm border border-white/5 transition-all">
                
                {/* Wiersz Grupy (Główna Karta) */}
                <button 
                  onClick={() => group.isGroup ? toggleGroup(group.baseId) : null} 
                  className={`w-full flex items-center p-4 gap-4 text-left transition-colors ${group.isGroup && isAnyUnlocked ? 'active:bg-white/5' : ''} ${!isAnyUnlocked ? 'opacity-60 grayscale' : ''}`}
                >
                  <div className="text-4xl drop-shadow-md">{group.icon}</div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${isAnyUnlocked ? 'text-white' : 'text-gray-400'}`}>
                      {displayTitle}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {isAnyUnlocked ? (group.isGroup ? "Tap to view details" : group.items[0].desc) : "Locked"}
                    </p>
                  </div>
                  
                  {/* Ikony po prawej */}
                  {!group.isGroup && (
                    <div className="pr-2">
                      {isAnyUnlocked ? (
                        <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
                      )}
                    </div>
                  )}
                  {group.isGroup && isAnyUnlocked && (
                    <svg className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  )}
                </button>

                {/* Rozwijana sekcja dla grup wielopoziomowych */}
                {group.isGroup && isExpanded && isAnyUnlocked && (
                  <div className="bg-[#121212] px-4 py-2 border-t border-gray-800">
                    {group.items.map(item => {
                      const itemUnlocked = achievements.includes(item.id);
                      return (
                        <div key={item.id} className="flex flex-col py-3 border-b border-gray-800/50 last:border-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-bold text-sm ${itemUnlocked ? 'text-green-500' : 'text-gray-500'}`}>
                              {itemUnlocked ? "✅" : "🔒"} {item.title}
                            </span>
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