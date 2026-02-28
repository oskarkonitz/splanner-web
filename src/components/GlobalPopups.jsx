import { useEffect, useState } from 'react';
import { getAchievementData } from '../data/achievements';

export default function GlobalPopups({ popupData, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (popupData) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for transition
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [popupData, onClose]);

  if (!popupData) return null;

  // Codzienne gratulacje
  if (popupData.type === 'congrats') {
    return (
      <div className={`fixed top-10 left-0 right-0 z-[100] flex justify-center pointer-events-none transition-all duration-500 ease-out ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
        <div className="bg-[#2ecc71] text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border-2 border-white/20">
          <span className="text-3xl animate-bounce">🎉</span>
          <div>
            <h3 className="font-black text-lg shadow-black drop-shadow-md">All Tasks Done!</h3>
            <p className="text-sm font-medium opacity-90">Enjoy the rest of your day.</p>
          </div>
        </div>
      </div>
    );
  }

  // Zwykłe Osiągnięcie
  if (popupData.type === 'achievement') {
    const ach = getAchievementData(popupData.id);
    if (!ach) return null;

    return (
      <div className={`fixed bottom-10 left-0 right-0 z-[100] flex justify-center pointer-events-none transition-all duration-500 ease-out ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95'}`}>
        <div className="bg-[#1c1c1e] text-white p-2 pr-6 rounded-full shadow-2xl flex items-center gap-4 border border-white/10">
          <div className="w-14 h-14 bg-[#f1c40f]/20 rounded-full flex items-center justify-center border border-[#f1c40f]/50">
            <span className="text-2xl drop-shadow-lg">{ach.icon}</span>
          </div>
          <div>
            <div className="text-[10px] text-[#f1c40f] font-black uppercase tracking-widest mb-0.5">Achievement Unlocked</div>
            <h3 className="font-bold text-sm">{ach.title}</h3>
          </div>
        </div>
      </div>
    );
  }

  return null;
}