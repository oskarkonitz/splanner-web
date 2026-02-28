import { useState } from 'react'
import { supabase } from '../api/supabase'
import { useData } from '../context/DataContext'

export default function SettingsView({ onBack }) {
  const { session, semesters } = useData()
  
  // Stan do zarządzania okienkami (modalami) na wzór LoginView
  const [activeModal, setActiveModal] = useState(null)
  
  // Przykładowy stan lokalny (w przyszłości podepniesz pod Supabase/AppStorage)
  const [selectedSemester, setSelectedSemester] = useState('ALL')
  const [isFocusGoalEnabled, setIsFocusGoalEnabled] = useState(true)

  // Pomocniczy komponent do renderowania sekcji na wzór iOS Form
  const Section = ({ title, children }) => (
    <div className="mb-6">
      {title && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-4">{title}</h2>}
      <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5">
        {children}
      </div>
    </div>
  )

  // Pomocniczy komponent wiersza w stylu iOS
  const Row = ({ icon, title, value, onClick, isDestructive, hasArrow }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 bg-transparent active:bg-white/5 transition-colors text-left
        ${isDestructive ? 'text-red-500' : 'text-white'}
        border-b border-gray-800 last:border-b-0`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        {value && <span className="text-sm">{value}</span>}
        {hasArrow && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        )}
      </div>
    </button>
  )

  return (
    <div className="flex flex-col h-full bg-[#2b2b2b] text-white">
      
      {/* HEADER (Widoczny głównie na Mobile/PWA) - Zoptymalizowany pod notch */}
      <header className="relative flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:p-6 md:pt-[calc(env(safe-area-inset-top)+1.5rem)] border-b border-gray-800 md:border-none shrink-0">
        <div className="flex-1 flex justify-start">
          <button 
            onClick={onBack} 
            className="flex items-center gap-1 text-[#3498db] text-lg font-medium active:opacity-70 transition-opacity"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
            <span className="md:hidden">Back</span>
          </button>
        </div>
        <h1 className="text-xl md:text-3xl font-bold text-center shrink-0">Settings</h1>
        <div className="flex-1"></div> {/* Spacer dla wyśrodkowania na mobile */}
      </header>

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 max-w-3xl mx-auto w-full">
        
        <Section title="Academic Schedule">
          <Row 
            title="Current Semester" 
            value={selectedSemester === 'ALL' ? 'All Semesters' : semesters?.find(s => s.id === selectedSemester)?.name || 'Unknown'}
            hasArrow
            onClick={() => setActiveModal('semester')}
          />
        </Section>

        <Section title="Preferences">
          {/* Prosty toggle bez strzałki */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <span className="font-medium">Focus Goal Alert</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isFocusGoalEnabled} onChange={(e) => setIsFocusGoalEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
          <Row title="Notifications" hasArrow onClick={() => setActiveModal('notifications')} />
          <Row title="Tasks Shortcuts" hasArrow onClick={() => setActiveModal('shortcuts')} />
        </Section>

        <Section title="Account">
          <div className="flex items-center gap-3 p-4 border-b border-gray-800">
            <svg className="w-10 h-10 text-[#3498db]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"/></svg>
            <div>
              <div className="text-xs text-gray-400">Logged in as:</div>
              <div className="font-medium">{session?.user?.email || "Unknown User"}</div>
            </div>
          </div>
          <Row 
            title="Log Out" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>}
            isDestructive 
            onClick={() => setActiveModal('logout')} 
          />
        </Section>

        <div className="text-center text-gray-600 text-xs mt-8">
          Splanner Web App • v2.2.0
        </div>
      </main>

      {/* --- MODALE (Okienka na wzór LoginView) --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          
          {/* Tło klikalne do zamknięcia */}
          <div className="absolute inset-0" onClick={() => setActiveModal(null)}></div>

          {/* Karta Modala (w stylu LoginView) */}
          <div className="relative bg-[#1c1c1e] p-6 rounded-3xl shadow-2xl border border-white/10 w-full max-w-sm flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal: Zmiana Semestru */}
            {activeModal === 'semester' && (
              <>
                <h3 className="text-xl font-bold text-center">Select Semester</h3>
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2">
                  <button 
                    onClick={() => { setSelectedSemester('ALL'); setActiveModal(null); }}
                    className={`p-3 rounded-xl text-left transition-colors ${selectedSemester === 'ALL' ? 'bg-[#3498db] text-white' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    All Semesters
                  </button>
                  {semesters?.map(sem => (
                    <button 
                      key={sem.id}
                      onClick={() => { setSelectedSemester(sem.id); setActiveModal(null); }}
                      className={`p-3 rounded-xl text-left transition-colors ${selectedSemester === sem.id ? 'bg-[#3498db] text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {sem.name}
                    </button>
                  ))}
                </div>
                <button onClick={() => setActiveModal(null)} className="w-full py-3 text-gray-400 font-medium mt-2">Cancel</button>
              </>
            )}

            {/* Modal: Wylogowanie */}
            {activeModal === 'logout' && (
              <>
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Log Out</h3>
                  <p className="text-gray-400 text-sm">Are you sure you want to log out of your account?</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => supabase.auth.signOut()} 
                    className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl font-bold transition-colors"
                  >
                    Yes, Log Out
                  </button>
                  <button 
                    onClick={() => setActiveModal(null)} 
                    className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Modal: Placeholdery na resztę */}
            {(activeModal === 'notifications' || activeModal === 'shortcuts') && (
              <>
                <h3 className="text-xl font-bold text-center">Work in progress</h3>
                <p className="text-gray-400 text-sm text-center">This feature is being ported from the iOS app.</p>
                <button onClick={() => setActiveModal(null)} className="w-full py-3 bg-[#3498db] text-white rounded-xl font-bold mt-4">Close</button>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  )
}