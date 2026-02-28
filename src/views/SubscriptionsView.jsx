import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import SubscriptionFormModal from '../components/SubscriptionFormModal';

// Helper do obliczania NASTĘPNEJ daty płatności na podstawie startu i cyklu
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

// Funkcja pomocnicza: Obliczanie dni do wygaśnięcia
const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  target.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function SubscriptionsView({ onBack }) {
  const { subscriptions, subjects, deleteSubscription } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [subToEdit, setSubToEdit] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // Close context menu on outside click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Grupowanie subskrypcji
  const groupedSubs = useMemo(() => {
    let dueThisWeek = [];
    let upcoming = [];
    let inactive = [];

    const today = new Date();
    today.setHours(0,0,0,0);

    // 1. Filtrowanie (Search)
    const filtered = (subscriptions || []).filter(sub => {
      const q = searchQuery.toLowerCase();
      const matchName = (sub.name || '').toLowerCase().includes(q);
      const matchProvider = (sub.provider || '').toLowerCase().includes(q);
      return matchName || matchProvider;
    });

    // 2. Grupowanie
    filtered.forEach(sub => {
      let isExpired = false;
      if (sub.expiry_date) {
        const exp = new Date(sub.expiry_date);
        exp.setHours(0,0,0,0);
        if (exp < today) isExpired = true;
      }

      if (!sub.is_active || isExpired) {
        inactive.push({ ...sub, isExpired });
        return;
      }

      const nextDate = getNextBillingDate(sub.billing_date, sub.billing_cycle);
      sub.nextDate = nextDate; // Tymczasowe zapisanie wyliczonej daty

      if (nextDate) {
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) dueThisWeek.push(sub);
        else upcoming.push(sub);
      } else {
        // Fallback dla subskrypcji bez sprecyzowanej daty (One-time, lifetime itp.)
        upcoming.push(sub);
      }
    });

    dueThisWeek.sort((a, b) => a.nextDate - b.nextDate);
    upcoming.sort((a, b) => (a.nextDate || 0) - (b.nextDate || 0));

    return { dueThisWeek, upcoming, inactive };
  }, [subscriptions, searchQuery]);

  const handleContextMenu = (e, sub) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 150),
      sub
    });
  };

  const activeSubEnriched = useMemo(() => {
    if (!selectedSub) return null;
    return (subscriptions || []).find(s => s.id === selectedSub.id);
  }, [selectedSub, subscriptions]);

  const subjectMap = useMemo(() => {
    const map = {};
    (subjects || []).forEach(s => map[s.id] = s);
    return map;
  }, [subjects]);

  const renderSection = (title, items, isAlert = false) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-2">{title}</h3>
        <div className="space-y-2">
          {items.map(sub => {
            const subj = sub.subject_id ? subjectMap[sub.subject_id] : null;
            const isSelected = selectedSub?.id === sub.id;
            
            return (
              <div 
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                onContextMenu={(e) => handleContextMenu(e, sub)}
                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-[#3498db]/10 border-[#3498db] shadow-sm' : 'bg-[#1c1c1e] border-gray-800 hover:border-gray-600'} ${isAlert && !isSelected ? 'border-red-500/30' : ''}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-1.5 h-10 rounded-full ${!sub.is_active || sub.isExpired ? 'bg-gray-700' : ''}`} style={{ backgroundColor: (!sub.is_active || sub.isExpired) ? undefined : (subj?.color || '#8e44ad') }}></div>
                  <div className="overflow-hidden">
                    <h4 className={`font-bold truncate ${isSelected ? 'text-[#3498db]' : (!sub.is_active || sub.isExpired ? 'text-gray-500 line-through' : 'text-white')}`}>
                      {sub.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 truncate">
                      {sub.provider && <span>{sub.provider}</span>}
                      {sub.provider && <span>•</span>}
                      <span className="capitalize">{sub.billing_cycle}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4">
                  <div className={`text-lg font-bold ${!sub.is_active || sub.isExpired ? 'text-gray-600' : 'text-gray-200'}`}>
                    {sub.cost} <span className="text-sm font-normal text-gray-500">{sub.currency}</span>
                  </div>
                  {sub.nextDate && sub.is_active && !sub.isExpired && (
                     <div className={`text-xs ${isAlert ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                       Due: {sub.nextDate.toISOString().split('T')[0]}
                     </div>
                  )}
                  {sub.isExpired && <div className="text-xs text-red-500">Expired</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#2b2b2b] text-white">
      
      {/* HEADER & SEARCH */}
      <header className="flex flex-col px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-800 shrink-0 bg-[#1c1c1e] gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="md:hidden p-2 text-[#3498db]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 className="text-xl md:text-2xl font-bold">Subscriptions</h1>
          </div>
          <button onClick={() => { setSubToEdit(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#3498db] text-white rounded-xl text-sm font-bold hover:bg-blue-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
            Add New
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Search by name or provider..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#2b2b2b] text-white border border-gray-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#3498db] transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          )}
        </div>
      </header>

      {/* MASTER-DETAIL LAYOUT */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEWY PANEL (Lista Timeline) */}
        <div className={`w-full md:w-[40%] flex-col border-r border-gray-800 bg-[#121212] overflow-y-auto ${selectedSub ? 'hidden md:flex' : 'flex'} p-4 pb-32`}>
          {subscriptions.length === 0 ? (
            <div className="p-10 text-center text-gray-500 mt-10">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
              <h3 className="text-lg font-bold">No Subscriptions</h3>
              <p className="text-sm mt-2">Track your digital tools, apps, and services.</p>
            </div>
          ) : (
            <>
              {renderSection("Due This Week", groupedSubs.dueThisWeek, true)}
              {renderSection("Upcoming", groupedSubs.upcoming)}
              {renderSection("Inactive / Expired", groupedSubs.inactive)}
            </>
          )}
        </div>

        {/* PRAWY PANEL (Detale) */}
        <div className={`flex-1 flex-col bg-[#1c1c1e] relative ${selectedSub ? 'flex' : 'hidden md:flex'}`}>
          {!activeSubEnriched ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 pointer-events-none p-6 text-center">
              <svg className="w-24 h-24 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              <h2 className="text-xl font-bold">Select a subscription to view details</h2>
            </div>
          ) : (() => {
            const subj = activeSubEnriched.subject_id ? subjectMap[activeSubEnriched.subject_id] : null;
            const daysLeft = getDaysUntil(activeSubEnriched.expiry_date);

            return (
              <div className="flex flex-col h-full">
                {/* Detail Header */}
                <div className="px-6 py-4 md:py-8 border-b border-gray-800 bg-[#2b2b2b] shrink-0">
                  <div className="flex items-center gap-3 mb-4 md:hidden">
                    <button onClick={() => setSelectedSub(null)} className="flex items-center text-[#3498db] font-medium p-1 -ml-1">
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
                      Back
                    </button>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                         <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: subj?.color || '#8e44ad' }}></div>
                         <h2 className="text-3xl font-black text-white">{activeSubEnriched.name}</h2>
                       </div>
                       <div className="text-lg text-gray-400 font-medium ml-5">{activeSubEnriched.provider || 'No Provider'}</div>
                    </div>
                    <div className="text-right">
                       <div className="text-3xl font-black text-white">{activeSubEnriched.cost} <span className="text-sm text-gray-500 font-bold">{activeSubEnriched.currency}</span></div>
                       <div className="text-sm text-[#3498db] font-bold capitalize">{activeSubEnriched.billing_cycle}</div>
                    </div>
                  </div>
                </div>

                {/* Akcje pod nagłówkiem */}
                <div className="p-4 flex gap-2 border-b border-gray-800 bg-[#1c1c1e] shrink-0">
                  <button onClick={() => { setSubToEdit(activeSubEnriched); setShowForm(true); }} className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                     Edit
                  </button>
                  <button onClick={() => { if(window.confirm('Delete this subscription?')) { deleteSubscription(activeSubEnriched.id); setSelectedSub(null); } }} className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl font-bold transition-colors">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                     Delete
                  </button>
                </div>

                {/* Karta Detali */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 space-y-6">
                  
                  {/* Status Box */}
                  <div className="bg-[#2b2b2b] rounded-2xl border border-gray-800 p-4 flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Status</span>
                    {activeSubEnriched.is_active ? (
                      <span className="px-3 py-1 bg-green-500/20 text-green-500 font-bold rounded-lg text-sm">Active</span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-500/20 text-gray-400 font-bold rounded-lg text-sm">Inactive</span>
                    )}
                  </div>

                  {/* Daty */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-[#2b2b2b] rounded-2xl border border-gray-800 p-4">
                       <div className="text-xs text-gray-500 font-bold uppercase mb-1">Billing Start Date</div>
                       <div className="text-white font-medium">{activeSubEnriched.billing_date || 'Not set'}</div>
                     </div>
                     <div className="bg-[#2b2b2b] rounded-2xl border border-gray-800 p-4">
                       <div className="text-xs text-gray-500 font-bold uppercase mb-1">Expiry Date</div>
                       <div className={`font-medium ${daysLeft !== null && daysLeft < 0 ? 'text-red-500' : 'text-white'}`}>
                          {activeSubEnriched.expiry_date || 'Lifetime'}
                       </div>
                       {daysLeft !== null && daysLeft >= 0 && (
                          <div className="text-xs text-orange-400 mt-1">{daysLeft} days left</div>
                       )}
                     </div>
                  </div>

                  {/* Powiązany Przedmiot */}
                  {subj && (
                    <div className="bg-[#2b2b2b] rounded-2xl border border-gray-800 p-4 flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
                          <svg className="w-5 h-5" style={{ color: subj.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                       </div>
                       <div>
                         <div className="text-xs text-gray-500 font-bold uppercase">Linked Subject</div>
                         <div className="font-bold text-white">{subj.name}</div>
                       </div>
                    </div>
                  )}

                  {/* Notatka */}
                  {activeSubEnriched.note && (
                    <div className="bg-[#2b2b2b] rounded-2xl border border-gray-800 p-4">
                       <div className="text-xs text-gray-500 font-bold uppercase mb-2">Note / Account Info</div>
                       <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{activeSubEnriched.note}</p>
                    </div>
                  )}

                </div>
              </div>
            );
          })()}
        </div>
      </main>

      {/* KONTEKSTOWE MENU (Dla Listy Mobile/Desktop) */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#1c1c1e] border border-gray-800 rounded-xl shadow-2xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { setSubToEdit(contextMenu.sub); setShowForm(true); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-gray-800">
            Edit Subscription
          </button>
          <button onClick={() => { if(window.confirm('Delete subscription?')) deleteSubscription(contextMenu.sub.id); setContextMenu(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-white/10 transition-colors">
            Delete
          </button>
        </div>
      )}

      {/* FORMULARZ MODAL */}
      <SubscriptionFormModal 
        isOpen={showForm} 
        initialData={subToEdit} 
        onClose={() => setShowForm(false)} 
      />

    </div>
  );
}