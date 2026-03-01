import { useState, useEffect } from 'react'
import { supabase } from './api/supabase'
import SplashView from './views/SplashView'
import LoginView from './views/LoginView'
import HomeView from './views/HomeView'

import { DataProvider } from './context/DataContext'

function App() {
  const [session, setSession] = useState(null)
  
  // Nowe stany do kontrolowania poprawnego "flow"
  const [isChecking, setIsChecking] = useState(true)
  const [showSplash, setShowSplash] = useState(false)
  
  // Stany dla formularza odzyskiwania hasła
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    // Funkcja pomocnicza sprawdzająca, czy URL to link do resetu hasła
    const checkRecovery = () => window.location.hash.includes('type=recovery')
    
    if (checkRecovery()) {
      setIsRecoveryMode(true)
    }

    // Pierwsze sprawdzenie sesji przy uruchomieniu
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsChecking(false)
      
      // Pokazujemy splash TYLKO jeśli user jest już zalogowany 
      // i NIE JEST w trakcie odzyskiwania hasła.
      if (session && !checkRecovery()) {
        setShowSplash(true)
      }
    })

    // Nasłuchiwacz zmian stanu autoryzacji
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      
      if (event === 'PASSWORD_RECOVERY') {
        // Użytkownik wszedł z linku resetującego hasło
        setIsRecoveryMode(true)
        setShowSplash(false)
      } else if (event === 'SIGNED_IN') {
        // Użytkownik się zalogował (z LoginView).
        // Sprawdzamy, czy to nie jest fałszywy alarm w trakcie recovery.
        if (!checkRecovery() && !isRecoveryMode) {
          setShowSplash(true)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, []) // Pusta tablica zależności, nasłuchujemy tylko raz

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setPasswordMessage({ type: 'info', text: 'Updating password...' })
    
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    
    if (error) {
      setPasswordMessage({ type: 'error', text: error.message })
    } else {
      setPasswordMessage({ type: 'success', text: 'Password updated! Redirecting to the app...' })
      // Po sukcesie: ukrywamy tryb recovery, czyścimy URL i odpalamy Splash
      setTimeout(() => {
        setIsRecoveryMode(false)
        window.location.hash = '' 
        setShowSplash(true) 
      }, 2000)
    }
  }

  // Pusty ekran przez ułamek sekundy, gdy sprawdzamy, kim jest użytkownik (żeby uniknąć mignięcia LoginView)
  if (isChecking) {
    return <div className="bg-[#2b2b2b] min-h-screen"></div> 
  }

  // --- WIDOK RESETOWANIA HASŁA ---
  if (isRecoveryMode) {
    return (
      <div className="bg-[#2b2b2b] min-h-screen text-white flex flex-col items-center justify-center p-6">
        <div className="bg-[#1c1c1e] p-8 rounded-3xl w-full max-w-md shadow-2xl border border-white/10">
          <div className="flex justify-center mb-6">
             {/* Zakładam, że masz icon.png jak w reszcie apki */}
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

  // --- STANDARDOWY WIDOK APLIKACJI (Home / Login / Splash) ---
  return (
    <div className="bg-[#2b2b2b] min-h-screen text-white relative flex flex-col">
      <div className="flex-1 flex flex-col">
        {!session ? (
          <div className="flex-1 flex flex-col justify-center">
            <LoginView />
          </div>
        ) : (
          <DataProvider session={session}>
            <HomeView />
          </DataProvider>
        )}
      </div>

      {showSplash && (
        <div className="absolute inset-0 z-50">
          <SplashView onFinish={() => setShowSplash(false)} />
        </div>
      )}
    </div>
  )
}

export default App