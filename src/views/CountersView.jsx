import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const ICONS = {
  clock: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
  no_smoke: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 14H5m11 0v-2H5v2zm4 0h-2v-2h2v2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9c0-1-1-1.5-1-2.5s1-1.5 1-2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.929 4.929l14.142 14.142" />
    </svg>
  ),
  smoke: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>,
  music: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>,
  heart: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>,
  star: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>,
  calendar: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>,
  award: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
};

const COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#95a5a6'];

export default function CountersView({ onBack }) {
  const { counters, saveCounter, deleteCounter, toggleCounterPin } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState('count_up');
  const [targetDate, setTargetDate] = useState('');
  const [targetTime, setTargetTime] = useState('12:00');
  const [icon, setIcon] = useState('clock');
  const [color, setColor] = useState('#3498db');
  const [isPinned, setIsPinned] = useState(false);

  // Odświeżanie czasu co minutę dla widoku
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const openModal = (counter = null) => {
    if (counter) {
      setEditingCounter(counter);
      setTitle(counter.title);
      setType(counter.type);
      
      // FIX: Konwersja daty na czas lokalny (unikamy problemu ze strefami czasowymi i cofaniem o dzień)
      const dateObj = new Date(counter.target_date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      setTargetDate(`${year}-${month}-${day}`);
      
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      setTargetTime(`${hours}:${minutes}`);
      
      setIcon(counter.icon || 'clock');
      setColor(counter.color || '#3498db');
      setIsPinned(counter.is_pinned);
    } else {
      setEditingCounter(null);
      setTitle('');
      setType('count_up');
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setTargetDate(`${year}-${month}-${day}`);

      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTargetTime(`${hours}:${minutes}`);
      
      setIcon('clock');
      setColor('#3498db');
      setIsPinned(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCounter(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !targetDate || !targetTime) return;

    // Tworzenie pełnego timestampu z uwzględnieniem strefy czasowej
    const isoString = new Date(`${targetDate}T${targetTime}`).toISOString();

    const payload = {
      id: editingCounter?.id,
      title,
      type,
      target_date: isoString,
      is_pinned: isPinned,
      icon,
      color
    };

    if (isPinned && counters.some(c => c.is_pinned && c.id !== editingCounter?.id)) {
      if(!window.confirm("Pinning this counter will unpin your currently pinned counter on the Dashboard. Continue?")) {
        return;
      }
    }

    await saveCounter(payload, !!editingCounter);
    if (isPinned) await toggleCounterPin(editingCounter?.id || payload.id, false);
    
    closeModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this counter?')) {
      await deleteCounter(id);
      closeModal();
    }
  };

  const calculateTimeDiff = (targetStr, type) => {
    const target = new Date(targetStr).getTime();
    const now = currentTime.getTime();
    
    let diffMs = type === 'count_up' ? now - target : target - now;
    let isPast = false;

    if (diffMs < 0) {
      diffMs = Math.abs(diffMs);
      isPast = true;
    }

    const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diffMs / 1000 / 60) % 60);

    return { d, h, m, isPast };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#2b2b2b] text-white overflow-y-auto pt-[calc(env(safe-area-inset-top)+1.5rem)] px-6 pb-24 md:p-10">
      <header className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">My Counters</h1>
            <p className="text-gray-400 text-sm mt-1">Track important dates and milestones.</p>
          </div>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-[#3498db] hover:bg-[#2980b9] text-white p-3 rounded-xl font-bold transition-colors shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
          <span className="hidden md:inline">New Counter</span>
        </button>
      </header>

      {counters.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <div className="w-20 h-20 bg-[#1c1c1e] rounded-full flex items-center justify-center mb-4 border border-white/5">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <p className="font-medium text-lg">No counters yet</p>
          <p className="text-sm mt-1">Create one to track your progress or events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {counters.map(counter => {
            const { d, h, m, isPast } = calculateTimeDiff(counter.target_date, counter.type);
            const isCountUp = counter.type === 'count_up';
            
            return (
              <div 
                key={counter.id}
                onClick={() => openModal(counter)}
                className="bg-[#1c1c1e] rounded-3xl p-6 border border-white/5 shadow-lg relative overflow-hidden cursor-pointer hover:bg-white/5 transition-colors group transform-gpu z-0"
              >
                <div 
                  className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:scale-110 transition-transform pointer-events-none" 
                  style={{ backgroundColor: counter.color }}
                ></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-white"
                      style={{ backgroundColor: counter.color }}
                    >
                      {ICONS[counter.icon] || ICONS['clock']}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white leading-tight">{counter.title}</h3>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        {isCountUp ? 'Time Since' : 'Time Until'}
                      </span>
                    </div>
                  </div>
                  {counter.is_pinned && (
                    <div className="text-[#f1c40f]" title="Pinned to Dashboard">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path></svg>
                    </div>
                  )}
                </div>

                <div className="relative z-10 flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-white">{d}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Days</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-white">{h}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Hours</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-white">{m}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Minutes</span>
                  </div>
                </div>

                {isPast && !isCountUp && (
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <span className="text-xs font-bold text-[#e74c3c] bg-[#e74c3c]/10 px-2 py-1 rounded-md">Event has passed</span>
                  </div>
                )}
                {!isPast && isCountUp && (
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <span className="text-xs font-bold text-gray-400">Since {new Date(counter.target_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dodawania/Edycji */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center p-4">
          <div className="bg-[#1c1c1e] rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-[#1c1c1e] z-10">
              <h2 className="text-xl font-bold">{editingCounter ? 'Edit Counter' : 'New Counter'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Quitting Smoking, Coldplay Concert..."
                  className="w-full bg-[#2b2b2b] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3498db]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Counter Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('count_up')}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-colors ${type === 'count_up' ? 'bg-[#3498db] text-white' : 'bg-[#2b2b2b] text-gray-400 hover:bg-gray-700'}`}
                  >
                    Count Up (Since)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('count_down')}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-colors ${type === 'count_down' ? 'bg-[#3498db] text-white' : 'bg-[#2b2b2b] text-gray-400 hover:bg-gray-700'}`}
                  >
                    Count Down (Until)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Date</label>
                  <input 
                    type="date" 
                    value={targetDate} 
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[#2b2b2b] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3498db]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Time</label>
                  <input 
                    type="time" 
                    value={targetTime} 
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full bg-[#2b2b2b] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3498db]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(ICONS).map(iconKey => (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setIcon(iconKey)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${icon === iconKey ? 'bg-[#3498db] text-white shadow-lg' : 'bg-[#2b2b2b] text-gray-400 hover:text-white'}`}
                    >
                      {ICONS[iconKey]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-[#2b2b2b] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm">Pin to Dashboard</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Show this counter prominently on your Home screen.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ml-4 ${isPinned ? 'bg-[#f1c40f]' : 'bg-gray-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPinned ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800">
                {editingCounter && (
                  <button 
                    type="button"
                    onClick={() => handleDelete(editingCounter.id)}
                    className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold py-3 rounded-xl transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button 
                  type="submit" 
                  className="flex-[2] bg-[#3498db] hover:bg-[#2980b9] text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
                >
                  {editingCounter ? 'Save Changes' : 'Create Counter'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}