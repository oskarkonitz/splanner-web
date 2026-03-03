import { useState, useEffect, useRef } from 'react'
import { supabase } from './api/supabase'
import SplashView from './views/SplashView'
import LoginView from './views/LoginView'
import HomeView from './views/HomeView'

import { DataProvider } from './context/DataContext'

function App() {
  const [session, setSession] = useState(null)
  
  // Ref do śledzenia aktualnej sesji (zapobiega ponownemu splash screenowi przy przełączaniu kart)
  const sessionRef = useRef(null)
  
  // Nowe stany do kontrolowania poprawnego "flow"
  const [isChecking, setIsChecking] = useState(true)
  const [showSplash, setShowSplash] = useState(false)
  
  // Stany dla formularza odzyskiwania hasła
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })

  // --- STANY DLA MAINTENANCE MODE ---
  const [maintenanceActive, setMaintenanceActive] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Funkcja sprawdzająca status systemu i uprawnienia użytkownika
  const checkSystemStatus = async (currentSession) => {
    try {
      // 1. Pobieranie flagi przerwy technicznej z globalnego configu
      const { data: configData } = await supabase.from('app_config').select('value').eq('key', 'maintenance').single()
      const isMaint = configData?.value?.active || false
      setMaintenanceActive(isMaint)

      // 2. Pobieranie statusu admina (tylko jeśli jest zalogowany użytkownik)
      let userIsAdmin = false
      if (currentSession?.user) {
        const { data: adminData } = await supabase.from('admins').select('user_id').eq('user_id', currentSession.user.id)
        userIsAdmin = adminData && adminData.length > 0
      }
      setIsAdmin(userIsAdmin)

    } catch (error) {
      console.error("Błąd sprawdzania statusu systemu:", error)
    }
  }

  useEffect(() => {
    // Funkcja pomocnicza sprawdzająca, czy URL to link do resetu hasła
    const checkRecovery = () => window.location.hash.includes('type=recovery')
    
    if (checkRecovery()) {
      setIsRecoveryMode(true)
    }

    // Pierwsze sprawdzenie sesji przy uruchomieniu aplikacji
    const initApp = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      sessionRef.current = session 
      
      // Dodajemy sprawdzenie statusu aplikacji
      await checkSystemStatus(session)

      setIsChecking(false)
      
      // Pokazujemy splash TYLKO jeśli user jest już zalogowany 
      // i NIE JEST w trakcie odzyskiwania hasła.
      if (session && !checkRecovery()) {
        setShowSplash(true)
      }
    }
    
    initApp()

    // Nasłuchiwacz zmian stanu autoryzacji
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      const wasLoggedOut = !sessionRef.current;
      
      setSession(newSession)
      sessionRef.current = newSession 
      
      // Aktualizujemy status aplikacji przy każdej zmianie logowania
      await checkSystemStatus(newSession)
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
        setShowSplash(false)
      } else if (event === 'SIGNED_IN') {
        if (wasLoggedOut && !checkRecovery() && !isRecoveryMode) {
          setShowSplash(true)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, []) 

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setPasswordMessage({ type: 'info', text: 'Updating password...' })
    
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    
    if (error) {
      setPasswordMessage({ type: 'error', text: error.message })
    } else {
      setPasswordMessage({ type: 'success', text: 'Password updated! Redirecting to the app...' })
      setTimeout(() => {
        setIsRecoveryMode(false)
        window.location.hash = '' 
        setShowSplash(true) 
      }, 2000)
    }
  }

  // Pusty ekran przez ułamek sekundy, gdy sprawdzamy status
  if (isChecking) {
    return <div className="bg-[#2b2b2b] min-h-screen"></div> 
  }

  // --- WIDOK RESETOWANIA HASŁA ---
  if (isRecoveryMode) {
    return (
      <div className="bg-[#2b2b2b] min-h-screen text-white flex flex-col items-center justify-center p-6">
        <div className="bg-[#1c1c1e] p-8 rounded-3xl w-full max-w-md shadow-2xl border border-white/10">
          <div className="flex justify-center mb-6">
             <img src="/icon.png" alt="Splanner Logo" className="w-16 h-16 rounded-2xl shadow-lg" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-center">Reset Password</h2>
          <p className="text-gray-400 text-sm mb-6 text-center">Enter your new password below to regain access.</p>
          
          <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1 block">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#2b2b2b] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3498db] transition-colors"
                placeholder="••••••••"
              />
            </div>
            
            {passwordMessage.text && (
              <div className={`p-3 rounded-xl text-sm font-medium text-center ${passwordMessage.type === 'error' ? 'bg-red-500/10 text-red-500' : passwordMessage.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-[#3498db]'}`}>
                {passwordMessage.text}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white font-bold py-3 rounded-xl transition-colors mt-2 shadow-lg shadow-[#3498db]/20"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Obliczenie, czy użytkownik jest zablokowany przez maintenance
  const isMaintenanceBlocked = maintenanceActive && !isAdmin;

  // --- STANDARDOWY WIDOK APLIKACJI (Home / Login / Splash / Maintenance) ---
  return (
    <div className="bg-[#2b2b2b] min-h-screen text-white relative flex flex-col">
      <div className="flex-1 flex flex-col relative">
        {!session ? (
          <div className="flex-1 flex flex-col justify-center relative">
            {/* Ostrzeżenie na ekranie logowania, widoczne podczas przerwy technicznej */}
            {maintenanceActive && (
              <div className="absolute top-0 w-full bg-yellow-500 text-black text-center py-2 text-sm font-bold z-10 shadow-md">
                🚧 System is currently under maintenance. Only administrators can log in.
              </div>
            )}
            <LoginView />
          </div>
        ) : isMaintenanceBlocked ? (
          // --- EKRAN PRZERWY TECHNICZNEJ DLA ZALOGOWANYCH ---
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-[#1c1c1e] p-10 rounded-3xl w-full max-w-md shadow-2xl border border-white/10 flex flex-col items-center">
              <span className="text-6xl mb-6 drop-shadow-lg">🚧</span>
              <h2 className="text-2xl font-bold mb-2">Under Maintenance</h2>
              <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                We are currently updating SPlanner to bring you new features and improvements. Please check back later!
              </p>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-6 py-2.5 bg-white/5 border border-gray-700 hover:bg-white/10 text-white rounded-xl transition-colors font-medium text-sm w-full"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <DataProvider session={session}>
            <HomeView />
          </DataProvider>
        )}
      </div>

      {/* Splash Screen - nie pokazujemy go, jeśli użytkownik dostał blokadę Maintenance */}
      {showSplash && !isMaintenanceBlocked && (
        <div className="absolute inset-0 z-50">
          <SplashView onFinish={() => setShowSplash(false)} />
        </div>
      )}
    </div>
  )
}

export default App